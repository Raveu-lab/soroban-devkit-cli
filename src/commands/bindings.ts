import { Command } from "commander";
import { BindingGenerator } from "@soroban-devkit/core";
import { printSuccess, printError } from "../utils/format";
import { loadConfig } from "../utils/config";

export function registerBindings(program: Command): void {
  const bindings = program
    .command("bindings")
    .description("Generate TypeScript bindings from a deployed Soroban contract");

  bindings
    .command("generate")
    .description("Generate TypeScript bindings from a contract's on-chain WASM spec")
    .requiredOption("--contract <id>", "Contract ID in C... format")
    .option("--output <dir>", "Output directory for generated files", "./generated")
    .option("--network <network>", "Network: mainnet | testnet | futurenet | local")
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const network = opts.network ?? config.network ?? "testnet";

        const gen = new BindingGenerator({
          contractId: opts.contract,
          outputDir: opts.output,
          network,
        });

        await gen.generate();
        printSuccess(`Bindings written to ${opts.output}/${opts.contract.slice(0, 8)}_bindings.ts`);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
