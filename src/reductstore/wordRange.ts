import { MonacoModel, MonacoPosition, MonacoRange } from './types';

// Find the start of the current word being typed and build the range to replace it
export function getWordRange(
  model: MonacoModel,
  position: MonacoPosition,
  isWordChar: RegExp,
): MonacoRange {
  const lineText = model.getLineContent(position.lineNumber);
  let wordStart = position.column - 1;
  while (wordStart > 0) {
    const char = lineText.charAt(wordStart - 1);
    if (!isWordChar.test(char)) {
      break;
    }
    wordStart--;
  }
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: wordStart + 1,
    endColumn: position.column,
  };
}
