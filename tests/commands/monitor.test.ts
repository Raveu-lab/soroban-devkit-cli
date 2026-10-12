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

  it("accepts surrounding whitespace", () => {
    expect(parsePositiveInt("  5000  ", "--interval")).toBe(5000);
  });

  // parseInt stops at the first character it can't read and returns the
  // prefix it managed to parse, so each of these used to be accepted as a
  // plausible-looking wrong number rather than rejected. "1,000" becoming
  // 1 is the one that bites: a one-millisecond poll against a public RPC.
  it.each([
    ["10e3", "scientific notation, meant 10000, parsed as 10"],
    ["5.9", "a decimal, silently truncated"],
    ["1,000", "a thousands separator, parsed as 1"],
    ["5000abc", "a typo, silently accepted as 5000"],
    ["3 000", "an internal space, parsed as 3"],
  ])("rejects %s (%s)", (raw) => {
    expect(() => parsePositiveInt(raw, "--interval")).toThrow(
      `--interval must be a positive integer, got "${raw}"`
    );
  });

  it("rejects a value too large to represent exactly", () => {
    // Number("99999999999999999999") is 1e20 — past Number.MAX_SAFE_INTEGER,
    // so the value silently stops being the one the user typed.
    expect(() => parsePositiveInt("99999999999999999999", "--start-ledger")).toThrow(
      /--start-ledger must be a positive integer/
    );
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

  it("throws for a fractional config.pollingIntervalMs, agreeing with sdev config validate", () => {
    // validateConfig() rejects 3000.5, but monitor only checked isFinite
    // and > 0, so the two disagreed about whether the same file was valid.
    expect(() => resolvePollingInterval(undefined, 3000.5)).toThrow(
      "sdev.config.json's pollingIntervalMs must be a positive integer, got 3000.5"
    );
  });
});
