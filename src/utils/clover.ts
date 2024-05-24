import * as clover from '@cvrg-report/clover-json'
import * as fs from 'fs'
import * as path from 'path'
import {CoverageParsed} from './general'

export async function parseClover(
  coveragePath: string,
  workspacePath: string
): Promise<CoverageParsed> {
  if (!coveragePath) {
    throw Error('No Clover XML path provided')
  }
  if (!workspacePath) {
    throw Error('No workspace path provided')
  }
  const fileRaw = fs.readFileSync(coveragePath, 'utf8')
  const parsed = await clover.parseContent(fileRaw)

  for (const entry of parsed) {
    entry.file = path.relative(workspacePath, entry.path || entry.file)
  }

  return parsed
}
