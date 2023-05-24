import {test} from '@jest/globals'
import {getFixturePath} from '../fixtures/util'
import {parseLCov} from '../../src/utils/lcov'
import {filterCoverageByFile} from '../../src/utils/general'

test('filterCoverageByFile', async function () {
  const path = getFixturePath('lcov.info')
  const parsedLcov = await parseLCov(path)
  const output = filterCoverageByFile(parsedLcov)
  expect(output).toMatchSnapshot()
})
