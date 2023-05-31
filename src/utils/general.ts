export function filterCoverageByFile(coverage: CoverageParsed): CoverageFile[] {
  return coverage.map(item => ({
    fileName: item.file,
    missingLineNumbers: item?.lines?.details
      .filter(line => line.hit === 0)
      .map(line => line.line)
  }))
}

export function coalesceLineNumbers(lines: number[]): LineRange[] {
  const ranges: LineRange[] = []
  let rstart
  let rend
  for (let i = 0; i < lines.length; i++) {
    rstart = lines[i]
    rend = rstart
    while (lines[i + 1] - lines[i] === 1) {
      rend = lines[i + 1]
      i++
    }
    ranges.push({start_line: rstart, end_line: rend})
  }
  return ranges
}

export function intersectLineRanges(
  rangesA,
  rangesB: LineRange[]
): LineRange[] {
  const outRanges: LineRange[] = []
  for (const bRange of rangesB) {
    const aRangeIntersects = rangesA.filter(aRange => {
      return (
        (bRange.start_line >= aRange.start_line &&
          bRange.start_line <= aRange.end_line) ||
        (bRange.end_line >= aRange.start_line &&
          bRange.end_line <= aRange.end_line) ||
        (aRange.start_line >= bRange.start_line &&
          aRange.start_line <= bRange.end_line) ||
        (aRange.end_line >= bRange.start_line &&
          aRange.end_line <= bRange.end_line)
      )
    })
    for (const aRange of aRangeIntersects) {
      outRanges.push({
        start_line: Math.max(aRange.start_line, bRange.start_line),
        end_line: Math.min(aRange.end_line, bRange.end_line)
      })
    }
  }
  return outRanges
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

export type LineRange = {
  start_line: number
  end_line: number
}
