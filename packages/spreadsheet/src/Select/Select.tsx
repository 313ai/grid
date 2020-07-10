import React from "react";
import { IconButton, Tooltip } from "./../styled";
import Downshift from "downshift";
import { Box, useTheme, useColorMode } from "@chakra-ui/core";
import { DARK_MODE_COLOR, DARK_MODE_COLOR_LIGHT } from "../constants";
import { KeyCodes } from "@rowsncolumns/grid/dist/types";

export interface SelectProps {
  showInput?: boolean;
  options: Option[];
  value?: Option;
  onChange?: (value: Option | null) => void;
  format?: (value: string) => any;
  inputWidth?: number;
  enableInput?: boolean;
}
export interface Option {
  value: string | number;
  label: string | number;
}

const Select: React.FC<SelectProps> = props => {
  const {
    options,
    value,
    onChange,
    format,
    inputWidth = 44,
    enableInput = true
  } = props;
  const theme = useTheme();
  const { colorMode } = useColorMode();
  const isLight = colorMode === "light";
  const inputBorderColor = isLight
    ? theme.colors.gray[300]
    : theme.colors.gray[600];
  const inputBgColor = isLight ? theme.colors.white : DARK_MODE_COLOR;
  const inputColor = isLight ? DARK_MODE_COLOR : theme.colors.white;
  const dropdownBgColor = isLight ? theme.colors.white : theme.colors.gray[700];
  return (
    <Downshift
      selectedItem={value}
      onChange={sel => onChange?.(sel)}
      itemToString={item => (item ? item.value.toString() : "")}
    >
      {({
        getInputProps,
        getMenuProps,
        getRootProps,
        isOpen,
        getItemProps,
        inputValue,
        highlightedIndex,
        selectedItem,
        selectItem,
        closeMenu,
        getToggleButtonProps,
        openMenu
      }) => {
        const inputProps = getInputProps();
        return (
          <Box position="relative" {...getRootProps()}>
            <Box display="flex" alignItems="center">
              {enableInput ? (
                <input
                  style={{
                    width: inputWidth,
                    height: 24,
                    paddingLeft: 4,
                    paddingRight: 2,
                    borderColor: inputBorderColor,
                    background: inputBgColor,
                    color: inputColor,
                    borderStyle: "solid",
                    borderWidth: 1,
                    fontSize: 12
                  }}
                  {...inputProps}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (inputProps && inputProps.onKeyDown)
                      inputProps.onKeyDown(e);
                    if (
                      e.which === KeyCodes.Enter &&
                      highlightedIndex === null
                    ) {
                      const value = format?.(e.currentTarget.value);
                      selectItem?.({ value, label: value });
                      closeMenu();
                    }
                  }}
                  onFocus={() => openMenu()}
                />
              ) : (
                <Tooltip
                  hasArrow
                  aria-label={inputValue || ""}
                  label={inputValue || ""}
                  placement="bottom-start"
                >
                  <Box
                    cursor="pointer"
                    pl={2}
                    pr={2}
                    title={inputValue}
                    {...getToggleButtonProps()}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    fontSize={12}
                    width={inputWidth}
                  >
                    {inputValue}
                  </Box>
                </Tooltip>
              )}
              <IconButton
                color={inputColor}
                height={5}
                minWidth={5}
                aria-label="Open"
                icon="chevron-down"
                size="sm"
                fontSize={16}
                {...getToggleButtonProps()}
              />
            </Box>
            <Box
              background={dropdownBgColor}
              shadow="md"
              position="absolute"
              top="100%"
              zIndex={1}
              borderRadius={5}
              {...getMenuProps()}
              pb={1}
              pt={1}
            >
              {isOpen &&
                options.map((item, index) => {
                  const { label, value } = item;
                  return (
                    <Box
                      fontSize={12}
                      padding={2}
                      pl={3}
                      pr={3}
                      whiteSpace="nowrap"
                      {...getItemProps({
                        key: value,
                        index,
                        item,
                        style: {
                          cursor: "pointer",
                          backgroundColor:
                            highlightedIndex === index
                              ? isLight
                                ? theme.colors.gray[100]
                                : "rgba(255,255,255,0.06)"
                              : dropdownBgColor,
                          fontWeight: selectedItem === item ? "bold" : "normal"
                        }
                      })}
                    >
                      {label}
                    </Box>
                  );
                })}
            </Box>
          </Box>
        );
      }}
    </Downshift>
  );
};

export default Select;
