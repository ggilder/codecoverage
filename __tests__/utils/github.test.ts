import {test} from '@jest/globals'
import {GithubUtil} from '../../src/utils/github'

test('github init successfully', async function () {
  const githubUtil = new GithubUtil('1234')
  expect(githubUtil).toBeInstanceOf(GithubUtil)
})

test('github init to throw error', function () {
  expect(() => new GithubUtil('')).toThrowError('GITHUB_TOKEN is missing')
})

test('parse pull request files', function () {
  const githubUtil = new GithubUtil('1234');

  const data = [
    {
      "filename": "file1.txt",
      "patch": "@@ -132,7 +132,7 @@ module Test @@ -1000,7 +1000,7 @@ module Test"
    },
    {
      "filename": "test/dir/file1.txt",
      "patch": "@@ -22,25 +22,23 @@ export class GithubUtil"
    }
  ]

  const files = githubUtil.parsePullRequestFiles(data);

  expect(files).toMatchSnapshot();
})

test('coalesceLineNumbers', function () {
  const githubUtil = new GithubUtil('1234');

  const lines = [1,3,4,5,10,12,13];
  const ranges = githubUtil.coalesceLineNumbers(lines);
  expect(ranges).toEqual([
    { start_line: 1, end_line: 1 },
    { start_line: 3, end_line: 5 },
    { start_line: 10, end_line: 10 },
    { start_line: 12, end_line: 13 },
  ]);
})

test('build annotations', function () {
  const githubUtil = new GithubUtil('1234');

  const prFiles = {
    "file1.txt": [
      { "end_line": 139, "start_line": 132 },
      { "end_line": 1007, "start_line": 1000 },
    ],
    "test/dir/file1.txt": [
      { "end_line": 45, "start_line": 22 },
    ],
  };

  const coverageFiles = [
    { "fileName": "/workspace/unchanged.txt", "missingLineNumbers": [1,2,3] },
    { "fileName": "/workspace/file1.txt", "missingLineNumbers": [1,2,3,132,134,135,136,1007,1008] },
    { "fileName": "/workspace/test/dir/file1.txt", "missingLineNumbers": [20,21,22] },
  ]

  const annotations = githubUtil.buildAnnotations(coverageFiles, prFiles, "/workspace");

  expect(annotations).toEqual([
    { path: "file1.txt", start_line: 132, end_line: 132, annotation_level: 'warning', message: 'This line is not covered by a test' },
    { path: "file1.txt", start_line: 134, end_line: 136, annotation_level: 'warning', message: 'These lines are not covered by a test' },
    { path: "file1.txt", start_line: 1007, end_line: 1008, annotation_level: 'warning', message: 'These lines are not covered by a test' },
    { path: "test/dir/file1.txt", start_line: 20, end_line: 22, annotation_level: 'warning', message: 'These lines are not covered by a test' },
  ]);
})

// @todo test for rest of github class
