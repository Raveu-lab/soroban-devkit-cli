import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { parseConfig, validateConfig, CONFIG_FILE } from "../utils/config";
import { printSuccess, printError } from "../utils/format";

/**
 * Build the multi-line error report for `sdev config validate`.
 * Public so it can be tested in isolation.
 */
export function formatValidationResult(errors: string[]): string {
  return errors.map((e) => `  - ${e}`).join("\n");
}

/**
 * Validate sdev.config.json's shape and report any errors.
 *
 * @example
 * ```bash
 * sdev config validate
 * ```
 */
export function registerConfig(program: Command): void {
  const config = program.command("config").description("Inspect and validate sdev.config.json");

  config
    .command("validate")
    .description("Validate sdev.config.json's shape and report any errors")
    .action(() => {
      const configPath = path.resolve(process.cwd(), CONFIG_FILE);
      if (!fs.existsSync(configPath)) {
        printSuccess(`No ${CONFIG_FILE} found — nothing to validate.`);
        return;
      }

      // Not loadConfig(): that swallows a malformed/non-object file into an
      // empty config, which would make this command report it as valid.
      const parsed = parseConfig(fs.readFileSync(configPath, "utf-8"));
      if ("error" in parsed) {
        printError(parsed.error);
        process.exit(1);
      }
      const errors = validateConfig(parsed.config);

      if (errors.length === 0) {
        printSuccess(`${CONFIG_FILE} is valid`);
        return;
      }

      printError(`${CONFIG_FILE} has ${errors.length} error(s):`);
      process.stderr.write(formatValidationResult(errors) + "\n");
      process.exit(1);
    });
}
