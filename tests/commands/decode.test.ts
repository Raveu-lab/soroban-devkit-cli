import { ArgEncoder } from "@soroban-devkit/core";
import { buildDecodedOutput } from "../../src/commands/decode";

const encoder = new ArgEncoder();
const toBase64Xdr = (value: unknown): string => encoder.encode(value).toXDR("base64");

describe("buildDecodedOutput", () => {
  it("decodes a real symbol XDR data field", () => {
    const result = buildDecodedOutput(toBase64Xdr("transfer"));
    expect(result.decodedData).toBe("transfer");
    expect(result.decodedTopics).toEqual([]);
  });

  it("decodes real topic XDR fields alongside data", () => {
    const dataXdr = toBase64Xdr(42);
    const topic1 = toBase64Xdr("transfer");
    const topic2 = toBase64Xdr(true);

    const result = buildDecodedOutput(dataXdr, [topic1, topic2]);

    expect(result.decodedData).toBe(42);
    expect(result.decodedTopics).toEqual(["transfer", true]);
  });

  it("defaults to an empty topics array when none are given", () => {
    const result = buildDecodedOutput(toBase64Xdr(false));
    expect(result.decodedTopics).toEqual([]);
  });

  it("returns '[decode error]' for invalid base64 XDR instead of throwing", () => {
    const result = buildDecodedOutput("not-valid-xdr");
    expect(result.decodedData).toBe("[decode error]");
  });

  it("trims surrounding whitespace from the data field before decoding", () => {
    const result = buildDecodedOutput(`  ${toBase64Xdr("hello")}  \n`);
    expect(result.decodedData).toBe("hello");
  });
});
