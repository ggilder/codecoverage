import {test, expect} from 'vitest'
import {parseClover} from '../../src/utils/clover'
import {getFixturePath} from '../fixtures/util'

test('should parse Clover file', async function () {
  const path = getFixturePath('clover.xml')
  const output = await parseClover(path, '/var/www/html')
  expect(output).toMatchSnapshot()
})

test('should parse Clover file with paths', async function () {
  const path = getFixturePath('clover_with_path.xml')
  const output = await parseClover(path, '/Users/gabriel/src/project')
  expect(output).toMatchSnapshot()
})

test('should throw err if file path is not given', async function () {
  await expect(parseClover('', '')).rejects.toThrow(
    'No Clover XML path provided'
  )
})

test('should throw err if workspace path is not given', async function () {
  await expect(parseClover('clover.xml', '')).rejects.toThrow(
    'No workspace path provided'
  )
})
