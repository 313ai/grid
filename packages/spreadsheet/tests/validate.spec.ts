import validate from "./../src/validation";
import { CellConfig } from "../src/Spreadsheet";

describe("validation", () => {
  it("exists", () => {
    expect(validate).toBeDefined();
  });

  it("can validate lists", async () => {
    const sheet = "a";
    const value = "A";
    const cell = {
      rowIndex: 1,
      columnIndex: 1,
    };
    const cellConfig: CellConfig = {
      dataValidation: {
        type: "list",
        formulae: ["A", "B", "C"],
      },
    };
    const valid = await validate(value, sheet, cell, cellConfig);
    expect(valid).toBeTruthy();
  });

  it("can validate booleans", async () => {
    const sheet = "a";
    const value = "A";
    const cell = {
      rowIndex: 1,
      columnIndex: 1,
    };
    const cellConfig: CellConfig = {
      dataValidation: {
        type: "boolean",
        formulae: ["A", "B"],
      },
    };
    const valid = await validate(value, sheet, cell, cellConfig);
    expect(valid).toBeTruthy();
  });

  it("returns true if validation is not defined", async () => {
    const valid = await validate("b", "B", null, undefined);
    expect(valid).toBeTruthy();
  });
});
