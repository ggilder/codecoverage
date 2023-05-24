import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from 'octokit'
import {getFileNameFirstItemFromPath,CoverageFile} from './general'

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
  /**
   * https://docs.github.com/en/rest/reference/pulls#list-pull-requests-files
   * Todo update types
   *  */
  async getPullRequestFiles(): Promise<Set<string>> {
    const pull_number = github.context.issue.number
    const response = await this.client.rest.pulls.listFiles({
      ...github.context.repo,
      pull_number
    })
    core.info(`Pull Request Files Length: ${response.data.length}`)
    const mySet = new Set<string>()
    for (const item of response.data) {
      const fileNameFirstItem = getFileNameFirstItemFromPath(item?.filename)
      if (fileNameFirstItem) mySet.add(fileNameFirstItem)
    }
    core.info(`Filename as a set ${mySet.size}`)
    return mySet
  }
  async annotate(input: InputAnnotateParams): Promise<number> {
    // Todo: make this generic
    const response = await this.client.rest.checks.create({
      ...github.context.repo,
      name: 'Annotate',
      head_sha: input.referenceCommitHash,
      status: 'completed',
      conclusion: 'success',
      output: {
        title: 'Coverage Tool',
        summary: 'Missing Coverage',
        annotations: input.annotations
      }
    })
    core.info(response.data.output.annotations_url)
    return response.status
  }

  buildAnnotations(
    coverageFiles: CoverageFile[],
    pullRequestFiles: Set<string>
  ): Annotations[] {
    const annotations: Annotations[] = []
    for (const current of coverageFiles) {
      // Only annotate relevant files
      const fileNameFirstItem = getFileNameFirstItemFromPath(current?.fileName)
      if (fileNameFirstItem && pullRequestFiles.has(fileNameFirstItem)) {
        current.missingLineNumbers.map(lineNumber => {
          annotations.push({
            path: current.fileName,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: 1,
            end_column: 1,
            annotation_level: 'warning',
            message: 'this line is not covered by test'
          })
        })
      }
    }
    core.info(`Annotation count: ${annotations.length}`)
    return annotations
  }
}

type InputAnnotateParams = {
  referenceCommitHash: string
  annotations: Annotations[]
}
type Annotations = {
  path: string
  start_line: number
  end_line: number
  start_column: number
  end_column: number
  annotation_level: string
  message: string
}
