/**
 * Parse a single file's patch (from GitHub's listFiles API) to extract added line numbers.
 * The patch format contains only hunk headers (@@) and changes, not the full diff header.
 */
export function parsePatch(patch: string): number[] {
  const addedLines: number[] = []
  const lines = patch.split('\n')
  let additionCurrentLineNumber = 0
  let seenHeaderLine = false

  for (const line of lines) {
    if (line.startsWith('@@')) {
      seenHeaderLine = true
      const lineInfo = getLineInfoFromHeaderLine(line)
      additionCurrentLineNumber = lineInfo.additionStartingLineNumber
    } else if (line.startsWith('+') && seenHeaderLine) {
      addedLines.push(additionCurrentLineNumber)
      additionCurrentLineNumber++
    } else if (line.startsWith('-') && seenHeaderLine) {
      // Deleted line - don't increment addition line number
    } else if (seenHeaderLine) {
      // Context line
      additionCurrentLineNumber++
    }
  }

  return addedLines
}

function getLineInfoFromHeaderLine(line: string): {
  deletionStartingLineNumber: number
  additionStartingLineNumber: number
} {
  // Extract the starting line numbers for each side of the diff
  const matches = line.match(/-(\d+),?(\d+)? \+(\d+),?(\d+)? @@/)
  if (matches && matches.length === 5) {
    const deletionStartingLineNumber = parseInt(matches[1], 10)
    const additionStartingLineNumber = parseInt(matches[3], 10)
    return {deletionStartingLineNumber, additionStartingLineNumber}
  }
  return {deletionStartingLineNumber: 0, additionStartingLineNumber: 0}
}
