import {
  formatSimulationResult,
  formatEvent,
  formatEventJson,
  formatError,
  formatSuccess,
} from "../../src/utils/format";
import { SimulationResult, ContractEvent } from "@soroban-devkit/core";

describe("format utilities", () => {
  describe("formatSimulationResult", () => {
    it("returns a success string when simulation succeeded", () => {
      const result: SimulationResult = {
        success: true,
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 1000 },
        cost: { minResourceFee: "1204312" },
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
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "ping", "testnet");
      expect(output).toContain("Simulation failed");
      expect(output).toContain("account not found");
    });

    it("surfaces restoreFee distinctly when the simulation needs a restore, not just the generic failure message", () => {
      // core's SimulationResult now carries needsRestore/restoreFee instead
      // of silently discarding the restore preamble — this CLI command
      // previously would have printed only the generic error text, with no
      // indication a restoreFee even existed to show.
      const result: SimulationResult = {
        success: false,
        error: "Contract data needs restoration before this call can succeed.",
        needsRestore: true,
        restoreFee: "555555",
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "get_price", "testnet");
      expect(output).toContain("Restore required");
      expect(output).toContain("555555");
    });

    it("does not print a restore fee line for an ordinary failure", () => {
      const result: SimulationResult = {
        success: false,
        error: "insufficient balance",
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "transfer", "testnet");
      expect(output).not.toContain("Restore required");
    });

    it("includes the decoded return value when the invocation produced one", () => {
      const result: SimulationResult = {
        success: true,
        returnValue: "GABC...",
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "admin", "testnet");
      expect(output).toContain("Return Value");
      expect(output).toContain("GABC...");
    });

    it("includes a falsy-but-present return value like 0 or false", () => {
      const result: SimulationResult = {
        success: true,
        returnValue: 0,
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "balance", "testnet");
      expect(output).toContain("Return Value");
      expect(output).toMatch(/Return Value\s*:\s*0/);
    });

    it("omits the return value line entirely when the call had no return value", () => {
      const result: SimulationResult = {
        success: true,
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "set_price", "testnet");
      expect(output).not.toContain("Return Value");
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

  describe("formatEventJson", () => {
    it("produces valid JSON that round-trips the whole event object", () => {
      const event: ContractEvent = {
        ledger: 12345,
        ledgerClosedAt: "2024-01-01T12:00:00Z",
        contractId: "CABCDEFG",
        id: "1",
        type: "contract",
        topics: ["AAAAAg=="],
        data: "AAAAAw==",
        decodedTopics: ["transfer"],
        decodedData: 1000000,
      };
      const output = formatEventJson(event);
      expect(JSON.parse(output)).toEqual(event);
    });

    it("includes raw base64 topics/data alongside decoded values, unlike formatEvent's human output", () => {
      const event: ContractEvent = {
        ledger: 1,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        contractId: "CTEST",
        id: "1",
        type: "contract",
        topics: ["AAAAAg=="],
        data: "AAAAAw==",
        decodedTopics: ["transfer"],
        decodedData: 500,
      };
      const parsed = JSON.parse(formatEventJson(event));
      expect(parsed.topics).toEqual(["AAAAAg=="]);
      expect(parsed.data).toBe("AAAAAw==");
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

describe("format — additional edge cases", () => {
  describe("formatSimulationResult", () => {
    it("includes the contract ID in output", () => {
      const result: SimulationResult = {
        success: true,
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CMYCONTRACT", "ping", "testnet");
      expect(output).toContain("CMYCONTRACT");
    });

    it("formats a zero minResourceFee as 0", () => {
      const result: SimulationResult = {
        success: true,
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "0" },
      };
      const output = formatSimulationResult(result, "CTEST", "ping", "testnet");
      expect(output).toContain("0");
    });

    it("uses locale-formatted numbers for a large minResourceFee", () => {
      const result: SimulationResult = {
        success: true,
        footprint: { diskReadBytes: 0, writeBytes: 0, instructions: 0 },
        cost: { minResourceFee: "1000000" },
      };
      const output = formatSimulationResult(result, "CTEST", "ping", "testnet");
      expect(output).toContain("1,000,000");
    });
  });

  describe("formatError", () => {
    it("starts with the error indicator", () => {
      expect(formatError("bad input")).toMatch(/^✖/);
    });
  });

  describe("formatSuccess", () => {
    it("starts with the success indicator", () => {
      expect(formatSuccess("done")).toMatch(/^✔/);
    });
  });

  describe("formatEvent", () => {
    it("shows contract ID prefix in output", () => {
      const event: ContractEvent = {
        ledger: 1,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        contractId: "CABCDEFGHIJK",
        id: "1",
        type: "contract",
        topics: [],
        data: "",
        decodedTopics: [],
        decodedData: null,
      };
      const output = formatEvent(event);
      expect(output).toContain("CABCDEFG");
    });

    it("omits topics line when decodedTopics is empty", () => {
      const event: ContractEvent = {
        ledger: 1,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        contractId: "CTEST",
        id: "1",
        type: "contract",
        topics: [],
        data: "",
        decodedTopics: [],
        decodedData: undefined,
      };
      const output = formatEvent(event);
      expect(output).not.toContain("topics:");
    });

    it("does not leak the bare string \"Invalid Date\" for an unparseable ledgerClosedAt", () => {
      // new Date("").toLocaleTimeString() returns the literal string
      // "Invalid Date", which was printed to the user as if it were a
      // real timestamp — no indication anything was actually wrong.
      const event: ContractEvent = {
        ledger: 1,
        ledgerClosedAt: "",
        contractId: "CTEST",
        id: "1",
        type: "contract",
        topics: [],
        data: "",
        decodedTopics: [],
        decodedData: undefined,
      };
      const output = formatEvent(event);
      expect(output).not.toContain("Invalid Date");
    });

    it("still shows a real time for a valid ledgerClosedAt", () => {
      const event: ContractEvent = {
        ledger: 1,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        contractId: "CTEST",
        id: "1",
        type: "contract",
        topics: [],
        data: "",
        decodedTopics: [],
        decodedData: undefined,
      };
      const output = formatEvent(event);
      expect(output).toContain(new Date("2024-01-01T00:00:00Z").toLocaleTimeString());
    });
  });
});
