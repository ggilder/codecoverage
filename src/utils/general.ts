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
  a: LineRange[],
  b: LineRange[]
): LineRange[] {
  const result: LineRange[] = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    const rangeA = a[i]
    const rangeB = b[j]

    if (rangeA.end_line < rangeB.start_line) {
      i++
    } else if (rangeB.end_line < rangeA.start_line) {
      j++
    } else {
      const start = Math.max(rangeA.start_line, rangeB.start_line)
      const end = Math.min(rangeA.end_line, rangeB.end_line)
      result.push({start_line: start, end_line: end})

      if (rangeA.end_line < rangeB.end_line) {
        i++
      } else {
        j++
      }
    }
  }

  return result
}

export function longestCommonSubpath(paths: string[]): string {
  if (paths.length === 0) {
    return ''
  }

  const splitPaths = paths.map(path => {
    const parts = path.split('/')
    return parts.slice(0, parts.length - 1)
  })

  let longest = ''
  let currentSubpath = ''

  for (let i = 0; i < splitPaths[0].length; i++) {
    const currentSegment = splitPaths[0][i]

    for (let j = 1; j < splitPaths.length; j++) {
      if (splitPaths[j][i] !== currentSegment) {
        return longest
      }
    }

    currentSubpath += `${currentSegment}/`
    longest = currentSubpath
  }

  return longest
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
