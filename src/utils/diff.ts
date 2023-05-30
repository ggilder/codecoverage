interface FileDiff {
  filename: string;
  addedLines: number[];
  deletedLines: number[];
}

export function parseGitDiff(diffOutput: string): FileDiff[] {
  const fileDiffs: FileDiff[] = [];
  const lines = diffOutput.split('\n');

  let currentFileDiff: FileDiff | undefined;
  let currentAddedLines: number[] = [];
  let currentDeletedLines: number[] = [];
  let seenHeaderLine: boolean = false;
  let deletionCurrentLineNumber: number = 0;
  let additionCurrentLineNumber: number = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      // New file diff starts
      if (currentFileDiff) {
        currentFileDiff.addedLines = currentAddedLines;
        currentFileDiff.deletedLines = currentDeletedLines;
        fileDiffs.push(currentFileDiff);
      }

      currentFileDiff = {
        filename: getFilenameFromDiffHeader(line),
        addedLines: [],
        deletedLines: [],
      };
      currentAddedLines = [];
      currentDeletedLines = [];
      seenHeaderLine = false;
    } else if (line.startsWith('@@')) {
      // Header line
      seenHeaderLine = true;
      const lineInfo = getLineInfoFromHeaderLine(line);
      deletionCurrentLineNumber = lineInfo.deletionStartingLineNumber;
      additionCurrentLineNumber = lineInfo.additionStartingLineNumber;
    } else if (line.startsWith('+') && seenHeaderLine) {
      // Added line
      currentAddedLines.push(additionCurrentLineNumber);
      additionCurrentLineNumber++;
    } else if (line.startsWith('-') && seenHeaderLine) {
      // Deleted line
      currentDeletedLines.push(deletionCurrentLineNumber);
      deletionCurrentLineNumber++;
    } else if (seenHeaderLine) {
      // Context line
      deletionCurrentLineNumber++;
      additionCurrentLineNumber++;
    }
  }

  // Add the last file diff
  if (currentFileDiff) {
    currentFileDiff.addedLines = currentAddedLines;
    currentFileDiff.deletedLines = currentDeletedLines;
    fileDiffs.push(currentFileDiff);
  }

  return fileDiffs;
}

function getFilenameFromDiffHeader(header: string): string {
  // Extract the filename from the diff header
  const startIndex = header.indexOf(' a/') + 3;
  const endIndex = header.indexOf(' b/', startIndex);
  const filename = header.substring(startIndex, endIndex);
  return filename;
}

function getLineInfoFromHeaderLine(line: string): { deletionStartingLineNumber: number; additionStartingLineNumber: number } {
  // Extract the starting line numbers for each side of the diff
  const matches = line.match(/\-(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
  if (matches && matches.length === 5) {
    const deletionStartingLineNumber = parseInt(matches[1], 10);
    const additionStartingLineNumber = parseInt(matches[3], 10);
    return { deletionStartingLineNumber, additionStartingLineNumber };
  }
  return { deletionStartingLineNumber: 0, additionStartingLineNumber: 0 };
}
