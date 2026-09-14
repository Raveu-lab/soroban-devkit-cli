import { Command } from "commander";
import { BindingGenerator } from "@soroban-devkit/core";
import { printSuccess, printError } from "../utils/format";
import { loadConfig, resolveContractId } from "../utils/config";
import { resolveNetworkConfig } from "../utils/network";

/**
 * Build the success message printed after bindings are written.
 * Public so it can be tested in isolation.
 */
export function successMessage(outputPath: string): string {
  return `Bindings written to ${outputPath}`;
}

/**
 * Generate TypeScript bindings from a deployed contract's on-chain WASM spec.
 *
 * @example
 * ```bash
 * sdev bindings generate --network testnet --contract CXXXXX --output ./generated
 * ```
 */
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
    .option("--rpc-url <url>", "Custom RPC endpoint (overrides --network)")
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const network = opts.network ?? config.network ?? "testnet";
        const contractId = resolveContractId(opts.contract, config);
        const networkConfig = resolveNetworkConfig(network, opts.rpcUrl, config.rpcHeaders);

        const gen = new BindingGenerator({
          contractId,
          outputDir: opts.output,
          network: networkConfig,
        });

        await gen.generate();
        printSuccess(successMessage(gen.outputPath()));
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
