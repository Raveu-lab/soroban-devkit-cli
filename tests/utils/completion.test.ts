import { Command } from "commander";
import { getCompletionScript, SUPPORTED_SHELLS, COMMANDS } from "../../src/utils/completion";
import { registerSimulate } from "../../src/commands/simulate";
import { registerDecode } from "../../src/commands/decode";
import { registerMonitor } from "../../src/commands/monitor";
import { registerBindings } from "../../src/commands/bindings";
import { registerChain } from "../../src/commands/chain";
import { registerCompletion } from "../../src/commands/completion";
import { registerConfig } from "../../src/commands/config";

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

describe("COMMANDS stays in sync with the real CLI", () => {
  /**
   * Build the actual Commander program the same way src/cli.ts does, then
   * diff it against the completion table. Without this, the table is kept
   * accurate by hand and a new command or flag silently goes missing from
   * every shell's completions.
   */
  function buildRealProgram(): Command {
    const program = new Command();
    registerSimulate(program);
    registerDecode(program);
    registerMonitor(program);
    registerBindings(program);
    registerChain(program);
    registerCompletion(program);
    registerConfig(program);
    return program;
  }

  const real = buildRealProgram();
  const longFlags = (cmd: Command): string[] =>
    cmd.options.map((o) => o.long).filter((l): l is string => Boolean(l));

  it("lists every command the CLI actually registers, and no others", () => {
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(real.commands.map((c) => c.name()).sort());
  });

  it.each(COMMANDS.map((c) => c.name))("lists %s's real flags", (name) => {
    const cmd = real.commands.find((c) => c.name() === name);
    if (!cmd) throw new Error(`${name} is in COMMANDS but not registered`);
    const spec = COMMANDS.find((c) => c.name === name)!;

    // A command with a required subcommand carries its flags there, which is
    // the distinction completion got wrong before.
    const expected = spec.subcommands?.length
      ? cmd.commands.flatMap((sub) => longFlags(sub))
      : longFlags(cmd);

    expect([...spec.flags].sort()).toEqual([...new Set(expected)].sort());
  });

  it.each(COMMANDS.map((c) => c.name))("lists %s's real subcommands", (name) => {
    const cmd = real.commands.find((c) => c.name() === name)!;
    expect([...(COMMANDS.find((c) => c.name === name)!.subcommands ?? [])].sort()).toEqual(
      cmd.commands.map((s) => s.name()).sort()
    );
  });
});
