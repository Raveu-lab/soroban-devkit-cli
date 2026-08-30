import { getCompletionScript, SUPPORTED_SHELLS } from "../../src/utils/completion";

describe("getCompletionScript", () => {
  it("supports bash, zsh, and fish", () => {
    expect(SUPPORTED_SHELLS).toEqual(["bash", "zsh", "fish"]);
  });

  it.each(SUPPORTED_SHELLS)("generates a non-empty script for %s", (shell) => {
    const script = getCompletionScript(shell);
    expect(script.length).toBeGreaterThan(0);
  });

  it("bash script lists every top-level command", () => {
    const script = getCompletionScript("bash");
    for (const cmd of ["simulate", "decode", "monitor", "bindings"]) {
      expect(script).toContain(cmd);
    }
  });

  it("zsh script lists every top-level command", () => {
    const script = getCompletionScript("zsh");
    for (const cmd of ["simulate", "decode", "monitor", "bindings"]) {
      expect(script).toContain(cmd);
    }
  });

  it("fish script lists every top-level command", () => {
    const script = getCompletionScript("fish");
    for (const cmd of ["simulate", "decode", "monitor", "bindings"]) {
      expect(script).toContain(cmd);
    }
  });

  it("bash script includes flags for simulate", () => {
    const script = getCompletionScript("bash");
    expect(script).toContain("--contract");
    expect(script).toContain("--method");
    expect(script).toContain("--rpc-url");
  });

  it("throws a descriptive error for an unsupported shell", () => {
    expect(() => getCompletionScript("powershell")).toThrow(
      'Unsupported shell "powershell". Supported: bash, zsh, fish'
    );
  });
});
