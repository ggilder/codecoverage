import * as core from '@actions/core'
import * as github from '@actions/github'
import {filterCoverageByFile} from './utils/general'
import {parseLCov} from './utils/lcov'
import {parseClover} from './utils/clover'
import {GithubUtil} from './utils/github'

/** Starting Point of the Github Action*/
export async function play(): Promise<void> {
  try {
    if (github.context.eventName !== 'pull_request') {
      core.info('Pull request not detected. Exiting early.')
      return
    }
    core.info('Performing Code Coverage Analysis')
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN', { required: true })
    const COVERAGE_FILE_PATH = core.getInput('COVERAGE_FILE_PATH', { required: true })

    let COVERAGE_FORMAT = core.getInput('COVERAGE_FORMAT')
    if (!COVERAGE_FORMAT) {
      COVERAGE_FORMAT = 'lcov'
    }
    if (!['lcov', 'clover'].includes(COVERAGE_FORMAT)) {
      throw new Error("COVERAGE_FORMAT must be one of lcov, clover")
    }

    // 1. Parse coverage file
    if (COVERAGE_FORMAT == "lcov") {
      var parsedCov = await parseLCov(COVERAGE_FILE_PATH)
    } else {
      var parsedCov = await parseClover(COVERAGE_FILE_PATH)
    }
    core.info('Parsing done')
    // 2. Filter Coverage By File Name
    const coverageByFile = filterCoverageByFile(parsedCov)
    core.info('Filter done')
    const githubUtil = new GithubUtil(GITHUB_TOKEN)
    // 3. Get current pull request files
    const pullRequestFiles = await githubUtil.getPullRequestFiles()
    const annotations = githubUtil.buildAnnotations(
      coverageByFile,
      pullRequestFiles
    )
    // 4. Annotate in github
    await githubUtil.annotate({
      referenceCommitHash: githubUtil.getPullRequestRef(),
      annotations
    })
    core.info('Annotation done')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    core.info(JSON.stringify(error))
  }
}