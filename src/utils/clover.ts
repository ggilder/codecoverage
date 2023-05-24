import * as fs from 'fs'
import * as clover from '@cvrg-report/clover-json'
import {CoverageParsed} from './general'

export async function parseClover(path: string): Promise<CoverageParsed> {
  if (!path) {
    throw Error('No Clover XML path provided')
  }
  const fileRaw = fs.readFileSync(path, 'utf8')
  return clover.parseContent(fileRaw);
}
