import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from 'octokit'
import {CoverageFile} from './general'
import * as path from 'path'

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

  async getPullRequestDiff() {
    const pull_number = github.context.issue.number;
    const response = await this.client.rest.pulls.get({
      ...github.context.repo,
      pull_number,
      mediaType: {
        format: "diff",
      },
    });
    core.info(`PR diff: ${response.data}`);
  }

  /**
   * https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests-files
   **/
  async getPullRequestFiles(): Promise<PullRequestFiles> {
    const pull_number = github.context.issue.number
    // TODO probably need to handle paginated responses
    const response = await this.client.rest.pulls.listFiles({
      ...github.context.repo,
      pull_number
    })
    core.info(`Pull Request Files Length: ${response.data.length}`)

    return this.parsePullRequestFiles(response.data);
  }

  /**
   * https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#create-a-check-run
   * https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#update-a-check-run
   */
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
      const params = {
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
      };
      let response;
      if (i == 0) {
        response = await this.client.rest.checks.create({
          ...params
        });
        checkId = response.data.id;
      } else {
        response = await this.client.rest.checks.update({
          ...params,
          check_run_id: checkId,
        });
      }
      core.info(response.data.output.annotations_url);
      lastResponseStatus = response.status;
    }
    return lastResponseStatus;
  }

  buildAnnotations(
    coverageFiles: CoverageFile[],
    pullRequestFiles: PullRequestFiles,
    workspacePath: string
  ): Annotations[] {
    const annotations: Annotations[] = []
    for (const current of coverageFiles) {
      const relPath = path.relative(workspacePath, current.fileName)
      // Only annotate relevant files
      const prFileRanges = pullRequestFiles[relPath];
      if (prFileRanges) {
        const coverageRanges = this.coalesceLineNumbers(current.missingLineNumbers);
        const uncoveredRanges = this.intersectRanges(coverageRanges, prFileRanges);

        // Only annotate relevant line ranges
        for (const uRange of uncoveredRanges) {
          const message = uRange.end_line > uRange.start_line ? "These lines are not covered by a test" : "This line is not covered by a test";
          annotations.push({
            path: relPath,
            start_line: uRange.start_line,
            end_line: uRange.end_line,
            annotation_level: 'warning',
            message,
          })
        }
      }
    }
    core.info(`Annotation count: ${annotations.length}`)
    return annotations
  }

  parsePullRequestFiles(data): PullRequestFiles {
    const files: PullRequestFiles = {};
    for (const item of data) {
      files[item.filename] = this.parsePatchRanges(item.patch);
    }
    core.info(`Filename count: ${files.length}`);
    return files;
  }

  parsePatchRanges(patch: string): LineRange[] {
    let ranges: LineRange[] = [];
    const pattern = /@@ \-\d+,\d+ \+(\d+),(\d+) /g;

    let match;
    while (match = pattern.exec(patch)) {
      const start_line = parseInt(match[1], 10);
      const end_line = parseInt(match[2], 10) + start_line;
      const range: LineRange = { start_line, end_line };
      ranges.push(range);
    }

    return ranges;
  }

  coalesceLineNumbers(lines: number[]): LineRange[] {
    const ranges: LineRange[] = [];
    let rstart, rend;
    for (let i = 0; i < lines.length; i++) {
      rstart = lines[i];
      rend = rstart;
      while (lines[i + 1] - lines[i] === 1) {
        rend = lines[i + 1];
        i++;
      }
      ranges.push({ start_line: rstart, end_line: rend });
    }
    return ranges;
  }

  intersectRanges(rangesA, rangesB: LineRange[]): LineRange[] {
    const outRanges: LineRange[] = [];
    for (const bRange of rangesB) {
      const aRangeIntersects = rangesA.filter(aRange => {
        return (bRange.start_line >= aRange.start_line && bRange.start_line <= aRange.end_line) ||
          (bRange.end_line >= aRange.start_line && bRange.end_line <= aRange.end_line) ||
          (aRange.start_line >= bRange.start_line && aRange.start_line <= bRange.end_line) ||
          (aRange.end_line >= bRange.start_line && aRange.end_line <= bRange.end_line)
      });
      for (const aRange of aRangeIntersects) {
        outRanges.push({
          start_line: Math.max(aRange.start_line, bRange.start_line),
          end_line: Math.min(aRange.end_line, bRange.end_line),
        });
      }
    }
    return outRanges;
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
  start_column?: number
  end_column?: number
  annotation_level: string
  message: string
}

type LineRange = {
  start_line: number
  end_line: number
}

type PullRequestFiles = {
  [key: string]: LineRange[]
}
