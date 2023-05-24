import {test} from '@jest/globals'
import {getFixturePath} from '../fixtures/util'
import {parseLCov} from '../../src/utils/lcov'
import {getFileNameFirstItemFromPath,filterCoverageByFile} from '../../src/utils/general'

test('getFileNameFirstItemFromPath', function () {
  const testCases = [
    {
      input: 'a/b/c.test.ts',
      output: 'c'
    },
    {
      input: 'd.ts',
      output: 'd'
    },
    {
      input: '',
      output: undefined
    },
    {
      input: 'a/b/c',
      output: undefined
    }
  ]
  testCases.forEach(test => {
    expect(getFileNameFirstItemFromPath(test.input))
  })
})

test('filterCoverageByFile', async function () {
  const path = getFixturePath('lcov.info')
  const parsedLcov = await parseLCov(path)
  const output = filterCoverageByFile(parsedLcov)
  expect(output).toMatchSnapshot()
})
