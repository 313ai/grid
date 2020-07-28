import FastFormulaParser from "fast-formula-parser";
import { DepParser } from "fast-formula-parser/grammar/dependency/hooks";
import FormulaError from "fast-formula-parser/formulas/error";
import { detectDataType, DATATYPES } from "./helpers";
import { CellsBySheet } from "./calc";
import merge from "lodash.merge";

export type Sheet = string;

export interface Position {
  sheet: Sheet;
  row: number;
  col: number;
}

export interface CellRange {
  sheet: Sheet;
  from: Omit<Position, "sheet">;
  to: Omit<Position, "sheet">;
}

export interface ParseResults {
  result?: React.ReactText | undefined;
  formulaType?: DATATYPES;
  error?: string;
}

const basePosition: Position = { row: 1, col: 1, sheet: "Sheet1" };

export interface CellInterface {
  rowIndex: number;
  columnIndex: number;
}
export interface CellConfig {
  text?: string;
  prevText?: string;
  result?: React.ReactText;
  error?: string;
  datatype?: DATATYPES;
}
export type GetValue = (sheet: Sheet, cell: CellInterface) => CellConfig;

interface Functions {
  [key: string]: (args: any) => any;
}

/**
 * Create a formula parser
 * @param param0
 */
class FormulaParser {
  formulaParser: FastFormulaParser;
  dependencyParser: DepParser;
  getValue: GetValue | undefined;
  currentValues: CellsBySheet | undefined;
  constructor(getValue?: GetValue, readonly functions?: Functions) {
    if (getValue) this.getValue = getValue;
    this.formulaParser = new FastFormulaParser({
      functions: functions,
      onCell: this.getCellValue,
      onRange: this.getRangeValue
    });
    this.dependencyParser = new DepParser();
  }

  cacheValues = (changes: CellsBySheet) => {
    this.currentValues = merge(this.currentValues, changes);
  };

  clearCachedValues = () => {
    this.currentValues = undefined;
  };

  getCellConfig = (position: Position) => {
    const sheet = position.sheet;
    const cell = { rowIndex: position.row, columnIndex: position.col };
    const config = this.getValue?.(sheet, cell) ?? null;
    // console.log('cell',cell, config)
    if (config === null) return config;
    if (config?.datatype === "formula") {
      return config?.result;
    }
    return config && config.datatype === "number"
      ? parseFloat(config.text || "0")
      : config.text ?? null;
  };

  getCellValue = (pos: Position) => {
    return (
      this.currentValues?.[pos.sheet]?.[pos.row]?.[pos.col]?.result ||
      this.getCellConfig(pos)
    );
  };

  getRangeValue = (ref: CellRange) => {
    const arr = [];
    for (let row = ref.from.row; row <= ref.to.row; row++) {
      const innerArr = [];
      for (let col = ref.from.col; col <= ref.to.col; col++) {
        innerArr.push(this.getCellValue({ sheet: ref.sheet, row, col }));
      }
      arr.push(innerArr);
    }
    return arr;
  };
  parse = (
    text: string | null,
    position: Position = basePosition,
    getValue?: GetValue
  ): ParseResults => {
    /* Update getter */
    if (getValue !== void 0) this.getValue = getValue;
    let result;
    let error;
    let formulaType: DATATYPES | undefined;
    try {
      result = this.formulaParser.parse(text, position);
      if ((result as any) instanceof FormulaError) {
        error =
          ((result as unknown) as FormulaError).message ||
          ((result as unknown) as FormulaError).error;
      }
      formulaType = detectDataType(result);
    } catch (err) {
      error = err.toString();
      formulaType = "error";
    }
    return { result, formulaType, error };
  };
  getDependencies = (text: string, position: Position = basePosition) => {
    return this.dependencyParser.parse(text, position);
  };
}

export { FormulaParser };