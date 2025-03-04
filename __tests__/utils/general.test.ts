import {test} from '@jest/globals'
import {getFixturePath} from '../fixtures/util'
import {parseLCov} from '../../src/utils/lcov'
import {
  filterCoverageByFile,
  coalesceLineNumbers,
  intersectLineRanges,
  correctLineTotals
} from '../../src/utils/general'

test('filterCoverageByFile', async function () {
  const path = getFixturePath('lcov.info')
  const parsedLcov = await parseLCov(path, '')
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

test('correctLineTotals', function () {
  const mockCoverage = [
    {
      file: 'test.ts',
      title: 'Test File',
      lines: {
        found: 0, // Incorrect initial value
        hit: 0, // Incorrect initial value
        details: [
          {line: 1, hit: 1, name: 'line1'},
          {line: 2, hit: 0, name: 'line2'},
          {line: 3, hit: 2, name: 'line3'},
          {line: 4, hit: 0, name: 'line4'}
        ]
      }
    }
  ]

  const result = correctLineTotals(mockCoverage)
  expect(result[0].lines.found).toBe(4)
  expect(result[0].lines.hit).toBe(2)
  expect(result[0].file).toBe('test.ts')
  expect(result[0].title).toBe('Test File')

  // Test with multiple files
  const multiFileMock = [
    {
      file: 'file1.ts',
      title: 'File 1',
      lines: {
        found: 0,
        hit: 0,
        details: [
          {line: 1, hit: 1, name: 'line1'},
          {line: 2, hit: 1, name: 'line2'}
        ]
      }
    },
    {
      file: 'file2.ts',
      title: 'File 2',
      lines: {
        found: 0,
        hit: 0,
        details: [
          {line: 1, hit: 0, name: 'line1'},
          {line: 2, hit: 0, name: 'line2'},
          {line: 3, hit: 1, name: 'line3'}
        ]
      }
    }
  ]

  const multiResult = correctLineTotals(multiFileMock)
  expect(multiResult[0].lines.found).toBe(2)
  expect(multiResult[0].lines.hit).toBe(2)
  expect(multiResult[1].lines.found).toBe(3)
  expect(multiResult[1].lines.hit).toBe(1)
})
