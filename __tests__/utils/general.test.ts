import {test} from '@jest/globals'
import {getFixturePath} from '../fixtures/util'
import {parseLCov} from '../../src/utils/lcov'
import {
  filterCoverageByFile,
  coalesceLineNumbers,
  intersectLineRanges
} from '../../src/utils/general'

test('filterCoverageByFile', async function () {
  const path = getFixturePath('lcov.info')
  const parsedLcov = await parseLCov(path)
  const output = filterCoverageByFile(parsedLcov)
  expect(output).toMatchSnapshot()
})

test('coalesceLineNumbers', function () {
  const lines = [1, 3, 4, 5, 10, 12, 13]
  const ranges = coalesceLineNumbers(lines)
  expect(ranges).toEqual([
    {start_line: 1, end_line: 1},
    {start_line: 3, end_line: 5},
    {start_line: 10, end_line: 10},
    {start_line: 12, end_line: 13}
  ])
})

test('range intersections', function () {
  const a = [
    {start_line: 1, end_line: 4},
    {start_line: 7, end_line: 9},
    {start_line: 132, end_line: 132},
    {start_line: 134, end_line: 136}
  ]
  const b = [
    {start_line: 2, end_line: 3},
    {start_line: 5, end_line: 7},
    {start_line: 9, end_line: 11},
    {start_line: 132, end_line: 139}
  ]
  const expected = [
    {start_line: 2, end_line: 3},
    {start_line: 7, end_line: 7},
    {start_line: 9, end_line: 9},
    {start_line: 132, end_line: 132},
    {start_line: 134, end_line: 136}
  ]

  expect(intersectLineRanges(a, b)).toEqual(expected)
})
