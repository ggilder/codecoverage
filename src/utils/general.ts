/** input: dist/index.test.ts --> output: index */
export function getFileNameFirstItemFromPath(path: string): string | undefined {
  const rawFileName = path?.split('/')?.pop()
  return rawFileName?.split('.')?.[0]
}

export function filterCoverageByFile(coverage: CoverageParsed): CoverageFile[] {
  return coverage.map(item => ({
    fileName: item.file,
    missingLineNumbers: item?.lines?.details
      .filter(line => line.hit === 0)
      .map(line => line.line)
  }))
}

export type CoverageParsed = {
  file: string
  title: string
  lines: {
    found: number
    hit: number
    details: {
      line: number
      hit: number
      name: string
    }[]
  }
}[]

export type CoverageFile = {
  fileName: string
  missingLineNumbers: number[]
}
