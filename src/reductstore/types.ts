export interface MonacoModel {
  getLineContent(lineNumber: number): string;
}

export interface MonacoPosition {
  lineNumber: number;
  column: number;
}

export interface MonacoRange {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

export interface MonacoCompletionItem {
  label: string;
  kind: number;
  insertText: string;
  detail?: string;
  documentation?: string;
  range: MonacoRange;
  sortText?: string;
}

export interface MonacoCompletionResult {
  suggestions: MonacoCompletionItem[];
}
