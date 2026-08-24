import { parseArgs } from "../../src/commands/simulate";

describe("parseArgs", () => {
  it("parses a JSON array of mixed types", () => {
    expect(parseArgs('["GABC...", 1000, true]')).toEqual(["GABC...", 1000, true]);
  });

  it("parses an empty array (the default)", () => {
    expect(parseArgs("[]")).toEqual([]);
  });

  it("throws a descriptive error for invalid JSON", () => {
    expect(() => parseArgs("not json")).toThrow("--args must be valid JSON");
  });

  it("throws for a JSON value that is not an array", () => {
    expect(() => parseArgs('{"a": 1}')).toThrow("--args must be a JSON array");
  });

  it("throws for a JSON string that is not an array", () => {
    expect(() => parseArgs('"hello"')).toThrow("--args must be a JSON array");
  });
});
