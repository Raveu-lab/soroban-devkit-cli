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
 * Resolve --interval into the value passed to ContractMonitor.watch(),
 * falling back to sdev.config.json's pollingIntervalMs when --interval
 * isn't passed. Returns undefined when neither is set, so core's adaptive
 * polling (calibrated from real ledger close cadence) is used instead of a
 * fixed interval. A Commander default value for --interval here would
 * defeat that — it would make pollingIntervalMs always defined, so it
 * would always win and the calibration path in
 * ContractMonitor.resolvePollingIntervalMs() would never run.
 */
export function resolvePollingInterval(
  cliValue: string | undefined,
  configValue: number | undefined
): number | undefined {
  if (cliValue !== undefined) {
    return parsePositiveInt(cliValue, "--interval");
  }
  if (configValue !== undefined) {
    if (!Number.isFinite(configValue) || configValue <= 0) {
      throw new Error(
        `sdev.config.json's pollingIntervalMs must be a positive integer, got ${configValue}`
      );
    }
    return configValue;
  }
  return undefined;
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
    .option(
      "--interval <ms>",
      "Polling interval in milliseconds (default: adaptive, calibrated from real ledger close cadence)"
    )
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
        const pollingIntervalMs = resolvePollingInterval(opts.interval, config.pollingIntervalMs);

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

        const intervalLabel =
          pollingIntervalMs !== undefined ? `${pollingIntervalMs}ms` : "adaptive";
        process.stderr.write(
          `◎ Watching ${contractIds.length ? contractIds.join(", ") : "all contracts"} on ${network} (polling every ${intervalLabel})\n\n`
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
