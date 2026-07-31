import {test, expect, vi, beforeAll} from 'vitest'
import {GithubUtil} from '../../src/utils/github'

beforeAll(function () {
  // github.context.repo reads this
  process.env.GITHUB_REPOSITORY = 'test-owner/test-repo'
})

function stubClient(githubUtil: GithubUtil) {
  const response = {
    status: 200,
    data: {id: 42, output: {annotations_url: 'https://example.com/annotations'}}
  }
  const create = vi.fn().mockResolvedValue(response)
  const update = vi.fn().mockResolvedValue(response)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(githubUtil as any).client = {rest: {checks: {create, update}}}
  return {create, update}
}

function fakeAnnotations(count: number) {
  return Array.from({length: count}, (_, i) => ({
    path: 'file1.txt',
    start_line: i + 1,
    end_line: i + 1,
    annotation_level: 'warning' as const,
    message: 'This line is not covered by a test'
  }))
}

test('github init successfully', async function () {
  const githubUtil = new GithubUtil('1234', 'https://api.github.com')
  expect(githubUtil).toBeInstanceOf(GithubUtil)
})

test('github init to throw error', function () {
  expect(() => new GithubUtil('', 'https://api.github.com')).toThrowError(
    'GITHUB_TOKEN is missing'
  )
})

test('build annotations', function () {
  const githubUtil = new GithubUtil('1234', 'https://api.github.com')

  const prFiles = {
    'file1.txt': [
      {end_line: 139, start_line: 132},
      {end_line: 1007, start_line: 1000}
    ],
    'test/dir/file1.txt': [{end_line: 45, start_line: 22}]
  }

  const coverageFiles = [
    {fileName: 'unchanged.txt', missingLineNumbers: [1, 2, 3]},
    {
      fileName: 'file1.txt',
      missingLineNumbers: [1, 2, 3, 132, 134, 135, 136, 1007, 1008]
    },
    {
      fileName: 'test/dir/file1.txt',
      missingLineNumbers: [20, 21, 22]
    }
  ]

  const annotations = githubUtil.buildAnnotations(coverageFiles, prFiles)

  expect(annotations).toEqual([
    {
      path: 'file1.txt',
      start_line: 132,
      end_line: 132,
      annotation_level: 'warning',
      message: 'This line is not covered by a test'
    },
    {
      path: 'file1.txt',
      start_line: 134,
      end_line: 136,
      annotation_level: 'warning',
      message: 'These lines are not covered by a test'
    },
    {
      path: 'file1.txt',
      start_line: 1007,
      end_line: 1007,
      annotation_level: 'warning',
      message: 'This line is not covered by a test'
    },
    {
      path: 'test/dir/file1.txt',
      start_line: 22,
      end_line: 22,
      annotation_level: 'warning',
      message: 'This line is not covered by a test'
    }
  ])
})

test('annotate defaults to a success conclusion', async function () {
  const githubUtil = new GithubUtil('1234', 'https://api.github.com')
  const {create, update} = stubClient(githubUtil)

  await githubUtil.annotate({
    referenceCommitHash: 'abc123',
    annotations: fakeAnnotations(1)
  })

  expect(create).toHaveBeenCalledTimes(1)
  expect(update).not.toHaveBeenCalled()
  expect(create.mock.calls[0][0]).toMatchObject({
    status: 'completed',
    conclusion: 'success'
  })
})

test('annotate forwards a failure conclusion', async function () {
  const githubUtil = new GithubUtil('1234', 'https://api.github.com')
  const {create} = stubClient(githubUtil)

  await githubUtil.annotate({
    referenceCommitHash: 'abc123',
    annotations: fakeAnnotations(1),
    conclusion: 'failure'
  })

  expect(create.mock.calls[0][0]).toMatchObject({
    status: 'completed',
    conclusion: 'failure'
  })
})

test('annotate only concludes on the final chunk', async function () {
  const githubUtil = new GithubUtil('1234', 'https://api.github.com')
  const {create, update} = stubClient(githubUtil)

  await githubUtil.annotate({
    referenceCommitHash: 'abc123',
    annotations: fakeAnnotations(120),
    conclusion: 'failure'
  })

  expect(create).toHaveBeenCalledTimes(1)
  expect(update).toHaveBeenCalledTimes(2)
  expect(create.mock.calls[0][0]).toMatchObject({status: 'in_progress'})
  expect(create.mock.calls[0][0].conclusion).toBeUndefined()
  expect(update.mock.calls[0][0]).toMatchObject({
    check_run_id: 42,
    status: 'in_progress'
  })
  expect(update.mock.calls[0][0].conclusion).toBeUndefined()
  expect(update.mock.calls[1][0]).toMatchObject({
    check_run_id: 42,
    conclusion: 'failure'
  })
})

test('annotate skips the API when there are no annotations', async function () {
  const githubUtil = new GithubUtil('1234', 'https://api.github.com')
  const {create, update} = stubClient(githubUtil)

  expect(
    await githubUtil.annotate({referenceCommitHash: 'abc123', annotations: []})
  ).toBe(0)
  expect(create).not.toHaveBeenCalled()
  expect(update).not.toHaveBeenCalled()
})

// @todo test for rest of github class
