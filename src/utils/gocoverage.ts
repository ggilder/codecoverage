import * as fs from 'fs'
import * as gocov from 'golang-cover-parse'
import * as path from 'path'
import {CoverageParsed, longestCommonSubpath} from './general'

export async function parseGoCoverage(
  coveragePath: string
): Promise<CoverageParsed> {
  if (!coveragePath) {
    throw Error('No Go coverage path provided')
  }
  const fileRaw = fs.readFileSync(coveragePath, 'utf8')
  return new Promise((resolve, reject) => {
    gocov.parseContent(fileRaw, (err, result) => {
      if (err === null) {
        filterModulePaths(result)
        resolve(result)
      }
      reject(err)
    })
  })
}

function filterModulePaths(entries): void {
  const allPaths = entries.map(entry => entry.file)
  const basePath = longestCommonSubpath(allPaths)

  for (const entry of entries) {
    entry.file = path.relative(basePath, entry.file)
  }
}
