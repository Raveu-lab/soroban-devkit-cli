import { parsePositiveInt } from "../../src/commands/monitor";

describe("parsePositiveInt", () => {
  it("parses a valid positive integer string", () => {
    expect(parsePositiveInt("5000", "--interval")).toBe(5000);
  });

  it("throws a descriptive error for a non-numeric value", () => {
    expect(() => parsePositiveInt("abc", "--interval")).toThrow(
      '--interval must be a positive integer, got "abc"'
    );
  });

  it("throws for zero", () => {
    expect(() => parsePositiveInt("0", "--interval")).toThrow(
      '--interval must be a positive integer, got "0"'
    );
  });

  it("throws for a negative number", () => {
    expect(() => parsePositiveInt("-100", "--start-ledger")).toThrow(
      '--start-ledger must be a positive integer, got "-100"'
    );
  });

  it("throws for an empty string", () => {
    expect(() => parsePositiveInt("", "--interval")).toThrow(
      '--interval must be a positive integer, got ""'
    );
  });

  it("truncates a decimal to an integer, matching parseInt's own behavior", () => {
    expect(parsePositiveInt("5000.7", "--interval")).toBe(5000);
  });
});
