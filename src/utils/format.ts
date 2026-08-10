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

  const cpu = Number(result.cost.cpuInstructions).toLocaleString();
  const mem = Number(result.cost.memoryBytes).toLocaleString();
  const inst = result.footprint.instructions.toLocaleString();

  return [
    "",
    "✔ Simulation successful",
    "",
    `  Method:            ${method}`,
    `  Contract:          ${contractId}`,
    `  Network:           ${network}`,
    "",
    `  CPU Instructions : ${cpu}`,
    `  Memory Bytes     : ${mem}`,
    `  Instructions     : ${inst}`,
    "",
  ].join("\n");
}

/**
 * Format a decoded ContractEvent into a human-readable string.
 */
export function formatEvent(event: ContractEvent): string {
  const time = new Date(event.ledgerClosedAt).toLocaleTimeString();
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
