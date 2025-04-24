import {env} from 'node:process'
import * as core from '@actions/core'
import * as github from '@actions/github'
import {correctLineTotals, filterCoverageByFile} from './utils/general.js'
import {parseLCov} from './utils/lcov.js'
import {parseClover} from './utils/clover.js'
import {parseGoCoverage} from './utils/gocoverage.js'
import {GithubUtil} from './utils/github.js'

const SUPPORTED_FORMATS = ['lcov', 'clover', 'go']

/** Starting Point of the Github Action*/
export async function play(): Promise<void> {
  try {
    if (github.context.eventName !== 'pull_request') {
      core.info('Pull request not detected. Exiting early.')
      return
    }
    core.info('Performing Code Coverage Analysis')
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN', {required: true})
    const GITHUB_BASE_URL = core.getInput('GITHUB_BASE_URL')
    const COVERAGE_FILE_PATH = core.getInput('COVERAGE_FILE_PATH', {
      required: true
    })

    let COVERAGE_FORMAT = core.getInput('COVERAGE_FORMAT')
    if (!COVERAGE_FORMAT) {
      COVERAGE_FORMAT = 'lcov'
    }
    if (!SUPPORTED_FORMATS.includes(COVERAGE_FORMAT)) {
      throw new Error(
        `COVERAGE_FORMAT must be one of ${SUPPORTED_FORMATS.join(',')}`
      )
    }

    const debugOpts = {}
    const DEBUG = core.getInput('DEBUG')
    if (DEBUG) {
      const debugParts = DEBUG.split(',')
      for (const part of debugParts) {
        debugOpts[part] = true
      }
    }

    // TODO perhaps make base path configurable in case coverage artifacts are
    // not produced on the Github worker?
    const workspacePath = env.GITHUB_WORKSPACE || ''
    core.info(`Workspace: ${workspacePath}`)

    // 1. Parse coverage file
    if (COVERAGE_FORMAT === 'clover') {
      var parsedCov = await parseClover(COVERAGE_FILE_PATH, workspacePath)
    } else if (COVERAGE_FORMAT === 'go') {
      // Assuming that go.mod is available in working directory
      var parsedCov = await parseGoCoverage(COVERAGE_FILE_PATH, 'go.mod')
    } else {
      // lcov default
      var parsedCov = await parseLCov(COVERAGE_FILE_PATH, workspacePath)
    }
    // Correct line totals
    parsedCov = correctLineTotals(parsedCov)

    // Sum up lines.found for each entry in parsedCov
    const totalLines = parsedCov.reduce(
      (acc, entry) => acc + entry.lines.found,
      0
    )
    const coveredLines = parsedCov.reduce(
      (acc, entry) => acc + entry.lines.hit,
      0
    )
    core.info(
      `Parsing done. ${parsedCov.length} files parsed. Total lines: ${totalLines}. Covered lines: ${coveredLines}.`
    )

    // 2. Filter Coverage By File Name
    const coverageByFile = filterCoverageByFile(parsedCov)
    core.info('Filter done')
    if (debugOpts['coverage']) {
      core.info(`Coverage:`)
      for (const item of coverageByFile) {
        core.info(JSON.stringify(item))
      }
    }
    const githubUtil = new GithubUtil(GITHUB_TOKEN, GITHUB_BASE_URL)

    // 3. Get current pull request files
    const pullRequestFiles = await githubUtil.getPullRequestDiff()
    if (debugOpts['pr_lines_added']) {
      core.info(`PR lines added: ${JSON.stringify(pullRequestFiles)}`)
    }
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
