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
    if (input.annotations.length == 0) {
      return 0;
    }
    // github API lets you post 50 annotations at a time
    const chunkSize = 50;
    let chunks: Annotations[][] = [];
    for (let i = 0; i < input.annotations.length; i += chunkSize) {
      chunks.push(input.annotations.slice(i, i + chunkSize));
    }
    let lastResponseStatus = 0;
    let checkId;
    for (let i = 0; i < chunks.length; i++) {
      let status = 'in_progress';
      let conclusion = '';
      if (i == chunks.length - 1) {
        status = 'completed';
        conclusion = 'success';
      }
      let response;
      if (i == 0) {
        response = await this.client.rest.checks.create({
          ...github.context.repo,
          name: 'Annotate',
          head_sha: input.referenceCommitHash,
          status,
          ...(conclusion && {conclusion}),
          output: {
            title: 'Coverage Tool',
            summary: 'Missing Coverage',
            annotations: chunks[i]
          }
        })
        checkId = response.data.id;
      } else {
        response = await this.client.rest.checks.update({
          ...github.context.repo,
          name: 'Annotate',
          head_sha: input.referenceCommitHash,
          check_run_id: checkId,
          status,
          ...(conclusion && {conclusion}),
          output: {
            title: 'Coverage Tool',
            summary: 'Missing Coverage',
            annotations: chunks[i]
          }
        })
      }
      core.info(response.data.output.annotations_url);
      lastResponseStatus = response.status;
    }
    return lastResponseStatus;
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
        // TODO: coalesce runs of lines into single annotations
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
