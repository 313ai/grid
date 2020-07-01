import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo
} from "react";
import {
  CellInterface,
  ScrollCoords,
  CellPosition,
  GridRef,
  SelectionArea
} from "../Grid";
import { KeyCodes, Direction } from "./../types";
import {
  findNextCellWithinBounds,
  AutoSizerCanvas,
  isEqualCells
} from "../helpers";

export interface UseEditableOptions {
  /**
   * Inject custom editors based on a cell
   */
  getEditor?: (cell: CellInterface | null) => React.ElementType;
  /**
   * Access grid methods
   */
  gridRef: React.MutableRefObject<GridRef | null>;
  /**
   * Value getter
   */
  getValue: (cell: CellInterface) => any;
  /**
   * Callback when user cancels editing
   */
  onCancel?: (e?: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /**
   * Callback when user changes a value in editor
   */
  onChange?: (value: string, activeCell: CellInterface) => void;
  /**
   * Callback when user submits a value. Use this to update state
   */
  onSubmit?: (
    value: string,
    activeCell: CellInterface,
    nextActiveCell?: CellInterface | null
  ) => void;
  /**
   * Callback when user selects an area and presses delete key
   */
  onDelete?: (activeCell: CellInterface, selections: SelectionArea[]) => void;
  /**
   * Currently selected cells, injected by useSelection
   */
  selections: SelectionArea[];
  /**
   * Active selected cell. This can change, if the user is in formula mode
   */
  activeCell: CellInterface | null;
  /**
   * Callback fired before editing. Can be used to prevent editing. Do not use it, Can be removed in next release.
   */
  canEdit?: (coords: CellInterface) => boolean;
  frozenColumns?: number;
  frozenRows?: number;
}

export interface EditableResults {
  /**
   * Editor component that can be injected
   */
  editorComponent: React.ReactNode;
  /**
   * Double click listener, activates the grid
   */
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  /**
   * OnScroll listener to align the editor
   */
  onScroll?: (props: ScrollCoords) => void;
  /**
   * Key down listeners
   */
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  /**
   * Get next focusable cell based on current activeCell and direction user is moving
   */
  nextFocusableCell: (
    currentCell: CellInterface,
    direction: Direction
  ) => CellInterface | null;
  /**
   * Is editing in progress
   */
  isEditInProgress: boolean;
  /**
   * Currently editing cell
   */
  editingCell: CellInterface | null;
  /**
   * Make a cell editable
   */
  makeEditable: (cell: CellInterface, value?: string) => void;
  /**
   * Set editable value imperatively
   */
  setValue: (value: string, activeCell: CellInterface) => void;
  /**
   * Hide editor
   */
  hideEditor: () => void;
  /**
   * Show editor
   */
  showEditor: () => void;
  /**
   * Bind to mousedown event
   */
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  /**
   * Imperatively trigger submit
   */
  submitEditor: (
    value: string,
    activeCell: CellInterface,
    nextActiveCell?: CellInterface | null
  ) => void;
  /**
   * Cancels an edit
   */
  cancelEditor: () => void;
}

export interface EditorProps extends CellInterface {
  /**
   * Currently selected bounds, useful for fomulas
   */
  selections: SelectionArea[];
  /**
   * Initial value of the cell
   */
  value?: string;
  /**
   * Callback when a value has changed.
   */
  onChange: (value: string, activeCell: CellInterface) => void;
  /**
   * Callback to submit the value back to data store
   */
  onSubmit?: (
    value: string,
    activeCell: CellInterface,
    nextActiveCell?: CellInterface | null
  ) => void;
  /**
   * On Cancel callbacks. Hides the editor
   */
  onCancel?: (e?: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /**
   * Cell position, x, y, width and height
   */
  position: CellPosition;
  /**
   * Currently active cell, based on selection
   */
  activeCell: CellInterface;
  /**
   * Currrently edited cell
   */
  cell: CellInterface;
  /**
   * Scroll position of the grid
   */
  scrollPosition: ScrollCoords;
  /**
   * Next cell that should receive focus
   */
  nextFocusableCell: (
    activeCell: CellInterface,
    direction?: Direction
  ) => CellInterface | null;
  /* Autofocus on the editor */
  autoFocus?: boolean;
}

/**
 * Default cell editor
 * @param props
 */
const DefaultEditor: React.FC<EditorProps> = props => {
  const {
    rowIndex,
    columnIndex,
    onChange,
    onSubmit,
    onCancel,
    position,
    cell,
    nextFocusableCell,
    value = "",
    activeCell,
    autoFocus = true,
    ...rest
  } = props;
  const borderWidth = 2;
  const padding = 10; /* 2 + 1 + 1 + 2 + 2 */
  const textSizer = useRef(AutoSizerCanvas());
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { x = 0, y = 0, width = 0, height = 0 } = position;
  const getWidth = useCallback(
    text => {
      const textWidth = textSizer.current.measureText(text)?.width || 0;
      return Math.max(textWidth + padding, width + borderWidth / 2);
    },
    [width]
  );
  useEffect(() => {
    setInputWidth(getWidth(value));
  }, [value]);
  const [inputWidth, setInputWidth] = useState(() => getWidth(value));
  useEffect(() => {
    if (!inputRef.current) return;
    if (autoFocus) inputRef.current.focus();
    /* Focus cursor at the end */
    inputRef.current.selectionStart = value.length;
  }, []);
  const inputHeight = height;
  return (
    <div
      style={{
        top: y - borderWidth / 2,
        left: x,
        position: "absolute",
        width: inputWidth,
        height: inputHeight + borderWidth,
        padding: borderWidth,
        boxShadow: "0 2px 6px 2px rgba(60,64,67,.15)",
        border: "2px #1a73e8 solid",
        background: "white"
      }}
    >
      <textarea
        rows={1}
        cols={1}
        ref={inputRef}
        value={value}
        style={{
          font: "12px Arial",
          lineHeight: 1.2,
          width: "100%",
          height: "100%",
          padding: "0 1px",
          margin: 0,
          boxSizing: "border-box",
          borderWidth: 0,
          outline: "none",
          resize: "none",
          overflow: "hidden",
          verticalAlign: "top",
          background: "transparent"
        }}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange(e.target.value, cell);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (!inputRef.current) return;
          const isShiftKey = e.nativeEvent.shiftKey;
          const value = inputRef.current.value;

          // Enter key
          if (e.which === KeyCodes.Enter) {
            onSubmit &&
              onSubmit(
                value,
                cell,
                nextFocusableCell(
                  cell,
                  isShiftKey ? Direction.Up : Direction.Down
                )
              );
          }

          if (e.which === KeyCodes.Escape) {
            onCancel && onCancel(e);
          }

          if (e.which === KeyCodes.Tab) {
            // e.preventDefault();
            onSubmit &&
              onSubmit(
                value,
                cell,
                nextFocusableCell(
                  cell,
                  isShiftKey ? Direction.Left : Direction.Right
                )
              );
          }
        }}
        {...rest}
      />
    </div>
  );
};

const getDefaultEditor = (cell: CellInterface | null) => DefaultEditor;
const defaultCanEdit = (cell: CellInterface) => true;
/**
 * Hook to make grid editable
 * @param param
 */
const useEditable = ({
  getEditor = getDefaultEditor,
  gridRef,
  getValue,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  selections = [],
  activeCell,
  canEdit = defaultCanEdit,
  frozenRows = 0,
  frozenColumns = 0
}: UseEditableOptions): EditableResults => {
  const [isEditorShown, setShowEditor] = useState<boolean>(false);
  const [value, setValue] = useState<string>("");
  const [position, setPosition] = useState<CellPosition>({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const currentActiveCellRef = useRef<CellInterface | null>(null);
  const initialActiveCell = useRef<CellInterface | null>();
  const [scrollPosition, setScrollPosition] = useState<ScrollCoords>({
    scrollLeft: 0,
    scrollTop: 0
  });
  const [autoFocus, setAutoFocus] = useState<boolean>(true);
  const isDirtyRef = useRef<boolean>(false);
  const currentValueRef = useRef(value);
  const showEditor = useCallback(() => setShowEditor(true), []);
  const hideEditor = useCallback(() => {
    setShowEditor(false);
    currentActiveCellRef.current = null;
  }, []);
  const focusGrid = useCallback(() => {
    requestAnimationFrame(() => gridRef.current && gridRef.current.focus());
  }, []);

  /* Keep ref in sync */
  useEffect(() => {
    currentValueRef.current = value;
  });

  /**
   * Make a cell editable
   * @param coords
   * @param initialValue
   */
  const makeEditable = (
    coords: CellInterface,
    initialValue?: string,
    autoFocus: boolean = true
  ) => {
    if (!gridRef.current) return;
    /* Get actual coords for merged cells */
    coords = gridRef.current.getActualCellCoords(coords);
    /* Check if its the same cell */
    if (isEqualCells(coords, currentActiveCellRef.current)) return;
    /* Call on before edit */
    if (canEdit(coords)) {
      currentActiveCellRef.current = coords;
      const pos = gridRef.current.getCellOffsetFromCoords(coords);
      const scrollPosition = gridRef.current.getScrollPosition();
      const value = initialValue || getValue(coords) || "";
      setValue(value);
      setAutoFocus(autoFocus);
      setPosition(getCellPosition(pos, scrollPosition));
      showEditor();
      if (value) handleChange(value, coords);
    }
  };

  /**
   * Get current cell position based on scroll position
   * @param position
   * @param scrollPosition
   */
  const getCellPosition = (
    position: CellPosition,
    scrollPosition: ScrollCoords
  ) => {
    if (!currentActiveCellRef.current) return { x: 0, y: 0 };
    const isFrozenRow = currentActiveCellRef.current?.rowIndex < frozenRows;
    const isFrozenColumn =
      currentActiveCellRef.current?.columnIndex < frozenColumns;
    return {
      ...position,
      x:
        (position.x as number) -
        (isFrozenColumn ? 0 : scrollPosition.scrollLeft),
      y: (position.y as number) - (isFrozenRow ? 0 : scrollPosition.scrollTop)
    };
  };

  /* Activate edit mode */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!gridRef.current) return;
      const coords = gridRef.current.getCellCoordsFromOffset(
        e.nativeEvent.clientX,
        e.nativeEvent.clientY
      );
      if (!coords) return;
      const { rowIndex, columnIndex } = coords;
      makeEditable({ rowIndex, columnIndex });
    },
    [getValue]
  );

  const isSelectionKey = useCallback((keyCode: number) => {
    return [
      KeyCodes.Right,
      KeyCodes.Left,
      KeyCodes.Up,
      KeyCodes.Down,
      KeyCodes.Meta,
      KeyCodes.Escape,
      KeyCodes.Tab,
      KeyCodes.Home,
      KeyCodes.End,
      KeyCodes.CapsLock
    ].includes(keyCode);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const keyCode = e.nativeEvent.keyCode;
      if (keyCode === KeyCodes.Tab && !initialActiveCell.current) {
        initialActiveCell.current = activeCell;
      }
      if (
        isSelectionKey(keyCode) ||
        e.nativeEvent.ctrlKey ||
        (e.nativeEvent.shiftKey &&
          (e.nativeEvent.key === "Shift" ||
            e.nativeEvent.which === KeyCodes.SPACE)) ||
        e.nativeEvent.metaKey ||
        e.nativeEvent.which === KeyCodes.ALT
      )
        return;

      /* If user has not made any selection yet */
      if (!activeCell) return;

      const { rowIndex, columnIndex } = activeCell;

      if (keyCode === KeyCodes.Delete || keyCode === KeyCodes.BackSpace) {
        // TODO: onbefore  delete
        onDelete && onDelete(activeCell, selections);
        return;
      }

      const initialValue =
        keyCode === KeyCodes.Enter // Enter key
          ? undefined
          : e.nativeEvent.key;
      makeEditable({ rowIndex, columnIndex }, initialValue);
    },
    [selections, activeCell]
  );

  /**
   * Get next focusable cell
   * Respects selection bounds
   */
  const nextFocusableCell = useCallback(
    (
      currentCell: CellInterface,
      direction: Direction = Direction.Right
    ): CellInterface | null => {
      /* Next immediate cell */
      const bounds = gridRef.current?.getCellBounds(currentCell);
      if (!bounds) return null;
      let nextActiveCell = currentCell;
      switch (direction) {
        case Direction.Right:
          nextActiveCell = {
            rowIndex: bounds.top,
            columnIndex: bounds.right + 1
          };
          break;
        case Direction.Up:
          nextActiveCell = {
            rowIndex: bounds.top - 1,
            columnIndex: bounds.left
          };
          break;

        case Direction.Left:
          nextActiveCell = {
            rowIndex: bounds.top,
            columnIndex: bounds.left - 1
          };
          break;

        default:
          // Down
          nextActiveCell = {
            rowIndex:
              (initialActiveCell.current?.rowIndex ?? bounds.bottom) + 1,
            columnIndex: initialActiveCell.current?.columnIndex ?? bounds.left
          };
          break;
      }
      if (direction === Direction.Right && !initialActiveCell.current) {
        initialActiveCell.current = currentCell;
      }

      if (direction === Direction.Down) {
        /* Move to the next row + cell */
        initialActiveCell.current = undefined;
      }

      /* If user has selected some cells and active cell is within this selection */
      if (selections.length && currentCell && gridRef.current) {
        const { bounds } = selections[selections.length - 1];
        const activeCellBounds = gridRef.current.getCellBounds(currentCell);
        const nextCell = findNextCellWithinBounds(
          activeCellBounds,
          bounds,
          direction
        );
        if (nextCell) nextActiveCell = nextCell;
      }
      return nextActiveCell;
    },
    [selections]
  );

  /* Save the value */
  const handleSubmit = useCallback(
    (
      value: string,
      activeCell: CellInterface,
      nextActiveCell?: CellInterface | null
    ) => {
      /**
       * Hide the editor first, so that we can handle onBlur events
       * 1. Editor hides -> Submit
       * 2. If user clicks outside the grid, onBlur is called, if there is a activeCell, we do another submit
       */
      hideEditor();

      /* Save the new value */
      onSubmit && onSubmit(value, activeCell, nextActiveCell);

      /* Keep the focus */
      focusGrid();
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (currentActiveCellRef.current) {
      if (isDirtyRef.current) {
        handleSubmit(currentValueRef.current, currentActiveCellRef.current);
      } else {
        handleCancel();
      }
    }
    initialActiveCell.current = undefined;
  }, []);

  const handleChange = useCallback(
    (newValue: string, activeCell) => {
      if (!currentActiveCellRef.current) return;
      /* Check if the value has changed. Used to conditionally submit if editor is not in focus */
      isDirtyRef.current = newValue !== value;
      setValue(newValue);
      onChange && onChange(newValue, activeCell);
    },
    [value]
  );

  /* When the input is blurred out */
  const handleCancel = useCallback(() => {
    hideEditor();
    onCancel && onCancel();
    /* Keep the focus back in the grid */
    focusGrid();
  }, []);

  const handleScroll = useCallback((scrollPos: ScrollCoords) => {
    if (!currentActiveCellRef.current) return;
    setScrollPosition(scrollPos);
  }, []);

  /* Editor */
  const editingCell = currentActiveCellRef.current;
  const Editor = useMemo(() => {
    return editingCell
      ? getEditor(editingCell) || getDefaultEditor(editingCell)
      : null;
  }, [editingCell]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (currentActiveCellRef.current) {
      /* Keep the focus */
      focusGrid();
    }
  }, []);

  const editorComponent =
    isEditorShown && Editor ? (
      <Editor
        /* This is the cell that is currently being edited */
        cell={editingCell}
        activeCell={activeCell}
        autoFocus={autoFocus}
        value={value}
        selections={selections}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        position={position}
        scrollPosition={scrollPosition}
        nextFocusableCell={nextFocusableCell}
        onBlur={handleBlur}
      />
    ) : null;

  return {
    editorComponent,
    onDoubleClick: handleDoubleClick,
    onKeyDown: handleKeyDown,
    nextFocusableCell,
    isEditInProgress: !!editingCell,
    editingCell,
    makeEditable,
    setValue: handleChange,
    hideEditor,
    showEditor,
    submitEditor: handleSubmit,
    cancelEditor: handleCancel,
    onMouseDown: handleMouseDown,
    onScroll: handleScroll
  };
};

export default useEditable;
