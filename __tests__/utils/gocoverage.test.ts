import {test} from '@jest/globals'
import {parseGoCoverage} from '../../src/utils/gocoverage'
import {getFixturePath} from '../fixtures/util'

test('should parse Go coverage file', async function () {
  const path = getFixturePath('gocoverage.out')
  const goModPath = getFixturePath('go.mod')
  const output = await parseGoCoverage(path, goModPath)
  expect(output).toMatchSnapshot()
})

test('should throw err if file path is not given', async function () {
  await expect(parseGoCoverage('', '')).rejects.toThrow(
    'No Go coverage path provided'
  )
})

test('should throw err if go.mod path is not given', async function () {
  await expect(parseGoCoverage('foo', '')).rejects.toThrow(
    'No Go module path provided'
  )
})
