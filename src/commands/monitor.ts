import { Command } from "commander";
import { ContractMonitor } from "@soroban-devkit/core";
import { printEvent, printError } from "../utils/format";
import { loadConfig } from "../utils/config";

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
    .option("--start-ledger <ledger>", "Start from this ledger sequence number")
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const network = opts.network ?? config.network ?? "testnet";
        const contractIds = opts.contract ?? config.contracts ?? [];
        const pollingIntervalMs = parseInt(opts.interval, 10);

        const monitor = new ContractMonitor(network);

        monitor
          .watch({
            contractIds,
            eventFilter: opts.filter,
            pollingIntervalMs,
            startLedger: opts.startLedger ? parseInt(opts.startLedger, 10) : undefined,
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
