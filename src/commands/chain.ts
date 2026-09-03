import { Command } from "commander";
import { ContractSimulator, ArgEncoder, SimulationResult } from "@soroban-devkit/core";
import { printSimulationResult, printError } from "../utils/format";
import { loadConfig, resolveContractId } from "../utils/config";
import { resolveNetworkConfig } from "../utils/network";

export interface ChainStep {
  contract: string;
  method: string;
  args: unknown[];
  caller: string;
}

/**
 * Parse the --steps JSON string into an ordered list of chain steps.
 * Throws a descriptive error (naming the offending step's index) for
 * invalid JSON, a non-array value, an empty array, or a step missing a
 * required field.
 */
export function parseSteps(raw: string): ChainStep[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`--steps must be valid JSON: ${raw}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("--steps must be a JSON array of step objects");
  }
  if (parsed.length === 0) {
    throw new Error("--steps must contain at least one step");
  }

  return parsed.map((step: unknown, index: number) => {
    if (typeof step !== "object" || step === null) {
      throw new Error(`step ${index} must be an object`);
    }
    const s = step as Record<string, unknown>;
    for (const field of ["contract", "method", "caller"]) {
      if (typeof s[field] !== "string") {
        throw new Error(`step ${index} is missing "${field}"`);
      }
    }
    if (s.args !== undefined && !Array.isArray(s.args)) {
      throw new Error(`step ${index}'s "args" must be an array`);
    }
    return {
      contract: s.contract as string,
      method: s.method as string,
      args: (s.args as unknown[] | undefined) ?? [],
      caller: s.caller as string,
    };
  });
}

/**
 * Simulate a sequence of contract calls, in order, and print each result.
 *
 * @example
 * ```bash
 * sdev chain --steps '[
 *   {"contract":"CTOKEN...","method":"approve","args":["GDEX...","1000000"],"caller":"GXXX..."},
 *   {"contract":"CDEX...","method":"swap","args":["GXXX...","1000000"],"caller":"GXXX..."}
 * ]'
 * ```
 */
export function registerChain(program: Command): void {
  program
    .command("chain")
    .description("Simulate a sequence of contract calls, in order")
    .requiredOption("--steps <json>", "JSON array of { contract, method, args, caller } steps")
    .option("--network <network>", "Network: mainnet | testnet | futurenet | local")
    .option("--rpc-url <url>", "Custom RPC endpoint (overrides --network)")
    .option("--continue-on-failure", "Run every step even after one fails", false)
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const network = opts.network ?? config.network ?? "testnet";
        const networkConfig = resolveNetworkConfig(network, opts.rpcUrl, config.rpcHeaders);
        const simulator = new ContractSimulator(networkConfig);
        const encoder = new ArgEncoder();

        const steps = parseSteps(opts.steps);
        const results = await simulator.simulateSequence(
          steps.map((step) => ({
            contractId: resolveContractId(step.contract, config),
            method: step.method,
            args: encoder.encodeArgs(step.args),
            caller: step.caller,
          })),
          { stopOnFailure: !opts.continueOnFailure }
        );

        if (opts.json) {
          process.stdout.write(JSON.stringify(results, null, 2) + "\n");
        } else {
          results.forEach((result: SimulationResult, i: number) => {
            process.stdout.write(`\n— step ${i + 1}/${steps.length}: ${steps[i].method} —\n`);
            printSimulationResult(result, steps[i].contract, steps[i].method, network);
          });
          if (results.length < steps.length) {
            process.stderr.write(
              `\nStopped after step ${results.length}/${steps.length} failed (pass --continue-on-failure to run every step).\n`
            );
          }
        }

        const allSucceeded = results.length === steps.length && results.every((r) => r.success);
        process.exit(allSucceeded ? 0 : 1);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
