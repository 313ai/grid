import produce, { enablePatches, applyPatches, Patch } from "immer";
import { uuid, detectDataType, cellsInSelectionVariant } from "./constants";
import { Sheet, SheetID, Cells } from "./Spreadsheet";
import {
  PatchInterface,
  CellInterface,
  SelectionArea,
  AreaProps,
  selectionFromActiveCell,
  ScrollCoords,
  Filter,
  FilterDefinition,
  isNull,
} from "@rowsncolumns/grid";
import {
  CellFormatting,
  FORMATTING_TYPE,
  STROKE_FORMATTING,
  AXIS,
  BORDER_STYLE,
  BORDER_VARIANT,
} from "./types";

/* Enabled patches in immer */
enablePatches();

export const defaultSheets: Sheet[] = [
  {
    id: uuid(),
    name: "Sheet1",
    frozenColumns: 0,
    frozenRows: 0,
    activeCell: {
      rowIndex: 1,
      columnIndex: 1,
    },
    mergedCells: [],
    selections: [],
    cells: {},
    scrollState: { scrollTop: 0, scrollLeft: 0 },
    filterViews: [],
  },
];

export interface StateInterface {
  selectedSheet: React.ReactText | null;
  sheets: Sheet[];
  currentActiveCell?: CellInterface | null;
  currentSelections?: SelectionArea[] | null;
}

export enum ACTION_TYPE {
  SELECT_SHEET = "SELECT_SHEET",
  APPLY_PATCHES = "APPLY_PATCHES",
  CHANGE_SHEET_NAME = "CHANGE_SHEET_NAME",
  NEW_SHEET = "NEW_SHEET",
  CHANGE_SHEET_CELL = "CHANGE_SHEET_CELL",
  UPDATE_FILL = "UPDATE_FILL",
  DELETE_SHEET = "DELETE_SHEET",
  SHEET_SELECTION_CHANGE = "SHEET_SELECTION_CHANGE",
  FORMATTING_CHANGE_AUTO = "FORMATTING_CHANGE_AUTO",
  FORMATTING_CHANGE_PLAIN = "FORMATTING_CHANGE_PLAIN",
  FORMATTING_CHANGE = "FORMATTING_CHANGE",
  DELETE_CELLS = "DELETE_CELLS",
  CLEAR_FORMATTING = "CLEAR_FORMATTING",
  RESIZE = "RESIZE",
  MERGE_CELLS = "MERGE_CELLS",
  FROZEN_ROW_CHANGE = "FROZEN_ROW_CHANGE",
  FROZEN_COLUMN_CHANGE = "FROZEN_COLUMN_CHANGE",
  SET_BORDER = "SET_BORDER",
  UPDATE_SCROLL = "UPDATE_SCROLL",
  CHANGE_FILTER = "CHANGE_FILTER",
  DELETE_COLUMN = "DELETE_COLUMN",
  DELETE_ROW = "DELETE_ROW",
  INSERT_COLUMN = "INSERT_COLUMN",
  INSERT_ROW = "INSERT_ROW",
  REMOVE_CELLS = "REMOVE_CELLS",
  PASTE = "PASTE",
  REPLACE_SHEETS = "REPLACE_SHEETS",
}

export type ActionTypes =
  | {
      type: ACTION_TYPE.SELECT_SHEET;
      id: React.ReactText;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.APPLY_PATCHES;
      patches: Patch[];
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.CHANGE_SHEET_NAME;
      id: SheetID;
      name: string;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.NEW_SHEET; sheet: Sheet; undoable?: boolean }
  | {
      type: ACTION_TYPE.CHANGE_SHEET_CELL;
      id: SheetID;
      changes: Cells;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.UPDATE_FILL;
      id: SheetID;
      activeCell: CellInterface;
      fillSelection: SelectionArea;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.DELETE_SHEET; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.SHEET_SELECTION_CHANGE;
      id: SheetID;
      activeCell: CellInterface | null;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FORMATTING_CHANGE_AUTO;
      id: SheetID;
      selections: SelectionArea[];
      activeCell: CellInterface | null;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FORMATTING_CHANGE_PLAIN;
      id: SheetID;
      selections: SelectionArea[];
      activeCell: CellInterface | null;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FORMATTING_CHANGE;
      id: SheetID;
      selections: SelectionArea[];
      activeCell: CellInterface | null;
      key: keyof CellFormatting;
      value: any;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.DELETE_CELLS;
      id: SheetID;
      activeCell: CellInterface | null;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.REMOVE_CELLS;
      id: SheetID;
      activeCell: CellInterface | null;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.CLEAR_FORMATTING; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.RESIZE;
      id: SheetID;
      axis: AXIS;
      dimension: number;
      index: number;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.MERGE_CELLS; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.FROZEN_ROW_CHANGE;
      id: SheetID;
      count: number;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FROZEN_COLUMN_CHANGE;
      id: SheetID;
      count: number;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.SET_BORDER;
      id: SheetID;
      color: string | undefined;
      borderStyle: BORDER_STYLE;
      variant?: BORDER_VARIANT;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.UPDATE_SCROLL;
      id: SheetID;
      scrollState: ScrollCoords;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.CHANGE_FILTER;
      id: SheetID;
      filterViewIndex: number;
      columnIndex: number;
      filter?: FilterDefinition;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.DELETE_COLUMN;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.DELETE_ROW;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.INSERT_COLUMN;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.INSERT_ROW;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.PASTE;
      id: SheetID;
      rows: (string | null)[][];
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.REPLACE_SHEETS; sheets: Sheet[]; undoable?: boolean };

export interface Props {
  onUpdate: <T>(patches: PatchInterface<T>) => void;
  getCellBounds: (cell: CellInterface | null) => AreaProps | undefined;
}

const initialState: StateInterface = {
  selectedSheet: 0,
  sheets: defaultSheets,
  currentActiveCell: null,
  currentSelections: null,
};

export const createStateReducer = ({ onUpdate, getCellBounds }: Props) => {
  return (state = initialState, action: ActionTypes): StateInterface => {
    return produce(
      state,
      (draft) => {
        switch (action.type) {
          case ACTION_TYPE.SELECT_SHEET:
            draft.selectedSheet = action.id;
            break;

          case ACTION_TYPE.CHANGE_SHEET_NAME: {
            const sheet = draft.sheets.find((sheet) => sheet.id === action.id);
            if (sheet) {
              sheet.name = action.name;
            }
            break;
          }

          case ACTION_TYPE.NEW_SHEET: {
            (draft.sheets as Sheet[]).push(action.sheet);
            draft.selectedSheet = action.sheet.id;
            break;
          }

          case ACTION_TYPE.CHANGE_SHEET_CELL: {
            const sheet = draft.sheets.find((sheet) => sheet.id === action.id);
            if (sheet) {
              const { activeCell } = sheet;
              for (const row in action.changes) {
                sheet.cells[row] = sheet.cells[row] ?? {};
                for (const col in action.changes[row]) {
                  /* Grab the previous value for undo */
                  sheet.cells[row][col] = sheet.cells[row][col] ?? {};
                  const cell = sheet.cells[row][col];
                  const value = action.changes[row][col].text;
                  /* Get datatype of user input */
                  const datatype = detectDataType(value);
                  cell.text = value;
                  cell.datatype = datatype;
                }
              }

              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
            }
            break;
          }

          case ACTION_TYPE.UPDATE_FILL: {
            const sheet = draft.sheets.find((sheet) => sheet.id === action.id);
            if (sheet) {
              const { activeCell, fillSelection } = action;
              const { rowIndex, columnIndex } = activeCell;
              const cellValue = sheet.cells[rowIndex]?.[columnIndex];
              const { bounds } = fillSelection;
              for (let i = bounds.top; i <= bounds.bottom; i++) {
                sheet.cells[i] = sheet.cells[i] ?? {};
                for (let j = bounds.left; j <= bounds.right; j++) {
                  if (i === rowIndex && j === columnIndex) continue;
                  sheet.cells[i][j] = cellValue;
                }
              }
              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
            }
            break;
          }

          case ACTION_TYPE.DELETE_SHEET: {
            const { id } = action;
            const index = draft.sheets.findIndex((sheet) => sheet.id === id);
            const newSheets = draft.sheets.filter((sheet) => sheet.id !== id);
            const newSelectedSheet =
              draft.selectedSheet === draft.sheets[index].id
                ? newSheets[Math.max(0, index - 1)].id
                : draft.selectedSheet;
            draft.selectedSheet = newSelectedSheet;
            draft.sheets.splice(index, 1);
            break;
          }

          case ACTION_TYPE.SHEET_SELECTION_CHANGE: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.activeCell = action.activeCell;
              sheet.selections = action.selections;
            }
            break;
          }

          case ACTION_TYPE.FORMATTING_CHANGE_AUTO: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            const { selections } = action;
            if (sheet) {
              for (let i = 0; i < selections.length; i++) {
                const { bounds } = selections[i];
                if (!bounds) continue;
                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    delete sheet.cells[j]?.[k]?.plaintext;
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.FORMATTING_CHANGE_PLAIN: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            const { selections } = action;
            if (sheet) {
              for (let i = 0; i < selections.length; i++) {
                const { bounds } = selections[i];
                if (!bounds) continue;
                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  sheet.cells[j] = sheet.cells[j] ?? {};
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    sheet.cells[j][k] = sheet.cells[j][k] ?? {};
                    sheet.cells[j][k].plaintext = true;
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.FORMATTING_CHANGE: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            const { selections, activeCell, key, value } = action;
            if (sheet) {
              for (let i = 0; i < selections.length; i++) {
                const { bounds } = selections[i];
                if (!bounds) continue;
                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  sheet.cells[j] = sheet.cells[j] ?? {};
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    sheet.cells[j][k] = sheet.cells[j][k] ?? {};
                    sheet.cells[j][k][key] = value;

                    /* if user is applying a custom number format, remove plaintext */
                    if (key === FORMATTING_TYPE.CUSTOM_FORMAT) {
                      delete sheet.cells[j]?.[k]?.plaintext;
                    }
                  }
                }
              }
              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
            }
            break;
          }

          case ACTION_TYPE.DELETE_CELLS: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = action;
              if (selections.length) {
                selections.forEach((sel) => {
                  const { bounds } = sel;
                  for (let i = bounds.top; i <= bounds.bottom; i++) {
                    if (sheet.cells[i] === void 0) continue;
                    for (let j = bounds.left; j <= bounds.right; j++) {
                      if (sheet.cells[i][j] === void 0) continue;
                      sheet.cells[i][j].text = "";
                    }
                  }
                });
              } else if (activeCell) {
                const { rowIndex, columnIndex } = activeCell;
                if (sheet.cells?.[rowIndex]?.[columnIndex]) {
                  sheet.cells[rowIndex][columnIndex].text = "";
                }
              }
            }
            break;
          }

          case ACTION_TYPE.REMOVE_CELLS: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = action;
              if (selections.length) {
                selections.forEach((sel) => {
                  const { bounds } = sel;
                  for (let i = bounds.top; i <= bounds.bottom; i++) {
                    for (let j = bounds.left; j <= bounds.right; j++) {
                      delete sheet.cells?.[i]?.[j];
                    }
                  }
                });
              } else if (activeCell) {
                const { rowIndex, columnIndex } = activeCell;
                delete sheet.cells?.[rowIndex]?.[columnIndex];
              }
            }
            break;
          }

          /* Clear formatting */
          case ACTION_TYPE.CLEAR_FORMATTING: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = sheet;
              if (selections.length) {
                selections.forEach((sel) => {
                  const { bounds } = sel;
                  for (let i = bounds.top; i <= bounds.bottom; i++) {
                    if (sheet.cells[i] === void 0) continue;
                    for (let j = bounds.left; j <= bounds.right; j++) {
                      if (sheet.cells[i][j] === void 0) continue;
                      Object.values(FORMATTING_TYPE).forEach((key) => {
                        delete sheet.cells[i]?.[j]?.[key];
                      });
                      Object.values(STROKE_FORMATTING).forEach((key) => {
                        delete sheet.cells[i]?.[j]?.[key];
                      });
                    }
                  }
                });
              } else if (activeCell) {
                const { rowIndex, columnIndex } = activeCell;
                if (sheet.cells?.[rowIndex]?.[columnIndex]) {
                  Object.values(FORMATTING_TYPE).forEach((key) => {
                    delete sheet.cells[rowIndex]?.[columnIndex]?.[key];
                  });
                  Object.values(STROKE_FORMATTING).forEach((key) => {
                    delete sheet.cells[rowIndex]?.[columnIndex]?.[key];
                  });
                }
              }
            }
            break;
          }

          case ACTION_TYPE.RESIZE: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { axis, index, dimension } = action;
              if (axis === AXIS.X) {
                if (!("columnSizes" in sheet)) sheet.columnSizes = {};
                if (sheet.columnSizes) sheet.columnSizes[index] = dimension;
              } else {
                if (!("rowSizes" in sheet)) sheet.rowSizes = {};
                if (sheet.rowSizes) sheet.rowSizes[index] = dimension;
              }
            }
            break;
          }

          case ACTION_TYPE.MERGE_CELLS: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { selections, activeCell } = sheet;
              const { bounds } = selections.length
                ? selections[selections.length - 1]
                : { bounds: getCellBounds(activeCell) };
              if (!bounds) return;
              if (
                (bounds.top === bounds.bottom &&
                  bounds.left === bounds.right) ||
                bounds.top === 0 ||
                bounds.left === 0
              ) {
                return;
              }
              sheet.mergedCells = sheet.mergedCells ?? [];
              /* Check if cell is already merged */
              const index = sheet.mergedCells.findIndex((area) => {
                return (
                  area.left === bounds.left &&
                  area.right === bounds.right &&
                  area.top === bounds.top &&
                  area.bottom === bounds.bottom
                );
              });
              if (index !== -1) {
                sheet.mergedCells.splice(index, 1);
                return;
              }
              sheet.mergedCells.push(bounds);
            }
            break;
          }

          case ACTION_TYPE.FROZEN_ROW_CHANGE: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.frozenRows = action.count;
            }
            break;
          }

          case ACTION_TYPE.FROZEN_COLUMN_CHANGE: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.frozenColumns = action.count;
            }
            break;
          }

          case ACTION_TYPE.SET_BORDER: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { color, variant, borderStyle } = action;
              const { selections, cells, activeCell } = sheet;
              const sel = selections.length
                ? selections
                : selectionFromActiveCell(activeCell);
              const boundedCells = cellsInSelectionVariant(
                sel as SelectionArea[],
                variant,
                borderStyle,
                color,
                getCellBounds
              );
              for (const row in boundedCells) {
                for (const col in boundedCells[row]) {
                  if (variant === BORDER_VARIANT.NONE) {
                    // Delete all stroke formatting rules
                    Object.values(STROKE_FORMATTING).forEach((key) => {
                      delete sheet.cells[row]?.[col]?.[key];
                    });
                  } else {
                    const styles = boundedCells[row][col];
                    Object.keys(styles).forEach((key) => {
                      sheet.cells[row] = cells[row] ?? {};
                      sheet.cells[row][col] = cells[row][col] ?? {};
                      // @ts-ignore
                      sheet.cells[row][col][key] = styles[key];
                    });
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.UPDATE_SCROLL: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.scrollState = action.scrollState;
            }
            break;
          }

          case ACTION_TYPE.CHANGE_FILTER: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { columnIndex, filterViewIndex, filter } = action;
              if (filter === void 0) {
                delete sheet?.filterViews?.[filterViewIndex]?.filters?.[
                  columnIndex
                ];
              } else {
                sheet.filterViews = sheet.filterViews ?? [];
                if (!sheet.filterViews[filterViewIndex].filters) {
                  sheet.filterViews[filterViewIndex].filters = {
                    [columnIndex]: filter,
                  };
                } else {
                  (sheet.filterViews[filterViewIndex].filters as Filter)[
                    columnIndex
                  ] = filter;
                }
              }
            }
            break;
          }

          case ACTION_TYPE.DELETE_COLUMN: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { columnIndex } = activeCell;
              const { cells } = sheet;

              const changes: { [key: string]: any } = {};
              for (const row in cells) {
                const maxCol = Math.max(
                  ...Object.keys(cells[row] ?? {}).map(Number)
                );
                changes[row] = changes[row] ?? {};
                for (let i = columnIndex; i <= maxCol; i++) {
                  changes[row][i] = changes[row][i] ?? {};
                  changes[row][i] = cells[row]?.[i + 1];
                }
              }

              for (const row in changes) {
                for (const col in changes[row]) {
                  cells[row][col] = changes[row][col];
                }
              }
            }
            break;
          }

          case ACTION_TYPE.DELETE_ROW: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { rowIndex } = activeCell;
              const { cells } = sheet;
              const maxRow = Math.max(...Object.keys(cells).map(Number));
              const changes: { [key: string]: any } = {};
              for (let i = rowIndex; i <= maxRow; i++) {
                changes[i] = cells[i + 1];
              }
              for (const index in changes) {
                cells[index] = changes[index];
              }
            }
            break;
          }

          case ACTION_TYPE.INSERT_COLUMN: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { columnIndex } = activeCell;
              const { cells } = sheet;
              const changes: { [key: string]: any } = {};
              for (const row in cells) {
                const maxCol = Math.max(
                  ...Object.keys(cells[row] ?? {}).map(Number)
                );
                changes[row] = changes[row] ?? {};
                for (let i = columnIndex; i <= maxCol; i++) {
                  changes[row][i] = changes[row][i] ?? {};
                  changes[row][i + 1] = cells[row]?.[i];
                }
              }

              for (const row in changes) {
                for (const col in changes[row]) {
                  cells[row][col] = changes[row][col];
                }
              }
            }
            break;
          }

          case ACTION_TYPE.INSERT_ROW: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { rowIndex } = activeCell;
              const { cells } = sheet;
              const maxRow = Math.max(...Object.keys(cells).map(Number));
              const changes: { [key: string]: any } = {};
              for (let i = rowIndex; i <= maxRow; i++) {
                changes[i + 1] = cells[i];
              }
              for (const index in changes) {
                cells[index] = changes[index];
              }
              delete cells[rowIndex];
            }
            break;
          }

          case ACTION_TYPE.PASTE: {
            const sheet = draft.sheets.find(
              (sheet) => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { rows, activeCell } = action;
              const { rowIndex, columnIndex } = activeCell;
              const { cells } = sheet;
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const r = rowIndex + i;
                cells[r] = cells[r] ?? {};
                for (let j = 0; j < row.length; j++) {
                  const text = row[j];
                  const c = columnIndex + j;
                  cells[r][c] = cells[r][c] ?? {};
                  cells[r][c].text = text === null || isNull(text) ? "" : text;
                }
              }
            }
            break;
          }

          case ACTION_TYPE.REPLACE_SHEETS: {
            (draft.sheets as Sheet[]) = action.sheets;
            draft.selectedSheet = action.sheets[0].id;
            break;
          }

          case ACTION_TYPE.APPLY_PATCHES:
            return applyPatches(state, action.patches);
        }
      },
      (patches, inversePatches) => {
        const { undoable = true } = action;
        if (undoable === false) {
          return;
        }
        requestAnimationFrame(() =>
          onUpdate<Patch[]>({ patches, inversePatches })
        );
      }
    );
  };
};
