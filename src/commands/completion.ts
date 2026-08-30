import { Command } from "commander";
import { getCompletionScript, SUPPORTED_SHELLS } from "../utils/completion";
import { printError } from "../utils/format";

/**
 * Print a shell completion script to stdout, for the caller to install.
 *
 * @example
 * ```bash
 * sdev completion bash > /etc/bash_completion.d/sdev
 * sdev completion zsh > "${fpath[1]}/_sdev"
 * sdev completion fish > ~/.config/fish/completions/sdev.fish
 * ```
 */
export function registerCompletion(program: Command): void {
  program
    .command("completion")
    .description(`Print a shell completion script (${SUPPORTED_SHELLS.join(", ")})`)
    .argument("<shell>", `Shell to generate a completion script for (${SUPPORTED_SHELLS.join(", ")})`)
    .action((shell: string) => {
      try {
        process.stdout.write(getCompletionScript(shell));
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
