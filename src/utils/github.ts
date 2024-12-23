import * as core from '@actions/core'
import * as diff from './diff'
import * as github from '@actions/github'
import {
  CoverageFile,
  LineRange,
  coalesceLineNumbers,
  intersectLineRanges
} from './general'
import {Octokit} from 'octokit'

export class GithubUtil {
  private client: Octokit

  constructor(token: string) {
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing')
    }
    this.client = new Octokit({auth: token})
  }

  getPullRequestRef(): string {
    const pullRequest = github.context.payload.pull_request
    return pullRequest
      ? pullRequest.head.ref
      : github.context.ref.replace('refs/heads/', '')
  }

  async getPullRequestDiff(): Promise<PullRequestFiles> {
    const pull_number = github.context.issue.number
    const response = await this.client.rest.pulls.get({
      ...github.context.repo,
      pull_number,
      mediaType: {
        format: 'diff'
      }
    })
    // @ts-expect-error With mediaType param, response.data is actually a string, but the response type doesn't reflect this
    const fileLines = diff.parseGitDiff(response.data)
    const prFiles: PullRequestFiles = {}
    for (const item of fileLines) {
      prFiles[item.filename] = coalesceLineNumbers(item.addedLines)
    }

    return prFiles
  }

  /**
   * https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions#setting-a-warning-message
   */
  annotate(annotations: Annotations[]): void {
    for (const ann of annotations) {
      console.log(
        `::${ann.annotation_level} file=${ann.path},line=${ann.start_line},endLine=${ann.end_line}::${ann.message}`
      )
    }
  }

  buildAnnotations(
    coverageFiles: CoverageFile[],
    pullRequestFiles: PullRequestFiles
  ): Annotations[] {
    const annotations: Annotations[] = []
    for (const current of coverageFiles) {
      // Only annotate relevant files
      const prFileRanges = pullRequestFiles[current.fileName]
      if (prFileRanges) {
        const coverageRanges = coalesceLineNumbers(current.missingLineNumbers)
        const uncoveredRanges = intersectLineRanges(
          coverageRanges,
          prFileRanges
        )

        // Only annotate relevant line ranges
        for (const uRange of uncoveredRanges) {
          const message =
            uRange.end_line > uRange.start_line
              ? 'These lines are not covered by a test'
              : 'This line is not covered by a test'
          annotations.push({
            path: current.fileName,
            start_line: uRange.start_line,
            end_line: uRange.end_line,
            annotation_level: 'warning',
            message
          })
        }
      }
    }
    core.info(`Annotation count: ${annotations.length}`)
    return annotations
  }
}

type Annotations = {
  path: string
  start_line: number
  end_line: number
  start_column?: number
  end_column?: number
  annotation_level: string
  message: string
}

type PullRequestFiles = {
  [key: string]: LineRange[]
}
