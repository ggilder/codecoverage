import {test, expect} from 'vitest'
import {parseGitDiff, parsePatch} from '../../src/utils/diff'
import {getFixturePath} from '../fixtures/util'
import * as fs from 'fs'

test('should parse Git diff', async function () {
  const path = getFixturePath('test.diff')
  const diffOutput = fs.readFileSync(path, 'utf8')
  const output = parseGitDiff(diffOutput)

  expect(output).toMatchSnapshot()
})

test('parsePatch should return empty array for empty patch', () => {
  expect(parsePatch('')).toEqual([])
})

test('parsePatch should parse single hunk patch', () => {
  const patch = `@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`
  expect(parsePatch(patch)).toEqual([1, 2, 3])
})

test('parsePatch should parse patch with context and deletions', () => {
  const patch = `@@ -1,5 +1,6 @@
 unchanged line 1
-deleted line
+added line 1
+added line 2
 unchanged line 2
 unchanged line 3`
  // Line 2 and 3 are the added lines (after unchanged line 1 at position 1)
  expect(parsePatch(patch)).toEqual([2, 3])
})

test('parsePatch should parse patch with multiple hunks', () => {
  const patch = `@@ -1,3 +1,4 @@
 line 1
+new line 2
 line 3
 line 4
@@ -10,3 +11,4 @@
 line 11
+new line 12
 line 13`
  expect(parsePatch(patch)).toEqual([2, 12])
})
