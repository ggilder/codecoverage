import {test, expect} from 'vitest'
import {parseLCov} from '../../src/utils/lcov'
import {getFixturePath} from '../fixtures/util'

test('should parse lCov file', async function () {
  const path = getFixturePath('lcov.info')
  const output = await parseLCov(path, process.cwd())
  expect(output).toMatchSnapshot()
})

test('should throw err if lCov file path is not given', async function () {
  await expect(parseLCov('', '')).rejects.toThrow('No LCov path provided')
})
