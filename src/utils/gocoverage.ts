import * as fs from 'fs'
import * as gocov from 'golang-cover-parse'
import * as path from 'path'
import * as readline from 'readline'
import {CoverageParsed} from './general'

export async function parseGoCoverage(
  coveragePath: string,
  goModPath: string
): Promise<CoverageParsed> {
  if (!coveragePath) {
    throw Error('No Go coverage path provided')
  }

  if (!goModPath) {
    throw Error('No Go module path provided')
  }

  const goModule = await parseGoModFile(goModPath)

  const fileRaw = fs.readFileSync(coveragePath, 'utf8')
  return new Promise((resolve, reject) => {
    gocov.parseContent(fileRaw, (err, result) => {
      if (err === null) {
        filterModulePaths(result, goModule)
        resolve(result)
      }
      reject(err)
    })
  })
}

function filterModulePaths(entries, moduleName: string): void {
  for (const entry of entries) {
    entry.file = path.relative(moduleName, entry.file)
  }
}

async function parseGoModFile(filePath: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    if (line.startsWith('module ')) {
      return line.slice(7)
    }
  }

  /* istanbul ignore next */
  return ''
}
