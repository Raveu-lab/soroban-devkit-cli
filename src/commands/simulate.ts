import { Command } from "commander";
import { ContractSimulator } from "@soroban-devkit/core";
import { printSimulationResult, printError } from "../utils/format";
import { loadConfig } from "../utils/config";
import { xdr } from "@stellar/stellar-sdk";

export function registerSimulate(program: Command): void {
  program
    .command("simulate")
    .description("Simulate a Soroban contract call and inspect cost and resource footprint")
    .requiredOption("--contract <id>", "Contract ID in C... format")
    .requiredOption("--method <name>", "Contract function name to call")
    .requiredOption("--caller <address>", "Caller account public key in G... format")
    .option("--args <json>", "JSON array of ScVal arguments (e.g. '[\"GABC...\", 1000]')", "[]")
    .option("--network <network>", "Network: mainnet | testnet | futurenet | local")
    .option("--rpc-url <url>", "Custom RPC endpoint (overrides --network)")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const network = opts.network ?? config.network ?? "testnet";

        // Parse args — contributors will extend this to full XDR arg parsing (issue #5)
        let args: xdr.ScVal[] = [];
        if (opts.args && opts.args !== "[]") {
          // TODO: Parse JSON args string into typed xdr.ScVal array
          // Each element type needs to be inferred from the JSON value
          // See: https://github.com/Raveu-lab/soroban-devkit-cli/issues/5
          args = [];
        }

        const simulator = new ContractSimulator(network);
        const result = await simulator.simulate(
          opts.contract,
          opts.method,
          args,
          opts.caller
        );

        if (opts.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        } else {
          printSimulationResult(result, opts.contract, opts.method, network);
        }

        process.exit(result.success ? 0 : 1);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
