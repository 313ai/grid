import React, { useCallback, useRef, useEffect, memo, forwardRef } from "react";
import { ResizeObserver } from "@juggle/resize-observer";
import useMeasure from "react-use-measure";
import Grid from "./../Grid";
import { Flex, useColorMode } from "@chakra-ui/core";
import { BottomPanel, ThemeType } from "./../styled";
import Tabs from "./../Tabs";
import {
  SpreadSheetProps,
  Sheet,
  Cells,
  SizeType,
  SheetID,
} from "../Spreadsheet";
import {
  CellInterface,
  SelectionArea,
  ScrollCoords,
  isNull,
  FilterDefinition,
} from "@rowsncolumns/grid";
import { WorkbookGridRef } from "../Grid/Grid";
import { AXIS } from "../types";
import {
  DARK_MODE_COLOR_LIGHT,
  EMPTY_ARRAY,
  DEFAULT_COLUMN_COUNT,
  DEFAULT_ROW_COUNT,
} from "../constants";
import { current } from "immer";

export interface WorkbookProps
  extends Omit<SpreadSheetProps, "onChange" | "StatusBar"> {
  currentSheet: Sheet;
  theme: ThemeType;
  sheets: Sheet[];
  selectedSheet: React.ReactText;
  onFill?: (
    id: SheetID,
    activeCell: CellInterface,
    currentSelection: SelectionArea | null,
    selections: SelectionArea[]
  ) => void;
  onDelete?: (
    id: SheetID,
    activeCell: CellInterface,
    selections: SelectionArea[]
  ) => void;
  onChangeSelectedSheet: (id: SheetID) => void;
  onNewSheet?: () => void;
  onSheetChange?: (id: SheetID, props: any) => void;
  onScroll?: (id: SheetID, scrollState: ScrollCoords) => void;
  onChangeSheetName?: (id: SheetID, value: string) => void;
  onDeleteSheet?: (id: SheetID) => void;
  onDuplicateSheet?: (id: SheetID) => void;
  onResize?: (
    id: SheetID,
    axis: AXIS,
    index: number,
    dimension: number
  ) => void;
  onActiveCellValueChange: (value: string) => void;
  rowSizes?: SizeType;
  columnSizes?: SizeType;
  onKeyDown?: (id: SheetID, e: React.KeyboardEvent<HTMLDivElement>) => void;
  hiddenRows?: number[];
  hiddenColumns?: number[];
  onChange?: (id: SheetID, changes: Cells) => void;
  onPaste?: (
    id: SheetID,
    rows: (string | null)[][],
    activeCell: CellInterface | null
  ) => void;
  onCut?: (id: SheetID, selection: SelectionArea) => void;
  onInsertRow?: (
    id: SheetID,
    cell: CellInterface | null,
    selections: SelectionArea[]
  ) => void;
  onDeleteRow?: (
    id: SheetID,
    cell: CellInterface | null,
    selections: SelectionArea[]
  ) => void;
  onInsertColumn?: (
    id: SheetID,
    cell: CellInterface | null,
    selections: SelectionArea[]
  ) => void;
  onDeleteColumn?: (
    id: SheetID,
    cell: CellInterface | null,
    selections: SelectionArea[]
  ) => void;
  onChangeFilter: (
    id: SheetID,
    index: number,
    columnIndex: number,
    filter?: FilterDefinition
  ) => void;
  StatusBar: React.ReactType;
  scale?: number;
}

export type WorkBookRefAttribute = {
  ref?: React.Ref<WorkbookGridRef>;
};

/**
 * Workbook displays a list of sheets
 * @param props
 */
const Workbook: React.FC<WorkbookProps & WorkBookRefAttribute> = memo(
  forwardRef((props, forwardedRef) => {
    const {
      selectedSheet,
      onChangeSelectedSheet,
      sheets,
      onChange,
      minColumnWidth,
      minRowHeight,
      CellRenderer,
      HeaderCellRenderer,
      onNewSheet,
      onSheetChange,
      theme,
      onChangeSheetName,
      onDeleteSheet,
      onDuplicateSheet,
      currentSheet,
      onActiveCellChange,
      onActiveCellValueChange,
      onFill,
      onDelete,
      formatter,
      onResize,
      onScroll,
      onKeyDown,
      onPaste,
      onCut,
      onInsertRow,
      onInsertColumn,
      onDeleteColumn,
      onDeleteRow,
      CellEditor,
      selectionPolicy,
      onSelectionChange,
      selectionMode,
      onChangeFilter,
      showTabStrip,
      isTabEditable,
      allowNewSheet,
      StatusBar,
      showStatusBar,
      scale = 1,
      ContextMenu,
      snap,
    } = props;

    const { colorMode } = useColorMode();
    const isLight = colorMode === "light";
    const [containerRef, { width, height }] = useMeasure({
      polyfill: ResizeObserver,
    });

    const {
      cells,
      activeCell,
      selections,
      scrollState,
      columnSizes = {},
      rowSizes = {},
      mergedCells,
      frozenRows,
      frozenColumns,
      hiddenColumns = EMPTY_ARRAY,
      hiddenRows = EMPTY_ARRAY,
      showGridLines = true,
      filterViews,
      rowCount = DEFAULT_ROW_COUNT,
      columnCount = DEFAULT_COLUMN_COUNT,
    } = currentSheet;

    /* Current sheet ref */
    const selectedSheetRef = useRef(selectedSheet);
    useEffect(() => {
      selectedSheetRef.current = selectedSheet;
    });
    const handleChange = useCallback((changes: Cells) => {
      if (isNull(selectedSheetRef.current)) return;
      onChange?.(selectedSheetRef.current, changes);
    }, []);
    const handleFill = useCallback(
      (
        cell: CellInterface,
        currentSelection: SelectionArea | null,
        selections: SelectionArea[]
      ) => {
        onFill?.(selectedSheetRef.current, cell, currentSelection, selections);
      },
      []
    );
    const handleSheetChange = useCallback((args: any) => {
      if (isNull(selectedSheetRef.current)) return;
      onSheetChange?.(selectedSheetRef.current, args);
    }, []);
    const handleScroll = useCallback((scrollState: ScrollCoords) => {
      if (isNull(selectedSheetRef.current)) return;
      onScroll?.(selectedSheetRef.current, scrollState);
    }, []);
    const handleDelete = useCallback(
      (activeCell: CellInterface, selections: SelectionArea[]) => {
        if (isNull(selectedSheetRef.current)) return;
        onDelete?.(selectedSheetRef.current, activeCell, selections);
      },
      []
    );

    const handleResize = useCallback(
      (axis: AXIS, index: number, dimension: number) => {
        if (isNull(selectedSheetRef.current)) return;
        onResize?.(selectedSheetRef.current, axis, index, dimension);
      },
      []
    );

    const handlePaste = useCallback((rows, activeCell) => {
      onPaste?.(selectedSheetRef.current, rows, activeCell);
    }, []);

    const handleCut = useCallback((selection: SelectionArea) => {
      onCut?.(selectedSheetRef.current, selection);
    }, []);

    const handleInsertRow = useCallback(
      (cell: CellInterface | null, selections: SelectionArea[]) => {
        onInsertRow?.(selectedSheetRef.current, cell, selections);
      },
      []
    );

    const handleInsertColumn = useCallback(
      (cell: CellInterface | null, selections: SelectionArea[]) => {
        onInsertColumn?.(selectedSheetRef.current, cell, selections);
      },
      []
    );

    const handleDeleteRow = useCallback(
      (cell: CellInterface | null, selections: SelectionArea[]) => {
        onDeleteRow?.(selectedSheetRef.current, cell, selections);
      },
      []
    );

    const handleDeleteColumn = useCallback(
      (cell: CellInterface | null, selections: SelectionArea[]) => {
        onDeleteColumn?.(selectedSheetRef.current, cell, selections);
      },
      []
    );

    const handleActiveCellChange = useCallback(
      (cell: CellInterface | null, value: string | undefined) => {
        if (isNull(selectedSheetRef.current)) return;
        onActiveCellChange?.(selectedSheetRef.current, cell, value);
      },
      []
    );

    const handleSelectionChange = useCallback(
      (cell: CellInterface | null, selections: SelectionArea[]) => {
        if (isNull(selectedSheetRef.current)) return;
        onSelectionChange?.(selectedSheetRef.current, cell, selections);
      },
      []
    );

    const handleChangeFilter = useCallback(
      (filterIndex: number, columnIndex: number, filter: FilterDefinition) => {
        if (isNull(selectedSheetRef.current)) return;
        onChangeFilter?.(
          selectedSheetRef.current,
          filterIndex,
          columnIndex,
          filter
        );
      },
      []
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isNull(selectedSheetRef.current)) return;
        onKeyDown?.(selectedSheetRef.current, e);
      },
      [currentSheet]
    );

    return (
      <>
        <Flex
          flex={1}
          ref={containerRef}
          background={isLight ? "white" : DARK_MODE_COLOR_LIGHT}
        >
          <Grid
            scale={scale}
            isLightMode={isLight}
            ref={forwardedRef}
            onResize={handleResize}
            onDelete={handleDelete}
            onActiveCellValueChange={onActiveCellValueChange}
            onActiveCellChange={handleActiveCellChange}
            onSelectionChange={handleSelectionChange}
            selectedSheet={selectedSheet}
            activeCell={activeCell}
            selections={selections}
            scrollState={scrollState}
            width={width}
            height={height}
            cells={cells}
            onChange={handleChange}
            onFill={handleFill}
            minColumnWidth={minColumnWidth}
            minRowHeight={minRowHeight}
            CellRenderer={CellRenderer}
            HeaderCellRenderer={HeaderCellRenderer}
            onSheetChange={handleSheetChange}
            onScroll={handleScroll}
            formatter={formatter}
            columnSizes={columnSizes}
            rowSizes={rowSizes}
            mergedCells={mergedCells}
            frozenRows={frozenRows}
            frozenColumns={frozenColumns}
            onKeyDown={handleKeyDown}
            hiddenRows={hiddenRows}
            hiddenColumns={hiddenColumns}
            onPaste={handlePaste}
            onCut={handleCut}
            onInsertRow={handleInsertRow}
            onInsertColumn={handleInsertColumn}
            onDeleteRow={handleDeleteRow}
            onDeleteColumn={handleDeleteColumn}
            theme={theme}
            rowCount={rowCount}
            columnCount={columnCount}
            showGridLines={showGridLines}
            CellEditor={CellEditor}
            selectionPolicy={selectionPolicy}
            selectionMode={selectionMode}
            filterViews={filterViews}
            onChangeFilter={handleChangeFilter}
            ContextMenu={ContextMenu}
            snap={snap}
          />
        </Flex>
        {showTabStrip || showStatusBar ? (
          <Flex>
            <BottomPanel
              background={isLight ? "#f1f3f4" : theme.colors.gray[800]}
              borderTopColor={isLight ? "#e8eaed" : theme?.colors.gray[600]}
              borderTopWidth={1}
              borderTopStyle="solid"
            >
              {showTabStrip && (
                <Tabs
                  sheets={sheets}
                  selectedSheet={selectedSheet}
                  onNewSheet={onNewSheet}
                  onSelect={onChangeSelectedSheet}
                  onChangeSheetName={onChangeSheetName}
                  onDeleteSheet={onDeleteSheet}
                  onDuplicateSheet={onDuplicateSheet}
                  isTabEditable={isTabEditable}
                  allowNewSheet={allowNewSheet}
                />
              )}
              {showStatusBar && (
                <StatusBar selections={selections} cells={cells} />
              )}
            </BottomPanel>
          </Flex>
        ) : null}
      </>
    );
  })
);

export default Workbook;
