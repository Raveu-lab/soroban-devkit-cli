import { Command } from "commander";
import { ContractSimulator, ArgEncoder } from "@soroban-devkit/core";
import { printSimulationResult, printError, extractErrorMessage } from "../utils/format";
import { loadConfig, resolveContractId } from "../utils/config";
import { resolveNetworkConfig } from "../utils/network";

/**
 * Parse the --args JSON string into a plain array, ready for ArgEncoder.
 * Throws a descriptive error for invalid JSON or a non-array value.
 */
export function parseArgs(raw: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`--args must be valid JSON: ${raw}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("--args must be a JSON array, e.g. '[\"GABC...\", 1000]'");
  }
  return parsed;
}

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
        const networkConfig = resolveNetworkConfig(network, opts.rpcUrl, config.rpcHeaders);
        const simulator = new ContractSimulator(networkConfig);
        const contractId = resolveContractId(opts.contract, config);

        const encoder = new ArgEncoder();
        const args = encoder.encodeArgs(parseArgs(opts.args));
        const result = await simulator.simulate(contractId, opts.method, args, opts.caller);

        if (opts.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        } else {
          printSimulationResult(result, contractId, opts.method, network);
        }

        // exitCode, not exit(): calling exit() right after a large write
        // can truncate it when stdout is piped — Node may not have
        // finished flushing the write to the OS pipe yet, and exit() tears
        // the process down regardless. Confirmed directly: a 200KB write
        // immediately followed by process.exit() lands truncated to one
        // pipe-buffer's worth (65536 bytes) when piped to another process;
        // setting exitCode and letting the event loop drain naturally
        // delivers the full write every time. --json output has no size
        // cap (a large returnValue, or many steps via `sdev chain`), so
        // this is reachable, not just theoretical.
        process.exitCode = result.success ? 0 : 1;
      } catch (err) {
        printError(extractErrorMessage(err));
        process.exitCode = 1;
      }
    });
}
