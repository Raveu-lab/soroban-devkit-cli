import { parsePositiveInt, resolvePollingInterval } from "../../src/commands/monitor";

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

describe("resolvePollingInterval", () => {
  it("returns undefined when neither --interval nor config.pollingIntervalMs is set, so core's adaptive polling kicks in", () => {
    expect(resolvePollingInterval(undefined, undefined)).toBeUndefined();
  });

  it("parses an explicit --interval value", () => {
    expect(resolvePollingInterval("3000", undefined)).toBe(3000);
  });

  it("throws a descriptive error for an invalid explicit --interval value", () => {
    expect(() => resolvePollingInterval("abc", undefined)).toThrow(
      '--interval must be a positive integer, got "abc"'
    );
  });

  it("falls back to sdev.config.json's pollingIntervalMs when --interval isn't passed", () => {
    // Documented in README.md's Configuration File example as a working
    // field, right alongside network/contracts/aliases/rpcHeaders — but it
    // was never actually read here.
    expect(resolvePollingInterval(undefined, 5000)).toBe(5000);
  });

  it("--interval wins over config.pollingIntervalMs when both are set", () => {
    expect(resolvePollingInterval("2000", 5000)).toBe(2000);
  });

  it("throws a descriptive error for an invalid config.pollingIntervalMs", () => {
    expect(() => resolvePollingInterval(undefined, -5)).toThrow(
      "sdev.config.json's pollingIntervalMs must be a positive integer, got -5"
    );
  });

  it("throws for a non-integer config.pollingIntervalMs", () => {
    expect(() => resolvePollingInterval(undefined, NaN)).toThrow(
      "sdev.config.json's pollingIntervalMs must be a positive integer, got NaN"
    );
  });
});
