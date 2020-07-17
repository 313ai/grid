import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
  useReducer,
} from "react";
import Toolbar from "./Toolbar";
import Formulabar from "./Formulabar";
import Workbook from "./Workbook";
import { theme, ThemeProvider, ColorModeProvider, Flex } from "@chakra-ui/core";
import { Global, css } from "@emotion/core";
import {
  CellInterface,
  SelectionArea,
  ScrollCoords,
  AreaProps,
  FilterView,
  FilterDefinition,
  useUndo,
  SelectionPolicy,
} from "@rowsncolumns/grid";
import {
  createNewSheet,
  uuid,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_ROW_HEIGHT,
  SYSTEM_FONT,
  format as defaultFormat,
  FONT_FAMILIES,
} from "./constants";
import {
  FORMATTING_TYPE,
  CellFormatting,
  AXIS,
  BORDER_VARIANT,
  BORDER_STYLE,
  FormatType,
  SELECTION_MODE,
  HORIZONTAL_ALIGNMENT,
} from "./types";
import { WorkbookGridRef } from "./Grid/Grid";
import { KeyCodes, Direction } from "@rowsncolumns/grid/dist/types";
import invariant from "tiny-invariant";
import { ThemeType } from "./styled";
import Editor, { CustomEditorProps } from "./Editor/Editor";
import StatusBarComponent from "./StatusBar";
import { StatusBarProps } from "./StatusBar/StatusBar";
import useFonts from "./hooks/useFonts";
import { createStateReducer, ACTION_TYPE } from "./state";
import { Patch } from "immer";
import { ContextMenuComponentProps } from "./ContextMenu/ContextMenu";
import ContextMenuComponent from "./ContextMenu";

export interface SpreadSheetProps {
  /**
   * Minimum column width of the grid
   */
  minColumnWidth?: number;
  /**
   * Minimum row height of the grid
   */
  minRowHeight?: number;
  /**
   * Total number of rows to render
   */
  rowCount?: number;
  /**
   * Total number of columns to render
   */
  columnCount?: number;
  /**
   * Customize cell rendering
   */
  CellRenderer?: React.ReactType;
  /**
   * Custom header cell
   */
  HeaderCellRenderer?: React.ReactType;
  /**
   * Array of sheets to render
   */
  sheets?: Sheet[];
  /**
   * Uncontrolled sheets
   */
  initialSheets?: Sheet[];
  /**
   * Active  sheet on the workbook
   */
  activeSheet?: string;
  /**
   * Hide rows
   */
  hiddenRows?: number[];
  /**
   * Hide columns
   */
  hiddenColumns?: number[];
  /**
   * Callback fired when cells are modified
   */
  onChangeCells?: (id: SheetID, changes: Cells) => void;
  /**
   * Get the new selected sheet
   */
  onChangeSelectedSheet?: (id: SheetID) => void;
  /**
   * Listen to changes to all the sheets
   */
  onChange?: (sheets: Sheet[]) => void;
  /**
   * Show formula bar
   */
  showFormulabar?: boolean;
  /**
   * Show hide toolbar
   */
  showToolbar?: boolean;
  /**
   * Conditionally format cell text
   */
  formatter?: FormatType;
  /**
   * Enabled or disable dark mode
   */
  enableDarkMode?: true;
  /**
   * Font family
   */
  fontFamily?: string;
  /**
   * Min Height of the grid
   */
  minHeight?: number;
  /**
   * Custom Cell Editor
   */
  CellEditor?: React.ReactType<CustomEditorProps>;
  /**
   * Allow user to customize single, multiple or range selection
   */
  selectionPolicy?: SelectionPolicy;
  /**
   * Callback when active cell changes
   */
  onActiveCellChange?: (
    id: SheetID,
    cell: CellInterface | null,
    value?: string
  ) => void;
  /**
   * Callback fired when selection changes
   */
  onSelectionChange?: (
    id: SheetID,
    activeCell: CellInterface | null,
    selections: SelectionArea[]
  ) => void;
  /**
   * Select mode
   */
  selectionMode?: SELECTION_MODE;
  /**
   * Show or hide tab strip
   */
  showTabStrip?: boolean;
  /**
   * Make tab editable
   */
  isTabEditable?: boolean;
  /**
   * Allow user to add new sheet
   */
  allowNewSheet?: boolean;
  /**
   * Show or hide status bar
   */
  showStatusBar?: boolean;
  /**
   * Status bar component
   */
  StatusBar?: React.FC<StatusBarProps>;
  /**
   * Context menu component
   */
  ContextMenu?: React.ReactType<ContextMenuComponentProps>;
  /**
   * Scale
   */
  initialScale?: number;
  /**
   * When scale changes
   */
  onScaleChange?: (scale: number) => void;
  /**
   * Web font loader config
   */
  fontLoaderConfig?: WebFont.Config;
  /**
   * Visible font families
   */
  fontList?: string[];
  // TODO
  // onMouseOver?: (event: React.MouseEvent<HTMLDivElement>, cell: CellInterface) => void;
  // onMouseDown?: (event: React.MouseEvent<HTMLDivElement>, cell: CellInterface) => void;
  // onMouseUp?: (event: React.MouseEvent<HTMLDivElement>, cell: CellInterface) => void;
  // onClick?: (event: React.MouseEvent<HTMLDivElement>, cell: CellInterface) => void;
}

export interface Sheet {
  id: SheetID;
  name: string;
  cells: Cells;
  activeCell: CellInterface | null;
  selections: SelectionArea[];
  scrollState?: ScrollCoords;
  columnSizes?: SizeType;
  rowSizes?: SizeType;
  mergedCells?: AreaProps[];
  frozenRows?: number;
  frozenColumns?: number;
  hiddenRows?: number[];
  hiddenColumns?: number[];
  showGridLines?: boolean;
  filterViews?: FilterView[];
  rowCount?: number;
  columnCount?: number;
}

export type SheetID = React.ReactText;

export type SizeType = {
  [key: number]: number;
};

export type Cells = Record<string, Cell>;
export type Cell = Record<string, CellConfig>;
export interface CellConfig extends CellFormatting {
  text?: string | number;
  result?: string | number | any;
}

const defaultActiveSheet = uuid();
export const defaultSheets: Sheet[] = [
  {
    id: defaultActiveSheet,
    name: "Sheet1",
    rowCount: 20000,
    columnCount: 20000,
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

export type RefAttributeSheetGrid = {
  ref?: React.Ref<SheetGridRef>;
};

export type SheetGridRef = {
  grid: WorkbookGridRef | null;
};

export interface PatchInterface {
  patches: Patch;
  inversePatches: Patch;
}

/**
 * Spreadsheet component
 * TODO
 * 1. Undo/redo
 * @param props
 */
const Spreadsheet: React.FC<SpreadSheetProps & RefAttributeSheetGrid> = memo(
  forwardRef((props, forwardedRef) => {
    const {
      sheets: initialSheets = defaultSheets,
      showFormulabar = true,
      minColumnWidth = DEFAULT_COLUMN_WIDTH,
      minRowHeight = DEFAULT_ROW_HEIGHT,
      CellRenderer,
      HeaderCellRenderer,
      activeSheet,
      onChangeSelectedSheet,
      onChange,
      onChangeCells,
      showToolbar = true,
      formatter = defaultFormat,
      enableDarkMode = true,
      fontFamily = SYSTEM_FONT,
      minHeight = 400,
      CellEditor = Editor,
      onActiveCellChange,
      onSelectionChange,
      selectionMode,
      showTabStrip = true,
      isTabEditable = true,
      allowNewSheet = true,
      showStatusBar = true,
      StatusBar = StatusBarComponent,
      ContextMenu = ContextMenuComponent,
      initialScale = 1,
      onScaleChange,
      fontLoaderConfig,
      fontList = FONT_FAMILIES,
      selectionPolicy,
    } = props;

    /* Last active cells: for undo, redo */
    const lastActiveCellRef = useRef<CellInterface | null | undefined>(null);

    /**
     * Some grid side-effects during undo/redo
     */
    const beforeUndoRedo = useCallback((patches: Patch[]) => {
      const hasFilterViews = patches.some((item) =>
        item.path.includes("filterViews")
      );
      if (hasFilterViews) {
        currentGrid.current?.resetAfterIndices?.({ rowIndex: 0 }, false);
      }
    }, []);

    /**
     * Undo hook
     */
    const {
      add: addToUndo,
      canRedo,
      canUndo,
      undo,
      redo,
      onKeyDown: onUndoKeyDown,
    } = useUndo<Patch[]>({
      onUndo: (patches) => {
        /* Side-effects */
        beforeUndoRedo(patches);

        dispatch({
          type: ACTION_TYPE.APPLY_PATCHES,
          patches,
          undoable: false,
        });

        if (lastActiveCellRef.current) {
          currentGrid.current?.setActiveCell(lastActiveCellRef.current);
        }
      },
      onRedo: (patches) => {
        /* Side-effects */
        beforeUndoRedo(patches);

        dispatch({
          type: ACTION_TYPE.APPLY_PATCHES,
          patches,
          undoable: false,
        });

        const activeCellPatch = patches.find((item: Patch) =>
          item.path.includes("currentActiveCell")
        );
        if (activeCellPatch) {
          currentGrid.current?.setActiveCell(activeCellPatch.value);
        }
      },
    });
    const getCellBounds = useCallback((cell: CellInterface | null) => {
      if (!cell) return undefined;
      return currentGrid.current?.getCellBounds?.(cell);
    }, []);

    const [state, dispatch] = useReducer(
      useCallback(
        createStateReducer({ onUpdate: addToUndo, getCellBounds }),
        []
      ),
      {
        sheets: initialSheets,
        selectedSheet:
          activeSheet === void 0
            ? initialSheets.length
              ? initialSheets[0].id
              : null
            : activeSheet,
      }
    );

    const { selectedSheet, sheets, currentActiveCell } = state;
    const [scale, setScale] = useState(initialScale);
    const selectedSheetRef = useRef(selectedSheet);
    const currentGrid = useRef<WorkbookGridRef>(null);
    const [formulaInput, setFormulaInput] = useState("");

    /* Last */
    useEffect(() => {
      lastActiveCellRef.current = currentActiveCell;
    }, [currentActiveCell]);

    /* Selected sheet */
    const setSelectedSheet = useCallback(
      (id: React.ReactText) => {
        if (id === selectedSheet) return;
        dispatch({
          type: ACTION_TYPE.SELECT_SHEET,
          id,
        });
      },
      [selectedSheet]
    );

    invariant(
      selectedSheet !== null,
      "Exception, selectedSheet is empty, Please specify a selected sheet using `selectedSheet` prop"
    );

    /* Fonts */
    const { isFontActive } = useFonts(fontLoaderConfig);

    /* Callback fired when fonts are loaded */
    useEffect(() => {
      if (isFontActive) {
        currentGrid.current?.resetAfterIndices?.({
          rowIndex: 0,
          columnIndex: 0,
        });
      }
    }, [isFontActive]);

    /* Callback fired when scale changes */
    useEffect(() => {
      onScaleChange?.(scale);
    }, [scale]);

    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          grid: currentGrid.current,
        };
      },
      []
    );

    /* Callback when sheets is changed */
    useEffect(() => {
      onChange?.(sheets);
    }, [sheets]);

    /* Change selected sheet */
    useEffect(() => {
      onChangeSelectedSheet?.(selectedSheet);
    }, [selectedSheet]);

    useEffect(() => {
      selectedSheetRef.current = selectedSheet;
    });

    /* Listen to sheet change */
    useEffect(() => {
      /* If its the same sheets - Skip */
      if (sheets === initialSheets) {
        return;
      }

      dispatch({
        type: ACTION_TYPE.REPLACE_SHEETS,
        sheets: initialSheets,
      });
    }, [initialSheets]);

    /**
     * Handle add new sheet
     */
    const handleNewSheet = useCallback(() => {
      const count = sheets.length;
      const newSheet = createNewSheet({ count: count + 1 });
      dispatch({
        type: ACTION_TYPE.NEW_SHEET,
        sheet: newSheet,
      });

      /* Focus on the new grid */
      currentGrid.current?.focus();
    }, [sheets, selectedSheet]);

    /**
     * Cell changes on user input
     */
    const handleChange = useCallback((id: SheetID, changes: Cells) => {
      dispatch({
        type: ACTION_TYPE.CHANGE_SHEET_CELL,
        changes,
        id,
      });

      onChangeCells?.(id, changes);
    }, []);

    const handleSheetAttributesChange = useCallback(
      (
        id: SheetID,
        {
          activeCell,
          selections,
        }: { activeCell: CellInterface | null; selections: SelectionArea[] }
      ) => {
        dispatch({
          type: ACTION_TYPE.SHEET_SELECTION_CHANGE,
          id,
          activeCell,
          selections,
          undoable: false,
        });
      },
      []
    );

    const handleChangeSheetName = useCallback((id: SheetID, name: string) => {
      dispatch({
        type: ACTION_TYPE.CHANGE_SHEET_NAME,
        id,
        name,
      });
    }, []);

    const handleDeleteSheet = useCallback(
      (id: SheetID) => {
        if (sheets.length === 1) return;

        dispatch({
          type: ACTION_TYPE.DELETE_SHEET,
          id,
        });

        /* Focus on the new grid */
        currentGrid.current?.focus();
      },
      [sheets, selectedSheet]
    );

    const handleDuplicateSheet = useCallback(
      (id: SheetID) => {
        const newSheetId = uuid();
        const index = sheets.findIndex((sheet) => sheet.id === id);
        if (index === -1) return;
        const newSheet = {
          ...sheets[index],
          id: newSheetId,
          name: `Copy of ${currentSheet.name}`,
        };

        dispatch({
          type: ACTION_TYPE.NEW_SHEET,
          sheet: newSheet,
        });
      },
      [sheets, selectedSheet]
    );

    /**
     * Change formatting to auto
     */
    const handleFormattingChangeAuto = useCallback(() => {
      const sheet = sheets.find((sheet) => sheet.id === selectedSheet);
      if (sheet) {
        const { selections, activeCell } = sheet;
        const sel = selections.length
          ? selections
          : activeCell
          ? [
              {
                bounds: currentGrid.current?.getCellBounds?.(
                  activeCell
                ) as AreaProps,
              },
            ]
          : [];
        dispatch({
          type: ACTION_TYPE.FORMATTING_CHANGE_AUTO,
          id: selectedSheet,
          selections: sel,
          activeCell,
        });
      }
    }, [selectedSheet, sheets]);

    /**
     * Change formatting to plain
     */
    const handleFormattingChangePlain = useCallback(() => {
      const sheet = sheets.find((sheet) => sheet.id === selectedSheet);
      if (sheet) {
        const { selections, activeCell } = sheet;
        const sel = selections.length
          ? selections
          : activeCell
          ? [
              {
                bounds: currentGrid.current?.getCellBounds?.(
                  activeCell
                ) as AreaProps,
              },
            ]
          : [];
        dispatch({
          type: ACTION_TYPE.FORMATTING_CHANGE_PLAIN,
          id: selectedSheet,
          selections: sel,
          activeCell,
        });
      }
    }, [selectedSheet, sheets]);

    /**
     * When cell or selection formatting change
     */
    const handleFormattingChange = useCallback(
      (key, value) => {
        const sheet = sheets.find((sheet) => sheet.id === selectedSheet);
        if (sheet) {
          const { selections, activeCell } = sheet;
          const sel = selections.length
            ? selections
            : activeCell
            ? [
                {
                  bounds: currentGrid.current?.getCellBounds?.(
                    activeCell
                  ) as AreaProps,
                },
              ]
            : [];
          dispatch({
            type: ACTION_TYPE.FORMATTING_CHANGE,
            id: selectedSheet,
            selections: sel,
            activeCell,
            key,
            value,
          });
        }
      },
      [selectedSheet, sheets]
    );

    /**
     * Pass active cell config back to toolbars
     */
    const currentSheet = useMemo(() => {
      return sheets.find((sheet) => sheet.id === selectedSheet) as Sheet;
    }, [sheets, selectedSheet]);

    const [activeCellConfig, activeCell] = useMemo(() => {
      const { activeCell, cells } = currentSheet || {};
      const activeCellConfig = activeCell
        ? cells?.[activeCell.rowIndex]?.[activeCell.columnIndex]
        : null;
      return [activeCellConfig, activeCell];
    }, [currentSheet]);

    const handleActiveCellChange = useCallback(
      (id: SheetID, cell: CellInterface | null, value) => {
        if (!cell) return;
        setFormulaInput(value || "");
        onActiveCellChange?.(id, cell);
      },
      []
    );

    const handleActiveCellValueChange = useCallback((value) => {
      setFormulaInput(value);
    }, []);

    /**
     * Formula bar focus event
     */
    const handleFormulabarFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        const input = e.target;
        if (activeCell) {
          currentGrid.current?.makeEditable(activeCell, input.value, false);
          requestAnimationFrame(() => input?.focus());
        }
      },
      [activeCell]
    );

    /**
     * When formula input changes
     */
    const handleFormulabarChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeCell) return;
        const value = e.target.value;
        setFormulaInput(value);
        /* Row and column headers */
        if (activeCell?.rowIndex === 0 || activeCell?.columnIndex === 0) {
          return;
        }
        currentGrid.current?.setEditorValue(value, activeCell);
      },
      [activeCell, selectedSheet]
    );

    /**
     * Imperatively submits the editor
     * @param value
     * @param activeCell
     */
    const submitEditor = (
      value: string,
      activeCell: CellInterface,
      direction: Direction = Direction.Down
    ) => {
      const nextActiveCell = currentGrid.current?.getNextFocusableCell(
        activeCell,
        direction
      );
      currentGrid.current?.submitEditor(value, activeCell, nextActiveCell);
    };
    /**
     * When user presses Enter on formula input
     */
    const handleFormulabarKeydown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!activeCell) return;
        /* Row and column headers */
        if (activeCell?.rowIndex === 0 || activeCell?.columnIndex === 0) {
          return;
        }

        if (e.which === KeyCodes.Enter) {
          submitEditor(formulaInput, activeCell);
        }
        if (e.which === KeyCodes.Escape) {
          currentGrid.current?.cancelEditor();
          setFormulaInput(activeCellConfig?.text?.toString() || "");
        }
        if (e.which === KeyCodes.Tab) {
          submitEditor(formulaInput, activeCell, Direction.Right);
          e.preventDefault();
        }
      },
      [activeCell, formulaInput, activeCellConfig]
    );

    /**
     * Handle fill
     */
    const handleFill = useCallback(
      (
        id: SheetID,
        activeCell: CellInterface,
        fillSelection: SelectionArea | null
      ) => {
        if (!fillSelection) return;
        dispatch({
          type: ACTION_TYPE.UPDATE_FILL,
          id,
          activeCell,
          fillSelection,
        });

        /* Focus on the new grid */
        currentGrid.current?.focus();
      },
      [sheets]
    );

    /**
     * Delete cell values
     */
    const handleDelete = useCallback(
      (id: SheetID, activeCell: CellInterface, selections: SelectionArea[]) => {
        dispatch({
          type: ACTION_TYPE.DELETE_CELLS,
          id,
          activeCell,
          selections,
        });
        setFormulaInput("");
      },
      []
    );

    const handleClearFormatting = useCallback(() => {
      dispatch({
        type: ACTION_TYPE.CLEAR_FORMATTING,
        id: selectedSheet,
      });
    }, [sheets, selectedSheet]);

    const handleResize = useCallback(
      (id: SheetID, axis: AXIS, index: number, dimension: number) => {
        dispatch({
          type: ACTION_TYPE.RESIZE,
          id,
          index,
          dimension,
          axis,
          undoable: false,
        });

        axis === AXIS.X
          ? currentGrid.current?.resizeColumns?.([index])
          : currentGrid.current?.resizeRows?.([index]);
      },
      []
    );

    /**
     * Handle toggle cell merges
     */
    const handleMergeCells = useCallback(() => {
      dispatch({
        type: ACTION_TYPE.MERGE_CELLS,
        id: selectedSheet,
      });
    }, [selectedSheet, sheets]);

    const handleFrozenRowChange = useCallback(
      (count) => {
        dispatch({
          type: ACTION_TYPE.FROZEN_ROW_CHANGE,
          id: selectedSheet,
          count,
        });
      },
      [selectedSheet]
    );

    const handleFrozenColumnChange = useCallback(
      (count) => {
        dispatch({
          type: ACTION_TYPE.FROZEN_COLUMN_CHANGE,
          id: selectedSheet,
          count,
        });
      },
      [selectedSheet]
    );

    const handleBorderChange = useCallback(
      (
        color: string | undefined,
        borderStyle: BORDER_STYLE,
        variant?: BORDER_VARIANT
      ) => {
        dispatch({
          type: ACTION_TYPE.SET_BORDER,
          id: selectedSheet,
          color,
          borderStyle,
          variant,
        });
      },
      [selectedSheet]
    );

    /**
     * Handle sheet scroll
     */
    const handleScroll = useCallback(
      (id: SheetID, scrollState: ScrollCoords) => {
        dispatch({
          type: ACTION_TYPE.UPDATE_SCROLL,
          id,
          scrollState,
        });
      },
      []
    );

    /**.
     * On Paste
     * TODO: Preserve formatting
     */
    const handlePaste = useCallback(
      (id: SheetID, rows, activeCell: CellInterface | null) => {
        if (!activeCell) return;
        const { rowIndex, columnIndex } = activeCell;
        const endRowIndex = Math.max(rowIndex, rowIndex + rows.length - 1);
        const endColumnIndex = Math.max(
          columnIndex,
          columnIndex + (rows.length && rows[0].length - 1)
        );

        dispatch({
          type: ACTION_TYPE.PASTE,
          id,
          rows,
          activeCell,
        });

        /* Should select */
        if (rowIndex === endRowIndex && columnIndex === endColumnIndex) return;

        currentGrid.current?.setSelections([
          {
            bounds: {
              top: rowIndex,
              left: columnIndex,
              bottom: endRowIndex,
              right: endColumnIndex,
            },
          },
        ]);
      },
      []
    );

    /**
     * Handle cut event
     */
    const handleCut = useCallback((id: SheetID, selection: SelectionArea) => {
      dispatch({
        type: ACTION_TYPE.REMOVE_CELLS,
        id,
        activeCell: null,
        selections: [selection],
      });
    }, []);

    /**
     * Insert new row
     */
    const handleInsertRow = useCallback(
      (id: SheetID, activeCell: CellInterface | null) => {
        if (activeCell === null) return;
        dispatch({
          type: ACTION_TYPE.INSERT_ROW,
          id,
          activeCell,
        });
      },
      []
    );

    /**
     * Insert new row
     */
    const handleInsertColumn = useCallback(
      (id: SheetID, activeCell: CellInterface | null) => {
        if (activeCell === null) return;
        dispatch({
          type: ACTION_TYPE.INSERT_COLUMN,
          id,
          activeCell,
        });
      },
      []
    );

    /* Handle delete row */
    const handleDeleteRow = useCallback(
      (id: SheetID, activeCell: CellInterface | null) => {
        if (activeCell === null) return;
        dispatch({
          type: ACTION_TYPE.DELETE_ROW,
          id,
          activeCell,
        });
      },
      []
    );

    /* Handle delete row */
    const handleDeleteColumn = useCallback(
      (id: SheetID, activeCell: CellInterface | null) => {
        if (activeCell === null) return;
        dispatch({
          type: ACTION_TYPE.DELETE_COLUMN,
          id,
          activeCell,
        });
      },
      []
    );

    /**
     * Handle keydown events
     */
    const handleKeyDown = useCallback(
      (id: SheetID, event: React.KeyboardEvent<HTMLDivElement>) => {
        const isMeta = event.metaKey || event.ctrlKey;
        const isShift = event.shiftKey;
        const keyCode = event.which;
        switch (keyCode) {
          case KeyCodes.KEY_B:
            if (!isMeta) return;
            handleFormattingChange(
              FORMATTING_TYPE.BOLD,
              !activeCellConfig?.bold
            );
            break;

          case KeyCodes.KEY_I:
            if (!isMeta) return;
            handleFormattingChange(
              FORMATTING_TYPE.ITALIC,
              !activeCellConfig?.italic
            );
            break;

          case KeyCodes.KEY_U:
            if (!isMeta) return;
            handleFormattingChange(
              FORMATTING_TYPE.UNDERLINE,
              !activeCellConfig?.underline
            );
            break;

          case KeyCodes.KEY_X:
            if (!isMeta || !isShift) return;
            handleFormattingChange(
              FORMATTING_TYPE.STRIKE,
              !activeCellConfig?.strike
            );
            break;

          case KeyCodes.BACK_SLASH:
            if (!isMeta) return;
            handleClearFormatting();
            event?.preventDefault();
            break;

          case KeyCodes.KEY_L:
          case KeyCodes.KEY_E:
          case KeyCodes.KEY_R:
            if (!isMeta || !isShift) return;
            const align =
              keyCode === KeyCodes.KEY_L
                ? HORIZONTAL_ALIGNMENT.LEFT
                : keyCode === KeyCodes.KEY_E
                ? HORIZONTAL_ALIGNMENT.CENTER
                : HORIZONTAL_ALIGNMENT.RIGHT;
            handleFormattingChange(FORMATTING_TYPE.HORIZONTAL_ALIGN, align);
            event?.preventDefault();
            break;
        }

        /* Pass it on to undo hook */
        onUndoKeyDown?.(event);
      },
      [activeCellConfig, currentSheet]
    );

    /**
     * Update filters views
     */
    const handleChangeFilter = useCallback(
      (
        id: SheetID,
        filterViewIndex: number,
        columnIndex: number,
        filter?: FilterDefinition
      ) => {
        /* Todo, find rowIndex based on filterViewIndex */
        currentGrid.current?.resetAfterIndices?.({ rowIndex: 0 }, false);

        dispatch({
          type: ACTION_TYPE.CHANGE_FILTER,
          id,
          filterViewIndex,
          columnIndex,
          filter,
        });
      },
      []
    );

    /**
     * Callback when scale changes
     */
    const handleScaleChange = useCallback(
      (value) => {
        /* Update grid dimensions */
        currentGrid.current?.resetAfterIndices?.(
          { rowIndex: 0, columnIndex: 0 },
          false
        );
        /* Set scale */
        setScale(value);
      },
      [selectedSheet]
    );

    return (
      <>
        <Global
          styles={css`
            .rowsncolumns-spreadsheet {
              font-family: ${fontFamily};
            }
            .rowsncolumns-grid-container:focus {
              outline: none;
            }
          `}
        />

        <Flex
          flexDirection="column"
          flex={1}
          minWidth={0}
          minHeight={minHeight}
          className="rowsncolumns-spreadsheet"
        >
          {showToolbar ? (
            <Toolbar
              wrap={activeCellConfig?.wrap}
              datatype={activeCellConfig?.datatype}
              plaintext={activeCellConfig?.plaintext}
              format={activeCellConfig?.format}
              fontSize={activeCellConfig?.fontSize}
              fontFamily={activeCellConfig?.fontFamily}
              fill={activeCellConfig?.fill}
              bold={activeCellConfig?.bold}
              italic={activeCellConfig?.italic}
              strike={activeCellConfig?.strike}
              underline={activeCellConfig?.underline}
              color={activeCellConfig?.color}
              percent={activeCellConfig?.percent}
              currency={activeCellConfig?.currency}
              verticalAlign={activeCellConfig?.verticalAlign}
              horizontalAlign={activeCellConfig?.horizontalAlign}
              onFormattingChange={handleFormattingChange}
              onFormattingChangeAuto={handleFormattingChangeAuto}
              onFormattingChangePlain={handleFormattingChangePlain}
              onClearFormatting={handleClearFormatting}
              onMergeCells={handleMergeCells}
              frozenRows={currentSheet.frozenRows}
              frozenColumns={currentSheet.frozenColumns}
              onFrozenRowChange={handleFrozenRowChange}
              onFrozenColumnChange={handleFrozenColumnChange}
              onBorderChange={handleBorderChange}
              onRedo={redo}
              onUndo={undo}
              canRedo={canRedo}
              canUndo={canUndo}
              enableDarkMode={enableDarkMode}
              scale={scale}
              onScaleChange={handleScaleChange}
              fontList={fontList}
            />
          ) : null}
          {showFormulabar ? (
            <Formulabar
              value={formulaInput}
              onChange={handleFormulabarChange}
              onKeyDown={handleFormulabarKeydown}
              onFocus={handleFormulabarFocus}
            />
          ) : null}
          <Workbook
            scale={scale}
            StatusBar={StatusBar}
            showTabStrip={showTabStrip}
            isTabEditable={isTabEditable}
            allowNewSheet={allowNewSheet}
            onResize={handleResize}
            formatter={formatter}
            ref={currentGrid}
            onDelete={handleDelete}
            onFill={handleFill}
            onActiveCellValueChange={handleActiveCellValueChange}
            onActiveCellChange={handleActiveCellChange}
            currentSheet={currentSheet}
            selectedSheet={selectedSheet}
            onChangeSelectedSheet={setSelectedSheet}
            onNewSheet={handleNewSheet}
            theme={theme}
            sheets={sheets}
            onChange={handleChange}
            onSheetChange={handleSheetAttributesChange}
            minColumnWidth={minColumnWidth}
            minRowHeight={minRowHeight}
            CellRenderer={CellRenderer}
            HeaderCellRenderer={HeaderCellRenderer}
            onChangeSheetName={handleChangeSheetName}
            onDeleteSheet={handleDeleteSheet}
            onDuplicateSheet={handleDuplicateSheet}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCut={handleCut}
            onInsertRow={handleInsertRow}
            onInsertColumn={handleInsertColumn}
            onDeleteRow={handleDeleteRow}
            onDeleteColumn={handleDeleteColumn}
            CellEditor={CellEditor}
            onSelectionChange={onSelectionChange}
            selectionMode={selectionMode}
            onChangeFilter={handleChangeFilter}
            showStatusBar={showStatusBar}
            selectionPolicy={selectionPolicy}
            ContextMenu={ContextMenu}
          />
        </Flex>
      </>
    );
  })
);

export interface SpreadSheetPropsWithTheme extends SpreadSheetProps {
  theme?: ThemeType;
  initialColorMode?: "light" | "dark";
}
const ThemeWrapper: React.FC<
  SpreadSheetPropsWithTheme & RefAttributeSheetGrid
> = forwardRef((props, forwardedRef) => {
  const { theme: defaultTheme = theme, initialColorMode, ...rest } = props;
  return (
    <ThemeProvider theme={defaultTheme}>
      <ColorModeProvider value={initialColorMode}>
        <Spreadsheet {...rest} ref={forwardedRef} />
      </ColorModeProvider>
    </ThemeProvider>
  );
});

export default ThemeWrapper;
