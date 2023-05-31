import {test} from '@jest/globals'
import {parseGitDiff} from '../../src/utils/diff'
import {getFixturePath} from '../fixtures/util'
import * as fs from 'fs'

test('should parse Git diff', async function () {
  const path = getFixturePath('test.diff')
  const diffOutput = fs.readFileSync(path, 'utf8')
  const output = parseGitDiff(diffOutput)

  expect(output).toMatchSnapshot()
})
