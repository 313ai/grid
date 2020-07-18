import React, { useCallback, useState, useRef, useEffect } from "react";
import { ViewPortProps, GridRef, CellInterface, ItemSizer } from "./../Grid";
import { debounce, AutoSizerCanvas, HiddenType, isNull } from "./../helpers";
import invariant from "tiny-invariant";

interface TextFormattingOptions {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export interface IProps {
  /**
   * Used to access grid functions
   */
  gridRef: React.MutableRefObject<GridRef | null>;
  /**
   * Value getter for a cell
   */
  getValue: (cell: CellInterface) => any;
  /**
   * Visible rows when the grid is first visible, Since we do not know how many rows  can fit
   */
  initialVisibleRows?: number;
  /**
   * Restrict column width by this number
   */
  minColumnWidth?: number;
  /**
   * Cell padding, used for width calculation
   */
  cellSpacing?: number;
  /**
   * Scroll timeout
   */
  timeout?: number;
  /**
   * Calculate width and resize the grid on scroll
   */
  resizeOnScroll?: boolean;
  /**
   * Font used to calculate width
   */
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  /**
   * Strategy used to calculate column width
   * lazy = visible rows
   * full = all rows
   *
   * columns are always lazy
   */
  resizeStrategy?: ResizeStrategy;
  /**
   * No of rows in teh grid
   */
  rowCount?: number;
  /**
   * Enable autoresize
   */
  autoResize?: boolean;
  /**
   * Map of index to size
   */
  columnSizes?: SizeType;
  /**
   * Hidden rows
   */
  isHiddenRow: HiddenType;
  /**
   * Hidden columns
   */
  isHiddenColumn: HiddenType;
  /**
   * Number of frozen rows
   */
  frozenRows?: number;
  /**
   * Current scaling factor
   */
  scale?: number;
}

export enum ResizeStrategy {
  "lazy" = "lazy",
  "full" = "full"
}

export interface AutoResizerResults {
  /**
   * Column width function consumed by the grid
   */
  columnWidth?: ItemSizer;
  /**
   * Callback when viewport is changed
   */
  onViewChange: (cells: ViewPortProps) => void;
  /**
   * Get column width based on resize strategy
   */
  getColumnWidth: (columnIndex: number, scale?: number) => number;
  /**
   * Text size getter
   */
  getTextMetrics: (text: string) => TextMetrics | undefined;
}

export type SizeType = {
  [key: number]: number;
};

/**
 * Auto sizer hook
 * @param param
 *
 * TODO
 * Dynamically resize columns after user has scrolled down/view port changed ?
 */
const useAutoSizer = ({
  gridRef,
  getValue,
  initialVisibleRows = 20,
  cellSpacing = 10,
  minColumnWidth = 60,
  timeout = 300,
  resizeStrategy = ResizeStrategy.lazy,
  rowCount,
  resizeOnScroll = true,
  fontFamily = "Arial",
  fontSize = 12,
  fontWeight = "normal",
  fontStyle = "italic",
  autoResize = true,
  columnSizes = {},
  frozenRows = 0,
  scale = 1,
  isHiddenRow,
  isHiddenColumn
}: IProps): AutoResizerResults => {
  invariant(
    !(resizeStrategy === ResizeStrategy.full && rowCount === void 0),
    "Row count should be specified if resize stragtegy is full"
  );

  const autoSizer = useRef(
    AutoSizerCanvas({ fontFamily, fontSize, fontWeight, fontStyle })
  );
  const [viewport, setViewport] = useState<ViewPortProps>({
    rowStartIndex: 0,
    rowStopIndex: 0,
    columnStartIndex: 0,
    columnStopIndex: 0,
    visibleRowStartIndex: 0,
    visibleRowStopIndex: 0,
    visibleColumnStartIndex: 0,
    visibleColumnStopIndex: 0
  });
  const isMounted = useRef(false);
  const getValueRef = useRef(getValue);
  const viewPortRef = useRef(viewport);
  const hiddenRowRef = useRef(isHiddenRow);
  const debounceResizer = useRef(
    debounce(
      ({ rowIndex, columnIndex }: CellInterface) =>
        gridRef.current &&
        gridRef.current.resetAfterIndices({ rowIndex, columnIndex }),
      timeout
    )
  );

  useEffect(() => {
    getValueRef.current = getValue;
    viewPortRef.current = viewport;
    hiddenRowRef.current = isHiddenRow;
  });

  useEffect(() => {
    isMounted.current = true;
  }, []);

  /* Update any styles, fonts if necessary */
  useEffect(() => {
    autoSizer.current.setFont({ fontFamily, fontSize, fontWeight, fontStyle });
  }, [fontFamily, fontSize, fontWeight, fontStyle]);

  const getTextMetrics = useCallback((text: string) => {
    return autoSizer.current.measureText(text);
  }, []);

  /**
   * Get width of a single cell
   */
  const getCellWidth = useCallback(
    (rowIndex: number, columnIndex: number) => {
      let width = 0;
      const cellValue =
        getValueRef.current({
          rowIndex,
          columnIndex
        }) ?? null;
      /* Check if its null */
      if (cellValue !== null) {
        const isCellConfig = typeof cellValue === "object";
        const text = isCellConfig ? cellValue.text : cellValue;
        if (!isNull(text)) {
          /* Reset fonts */
          autoSizer.current.reset();

          if (isCellConfig) {
            const isBold = cellValue.bold;
            autoSizer.current.setFont({
              fontWeight: isBold ? "bold" : "normal",
              fontSize: (cellValue.fontSize || fontSize) * scale,
              fontFamily: cellValue.fontFamily
            });
          }

          const metrics = autoSizer.current.measureText(text);
          if (metrics) {
            width =
              Math.ceil(metrics.width) +
              cellSpacing +
              (cellValue?.spacing ?? 0);
          }
        }
      }
      return width;
    },
    [scale]
  );

  /**
   * Calculate column width
   */
  const getColumnWidth = useCallback(
    (columnIndex: number) => {
      const { rowStartIndex, rowStopIndex } = viewPortRef.current;
      const visibleRows =
        resizeStrategy === ResizeStrategy.full
          ? (rowCount as number)
          : rowStopIndex || initialVisibleRows;
      let start = resizeStrategy === ResizeStrategy.full ? 0 : rowStartIndex;
      let maxWidth = minColumnWidth;

      /* Calculate for frozen rows */
      for (let i = 0; i < frozenRows; i++) {
        if (hiddenRowRef.current?.(i)) {
          continue;
        }
        const width = getCellWidth(i, columnIndex);
        if (width > maxWidth) maxWidth = width;
      }

      /* Loop through all visible rows */
      while (start < visibleRows) {
        if (hiddenRowRef.current?.(start)) {
          start++;
          continue;
        }
        const width = getCellWidth(start, columnIndex);
        if (width > maxWidth) maxWidth = width;
        start++;
      }

      return maxWidth;
    },
    [viewport, initialVisibleRows, frozenRows, scale]
  );

  const handleViewChange = useCallback(
    (cells: ViewPortProps) => {
      /* Update viewport cells */
      setViewport(cells);

      /* Check if viewport has changed */
      if (
        resizeStrategy === ResizeStrategy.full ||
        !resizeOnScroll ||
        (cells.rowStartIndex === viewport.rowStartIndex &&
          cells.columnStartIndex === viewport.columnStartIndex)
      )
        return;
      if (gridRef.current) {
        /* During first mount, column width is calculated. Do not re-calculate */
        if (!isMounted.current) return;
        debounceResizer.current({
          rowIndex: cells.rowStartIndex,
          columnIndex: cells.columnStartIndex
        });
      }
    },
    [resizeOnScroll, viewport, resizeStrategy]
  );

  return {
    ...(autoResize ? { columnWidth: getColumnWidth } : undefined),
    getColumnWidth,
    // getRowHeight,
    onViewChange: handleViewChange,
    getTextMetrics
  };
};

export default useAutoSizer;
