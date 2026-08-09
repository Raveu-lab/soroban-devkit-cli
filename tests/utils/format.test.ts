import { formatSimulationResult, formatEvent, formatError, formatSuccess } from "../../src/utils/format";
import { SimulationResult, ContractEvent } from "@soroban-devkit/core";

describe("format utilities", () => {
  describe("formatSimulationResult", () => {
    it("returns a success string when simulation succeeded", () => {
      const result: SimulationResult = {
        success: true,
        footprint: { readBytes: 0, writeBytes: 0, instructions: 1000 },
        cost: { cpuInstructions: "1204312", memoryBytes: "46820" },
      };
      const output = formatSimulationResult(result, "CTEST", "transfer", "testnet");
      expect(output).toContain("Simulation successful");
      expect(output).toContain("transfer");
      expect(output).toContain("testnet");
      expect(output).toContain("1,204,312");
    });

    it("returns a failure string when simulation failed", () => {
      const result: SimulationResult = {
        success: false,
        error: "account not found",
        footprint: { readBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { cpuInstructions: "0", memoryBytes: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "ping", "testnet");
      expect(output).toContain("Simulation failed");
      expect(output).toContain("account not found");
    });
  });

  describe("formatEvent", () => {
    it("includes ledger number in output", () => {
      const event: ContractEvent = {
        ledger: 12345,
        ledgerClosedAt: "2024-01-01T12:00:00Z",
        contractId: "CABCDEFG",
        id: "1",
        type: "contract",
        topics: [],
        data: "",
        decodedTopics: ["transfer"],
        decodedData: 1000000,
      };
      const output = formatEvent(event);
      expect(output).toContain("12345");
      expect(output).toContain("transfer");
    });

    it("includes decoded data in output", () => {
      const event: ContractEvent = {
        ledger: 1,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        contractId: "CTEST",
        id: "1",
        type: "contract",
        topics: [],
        data: "",
        decodedTopics: [],
        decodedData: { amount: 999 },
      };
      const output = formatEvent(event);
      expect(output).toContain("999");
    });
  });

  describe("formatError", () => {
    it("includes the error message", () => {
      expect(formatError("something went wrong")).toContain("something went wrong");
    });
  });

  describe("formatSuccess", () => {
    it("includes the success message", () => {
      expect(formatSuccess("file written")).toContain("file written");
    });
  });
});
