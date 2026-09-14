import { successMessage } from "../../src/commands/bindings";

describe("successMessage", () => {
  it("includes the exact output path passed to it", () => {
    expect(successMessage("/tmp/generated/CATEST_bindings.ts")).toContain(
      "/tmp/generated/CATEST_bindings.ts"
    );
  });

  it("reports the path as given, not a re-derived one — the command reads it from BindingGenerator.outputPath() instead of recomputing the filename convention itself", () => {
    const path = "./generated/CBZOOLSC_bindings.ts";
    expect(successMessage(path)).toBe(`Bindings written to ${path}`);
  });
});
