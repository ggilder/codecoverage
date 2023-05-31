import * as NodeUtil from 'util'
import * as fs from 'fs'
import {CoverageParsed} from './general'
import parser from 'lcov-parse'

export async function parseLCov(lcovPath: string): Promise<CoverageParsed> {
  if (!lcovPath) {
    throw Error('No LCov path provided')
  }
  const parserPromise = NodeUtil.promisify(parser)
  const fileRaw = fs.readFileSync(lcovPath, 'utf8')
  return parserPromise(fileRaw) as CoverageParsed
}
