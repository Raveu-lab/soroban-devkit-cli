import { Command } from "commander";
import { EventDecoder, ContractEvent } from "@soroban-devkit/core";
import { printError } from "../utils/format";

/**
 * Decode a raw base64 XDR event blob into human-readable JSON.
 * Reads from --data flag or stdin pipe.
 *
 * @example
 * ```bash
 * sdev decode --data "AAAAB..."
 * echo "AAAAB..." | sdev decode
 * ```
 */
export function registerDecode(program: Command): void {
  program
    .command("decode")
    .description("Decode a raw base64 XDR contract event into human-readable JSON")
    .option("--data <base64>", "Base64 XDR data field to decode")
    .option("--topics <base64...>", "Base64 XDR topic fields to decode (space-separated)")
    .action(async (opts) => {
      try {
        let data = opts.data ?? "";

        // Support piped input if --data not provided
        if (!data && !process.stdin.isTTY) {
          data = await readStdin();
        }

        if (!data) {
          printError("Provide --data or pipe a base64 XDR string via stdin");
          process.exit(1);
        }

        const event: ContractEvent = {
          ledger: 0,
          ledgerClosedAt: "",
          contractId: "",
          id: "",
          type: "contract",
          topics: opts.topics ?? [],
          data: data.trim(),
        };

        const decoder = new EventDecoder();
        const decoded = decoder.decode(event);

        process.stdout.write(
          JSON.stringify(
            {
              decodedTopics: decoded.decodedTopics,
              decodedData: decoded.decodedData,
            },
            null,
            2
          ) + "\n"
        );
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
  });
}
