/**
 * completion.ts
 *
 * Generates shell completion scripts for bash, zsh, and fish, from a single
 * description of sdev's commands and flags. Pure string generation — no
 * shell is invoked, nothing is written to disk here.
 */

export const SUPPORTED_SHELLS = ["bash", "zsh", "fish"] as const;
export type Shell = (typeof SUPPORTED_SHELLS)[number];

interface CommandSpec {
  name: string;
  flags: string[];
  /**
   * Required subcommand name(s) that must come before flags apply —
   * Commander's nested-command pattern (e.g. `bindings generate`, not
   * `bindings --contract ...`). Absent/empty for a flat command.
   */
  subcommands?: string[];
}

/** Single source of truth for completions — keep in sync with src/commands/*.ts */
const COMMANDS: CommandSpec[] = [
  {
    name: "simulate",
    flags: [
      "--contract",
      "--method",
      "--caller",
      "--args",
      "--network",
      "--rpc-url",
      "--json",
    ],
  },
  { name: "decode", flags: ["--data", "--topics"] },
  {
    name: "monitor",
    flags: [
      "--contract",
      "--filter",
      "--interval",
      "--network",
      "--rpc-url",
      "--start-ledger",
      "--json",
    ],
  },
  {
    name: "bindings",
    subcommands: ["generate"],
    flags: ["--contract", "--output", "--network", "--rpc-url"],
  },
  {
    name: "chain",
    flags: ["--steps", "--network", "--rpc-url", "--continue-on-failure", "--json"],
  },
  { name: "completion", flags: [] },
  { name: "config", subcommands: ["validate"], flags: [] },
];

export function isSupportedShell(value: string): value is Shell {
  return (SUPPORTED_SHELLS as readonly string[]).includes(value);
}

export function getCompletionScript(shell: string): string {
  if (!isSupportedShell(shell)) {
    throw new Error(`Unsupported shell "${shell}". Supported: ${SUPPORTED_SHELLS.join(", ")}`);
  }
  switch (shell) {
    case "bash":
      return generateBash();
    case "zsh":
      return generateZsh();
    case "fish":
      return generateFish();
  }
}

function generateBash(): string {
  const commandNames = COMMANDS.map((c) => c.name).join(" ");
  const caseArms = COMMANDS.map(
    (c) => `    ${c.name})\n      opts="${c.flags.join(" ")}"\n      ;;`
  ).join("\n");
  const subcommandArms = COMMANDS.filter((c) => c.subcommands?.length)
    .map(
      (c) =>
        `    ${c.name})\n      if [ "\${COMP_CWORD}" -eq 2 ]; then\n        COMPREPLY=( $(compgen -W "${c.subcommands!.join(" ")}" -- "\${cur}") )\n        return\n      fi\n      ;;`
    )
    .join("\n");

  return `# bash completion for sdev
# Install: sdev completion bash > /etc/bash_completion.d/sdev
# or:      sdev completion bash >> ~/.bashrc
_sdev_completions() {
  local cur cmd
  cur="\${COMP_WORDS[COMP_CWORD]}"
  cmd="\${COMP_WORDS[1]}"

  if [ "\${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${commandNames}" -- "\${cur}") )
    return
  fi

  case "\${cmd}" in
${subcommandArms}
  esac

  local opts=""
  case "\${cmd}" in
${caseArms}
  esac
  COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
}
complete -F _sdev_completions sdev
`;
}

function generateZsh(): string {
  const commandLines = COMMANDS.map((c) => `    "${c.name}:sdev ${c.name} command"`).join("\n");
  const flagCases = COMMANDS.map(
    (c) => `    ${c.name})\n      _values 'flags' ${c.flags.map((f) => `'${f}'`).join(" ")}\n      ;;`
  ).join("\n");
  const subcommandCases = COMMANDS.filter((c) => c.subcommands?.length)
    .map(
      (c) =>
        `    ${c.name})\n      if (( CURRENT == 3 )); then\n        _values 'subcommand' ${c.subcommands!.map((s) => `'${s}'`).join(" ")}\n        return\n      fi\n      ;;`
    )
    .join("\n");

  return `#compdef sdev
# zsh completion for sdev
# Install: sdev completion zsh > "\${fpath[1]}/_sdev"

_sdev() {
  local -a commands
  commands=(
${commandLines}
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  local cmd="\${words[2]}"
  case "\${cmd}" in
${subcommandCases}
  esac

  case "\${cmd}" in
${flagCases}
  esac
}

_sdev
`;
}

function generateFish(): string {
  const lines: string[] = [
    "# fish completion for sdev",
    "# Install: sdev completion fish > ~/.config/fish/completions/sdev.fish",
    "",
  ];

  for (const c of COMMANDS) {
    lines.push(
      `complete -c sdev -n "__fish_use_subcommand" -a "${c.name}" -d "sdev ${c.name} command"`
    );
  }
  for (const c of COMMANDS) {
    for (const sub of c.subcommands ?? []) {
      lines.push(
        `complete -c sdev -n "__fish_seen_subcommand_from ${c.name}; and not __fish_seen_subcommand_from ${sub}" -a "${sub}" -d "sdev ${c.name} ${sub}"`
      );
    }
  }
  for (const c of COMMANDS) {
    const condition = c.subcommands?.length
      ? `__fish_seen_subcommand_from ${c.name}; and __fish_seen_subcommand_from ${c.subcommands.join(" ")}`
      : `__fish_seen_subcommand_from ${c.name}`;
    for (const flag of c.flags) {
      const flagName = flag.replace(/^--/, "");
      lines.push(`complete -c sdev -n "${condition}" -l ${flagName}`);
    }
  }

  return lines.join("\n") + "\n";
}
