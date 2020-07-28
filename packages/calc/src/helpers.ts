import { CellInterface, Sheet, Position } from "./parser";

/* Check if a value is null */
export const isNull = (value: any) =>
  value === void 0 || value === null || value === "";

export type DATATYPES =
  | "null"
  | "number"
  | "string"
  | "date"
  | "formula"
  | "richtext"
  | "boolean"
  | "error"
  | "hyperlink";
/**
 * Detect datatype of a string
 * @param value
 */
export const detectDataType = (value?: any): DATATYPES | undefined => {
  if (isNull(value)) return void 0;
  if (!isNaN(Number(value))) return "number";
  return "string";
};

/**
 * Converts address string to CellInterface
 * @param address
 */
export const addressToCell = (address: string): CellInterface | null => {
  const regex = /([A-Z]+)(\d+)/gim;
  let m;
  let matches: string[] = [];

  while ((m = regex.exec(address)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex > 0) matches.push(match);
    });
  }
  if (!matches.length) return null;
  const [columnAlpha, rowIndex] = matches;
  return {
    rowIndex: parseInt(rowIndex),
    columnIndex: alpha2number(columnAlpha),
  };
};

/**
 * Convert cellInterface to address string
 * @param cell
 */
export const cellToAddress = (cell: CellInterface | null): string | null => {
  if (!cell) return null;
  return `${number2Alpha(cell.columnIndex - 1)}${cell.rowIndex}`;
};

/**
 * Number to alphabet
 * @param i
 */
export const number2Alpha = (i: number): string => {
  return (
    (i >= 26 ? number2Alpha(((i / 26) >> 0) - 1) : "") +
    "abcdefghijklmnopqrstuvwxyz"[i % 26 >> 0]
  ).toUpperCase();
};

/**
 * Converts a letter to number
 * A = 1
 * B => 2
 * @param letters
 */
export const alpha2number = (letters: string): number => {
  return letters.split("").reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0);
};

export const createPosition = (id: Sheet, row = 1, col = 1): Position => {
  return {
    sheet: id,
    row: 1,
    col: 1,
  };
};
