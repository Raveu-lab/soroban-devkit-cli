import { ContractEvent, SimulationResult } from "@soroban-devkit/core";

/**
 * format.ts
 *
 * Pure formatting functions — each takes data and returns a string.
 * No side effects, no stdout writes. Commands handle the printing.
 * This makes every formatter independently testable.
 *
 * Rule: every function added here must have a test in
 * tests/utils/format.test.ts before the PR is opened.
 */

/**
 * Format a SimulationResult into a human-readable string.
 */
export function formatSimulationResult(
  result: SimulationResult,
  contractId: string,
  method: string,
  network: string
): string {
  if (!result.success) {
    return `\n✖ Simulation failed\n\n  ${result.error}\n`;
  }

  const fee = Number(result.cost.minResourceFee).toLocaleString();
  const inst = result.footprint.instructions.toLocaleString();

  const lines = [
    "",
    "✔ Simulation successful",
    "",
    `  Method:            ${method}`,
    `  Contract:          ${contractId}`,
    `  Network:           ${network}`,
    "",
  ];
  if (result.returnValue !== undefined) {
    lines.push(`  Return Value     : ${JSON.stringify(result.returnValue)}`, "");
  }
  lines.push(`  Min Resource Fee : ${fee} stroops`, `  Instructions     : ${inst}`, "");

  return lines.join("\n");
}

/**
 * Format a decoded ContractEvent into a human-readable string.
 */
export function formatEvent(event: ContractEvent): string {
  const parsed = new Date(event.ledgerClosedAt);
  const time = Number.isNaN(parsed.getTime()) ? "unknown time" : parsed.toLocaleTimeString();
  const lines: string[] = [
    `[${time}] Ledger ${event.ledger}  ${event.contractId.slice(0, 8)}...`,
  ];

  if (event.decodedTopics?.length) {
    lines.push(`  topics: ${JSON.stringify(event.decodedTopics)}`);
  }
  if (event.decodedData !== undefined) {
    lines.push(`  data:   ${JSON.stringify(event.decodedData)}`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Format a decoded ContractEvent as JSON — the raw base64 topics/data
 * alongside the decoded values, unlike formatEvent's human-readable output.
 */
export function formatEventJson(event: ContractEvent): string {
  return JSON.stringify(event);
}

/**
 * Format an error message.
 */
export function formatError(message: string): string {
  return `✖ ${message}`;
}

/**
 * Format a success message.
 */
export function formatSuccess(message: string): string {
  return `✔ ${message}`;
}

/**
 * Print a formatted SimulationResult to stdout/stderr.
 */
export function printSimulationResult(
  result: SimulationResult,
  contractId: string,
  method: string,
  network: string
): void {
  const output = formatSimulationResult(result, contractId, method, network);
  if (result.success) {
    process.stdout.write(output + "\n");
  } else {
    process.stderr.write(output + "\n");
  }
}

/**
 * Print a decoded ContractEvent to stdout.
 */
export function printEvent(event: ContractEvent): void {
  process.stdout.write(formatEvent(event) + "\n");
}

/**
 * Print a decoded ContractEvent to stdout as one JSON object per line —
 * for `--json` mode, so a long-running `sdev monitor` stream stays
 * consumable by another program (e.g. `jq`) without buffering the whole
 * output first.
 */
export function printEventJson(event: ContractEvent): void {
  process.stdout.write(formatEventJson(event) + "\n");
}

/**
 * Print an error message to stderr.
 */
export function printError(message: string): void {
  process.stderr.write(formatError(message) + "\n");
}

/**
 * Print a success message to stdout.
 */
export function printSuccess(message: string): void {
  process.stdout.write(formatSuccess(message) + "\n");
}
