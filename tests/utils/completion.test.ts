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
    for (const cmd of ["simulate", "decode", "monitor", "bindings", "chain", "completion", "config"]) {
      expect(script).toContain(cmd);
    }
  });

  it("zsh script lists every top-level command", () => {
    const script = getCompletionScript("zsh");
    for (const cmd of ["simulate", "decode", "monitor", "bindings", "chain", "completion", "config"]) {
      expect(script).toContain(cmd);
    }
  });

  it("fish script lists every top-level command", () => {
    const script = getCompletionScript("fish");
    for (const cmd of ["simulate", "decode", "monitor", "bindings", "chain", "completion", "config"]) {
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

  describe("bindings' nested 'generate' subcommand", () => {
    // `sdev bindings` is a Commander parent command whose only real usage is
    // `sdev bindings generate --contract ...` — unlike every other command,
    // which takes its flags directly. Completion needs to offer "generate"
    // at that position, not the generate subcommand's flags (which
    // Commander won't even recognize until "generate" is typed).

    it("bash: offers 'generate' when completing right after 'bindings', before offering its flags", () => {
      const script = getCompletionScript("bash");
      const generateOffer = script.indexOf('compgen -W "generate"');
      const flagsCase = script.indexOf("bindings)", script.indexOf("local opts="));
      expect(generateOffer).toBeGreaterThan(-1);
      expect(generateOffer).toBeLessThan(flagsCase);
    });

    it("zsh: offers 'generate' as a subcommand value before falling into the flags case", () => {
      const script = getCompletionScript("zsh");
      expect(script).toContain("_values 'subcommand' 'generate'");
    });

    it("fish: suggests 'generate' only after 'bindings' has been typed and before it's been typed itself", () => {
      const script = getCompletionScript("fish");
      expect(script).toContain(
        '-n "__fish_seen_subcommand_from bindings; and not __fish_seen_subcommand_from generate" -a "generate"'
      );
    });

    it("fish: bindings' flags require both 'bindings' and 'generate' to have been seen", () => {
      const script = getCompletionScript("fish");
      expect(script).toContain(
        '-n "__fish_seen_subcommand_from bindings; and __fish_seen_subcommand_from generate" -l contract'
      );
    });
  });

  describe("config's nested 'validate' subcommand", () => {
    it("bash: offers 'validate' when completing right after 'config'", () => {
      const script = getCompletionScript("bash");
      const generateOffer = script.indexOf('compgen -W "validate"');
      expect(generateOffer).toBeGreaterThan(-1);
    });

    it("zsh: offers 'validate' as a subcommand value", () => {
      const script = getCompletionScript("zsh");
      expect(script).toContain("_values 'subcommand' 'validate'");
    });

    it("fish: suggests 'validate' only after 'config' has been typed", () => {
      const script = getCompletionScript("fish");
      expect(script).toContain(
        '-n "__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from validate" -a "validate"'
      );
    });
  });
});
