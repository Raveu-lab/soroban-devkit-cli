import { ContractEvent, SimulationResult } from "@soroban-devkit/core";

/**
 * Terminal output formatting utilities.
 * All user-facing output goes through these functions.
 * No Stellar/Soroban logic lives here.
 */

export function printSimulationResult(
  result: SimulationResult,
  contractId: string,
  method: string,
  network: string
): void {
  if (result.success) {
    process.stdout.write(`\n✔ Simulation successful\n\n`);
    process.stdout.write(`  Method:   ${method}\n`);
    process.stdout.write(`  Contract: ${contractId}\n`);
    process.stdout.write(`  Network:  ${network}\n\n`);
    process.stdout.write(`  CPU Instructions : ${Number(result.cost.cpuInstructions).toLocaleString()}\n`);
    process.stdout.write(`  Memory Bytes     : ${Number(result.cost.memoryBytes).toLocaleString()}\n`);
    process.stdout.write(`  Instructions     : ${result.footprint.instructions.toLocaleString()}\n\n`);
  } else {
    process.stderr.write(`\n✖ Simulation failed\n\n`);
    process.stderr.write(`  ${result.error}\n\n`);
  }
}

export function printEvent(event: ContractEvent): void {
  const time = new Date(event.ledgerClosedAt).toLocaleTimeString();
  process.stdout.write(`[${time}] Ledger ${event.ledger}  ${event.contractId.slice(0, 8)}...\n`);

  if (event.decodedTopics?.length) {
    process.stdout.write(`  topics: ${JSON.stringify(event.decodedTopics)}\n`);
  }
  if (event.decodedData !== undefined) {
    process.stdout.write(`  data:   ${JSON.stringify(event.decodedData)}\n`);
  }
  process.stdout.write("\n");
}

export function printSuccess(message: string): void {
  process.stdout.write(`✔ ${message}\n`);
}

export function printError(message: string): void {
  process.stderr.write(`✖ ${message}\n`);
}
