import { formatValidationResult } from "../../src/commands/config";

describe("formatValidationResult", () => {
  it("lists every error, one per line", () => {
    const output = formatValidationResult([
      'network: "mainet" is not a valid network',
      "pollingIntervalMs: must be a positive integer, got -1",
    ]);
    expect(output).toContain('network: "mainet" is not a valid network');
    expect(output).toContain("pollingIntervalMs: must be a positive integer, got -1");
    expect(output.split("\n")).toHaveLength(2);
  });

  it("returns a single-line result for one error", () => {
    const output = formatValidationResult(["contracts: must be an array of strings"]);
    expect(output).toContain("contracts: must be an array of strings");
  });
});
