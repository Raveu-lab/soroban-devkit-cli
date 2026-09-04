import { Command } from "commander";
import { ContractMonitor } from "@soroban-devkit/core";
import { printEvent, printError } from "../utils/format";
import { loadConfig, resolveContractId } from "../utils/config";
import { resolveNetworkConfig } from "../utils/network";

/**
 * Parse a CLI numeric flag as a positive integer.
 * Throws a descriptive error (naming the flag) for anything that isn't one —
 * an unparseable or non-positive value would otherwise silently become NaN,
 * and setTimeout(fn, NaN) fires almost immediately rather than erroring.
 */
export function parsePositiveInt(raw: string, flagName: string): number {
  const value = parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flagName} must be a positive integer, got "${raw}"`);
  }
  return value;
}

/**
 * Watch Soroban contracts for real-time events.
 * Runs indefinitely until Ctrl+C. Prints decoded events to stdout.
 *
 * @example
 * ```bash
 * sdev monitor --network testnet --contract CXXXXX --filter transfer
 * ```
 */
export function registerMonitor(program: Command): void {
  program
    .command("monitor")
    .description("Watch Soroban contracts for events in real-time")
    .option("--contract <ids...>", "Contract IDs to watch (space-separated)")
    .option("--filter <event>", "Filter by event name (matches first topic)")
    .option("--interval <ms>", "Polling interval in milliseconds", "5000")
    .option("--network <network>", "Network: mainnet | testnet | futurenet | local")
    .option("--rpc-url <url>", "Custom RPC endpoint (overrides --network)")
    .option("--start-ledger <ledger>", "Start from this ledger sequence number")
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const network = opts.network ?? config.network ?? "testnet";
        const networkConfig = resolveNetworkConfig(network, opts.rpcUrl, config.rpcHeaders);
        const contractIds = (opts.contract ?? config.contracts ?? []).map((id: string) =>
          resolveContractId(id, config)
        );
        const pollingIntervalMs = parsePositiveInt(opts.interval, "--interval");

        const monitor = new ContractMonitor(networkConfig);

        monitor
          .watch({
            contractIds,
            eventFilter: opts.filter,
            pollingIntervalMs,
            startLedger: opts.startLedger
              ? parsePositiveInt(opts.startLedger, "--start-ledger")
              : undefined,
          })
          .on("event", (event) => printEvent(event))
          .on("error", (err) => printError(err.message));

        process.stderr.write(
          `◎ Watching ${contractIds.length ? contractIds.join(", ") : "all contracts"} on ${network} (polling every ${pollingIntervalMs}ms)\n\n`
        );

        await monitor.start();

        // Graceful shutdown on Ctrl+C
        process.on("SIGINT", () => {
          monitor.stop();
          process.stderr.write("\nStopped.\n");
          process.exit(0);
        });

        // Keep process alive
        await new Promise(() => {});
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
