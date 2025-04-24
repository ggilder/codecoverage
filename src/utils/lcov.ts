import * as NodeUtil from 'util'
import * as fs from 'fs'
import * as path from 'path'
import {CoverageParsed} from './general.js'
import parser from 'lcov-parse'

export async function parseLCov(
  lcovPath: string,
  workspacePath: string
): Promise<CoverageParsed> {
  if (!lcovPath) {
    throw Error('No LCov path provided')
  }

  const parserPromise = NodeUtil.promisify(parser)
  const fileRaw = fs.readFileSync(lcovPath, 'utf8')
  const parsed = (await parserPromise(fileRaw)) as CoverageParsed

  for (const entry of parsed) {
    entry.file = path.relative(workspacePath, entry.file)
  }

  return parsed
}
