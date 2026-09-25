import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { loadConfig, resolveContractId, validateConfig, CONFIG_FILE } from "../../src/utils/config";

describe("loadConfig", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdev-test-"));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("returns an empty object when no config file exists", () => {
    expect(loadConfig()).toEqual({});
  });

  it("reads network from config file", () => {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), JSON.stringify({ network: "mainnet" }));
    expect(loadConfig().network).toBe("mainnet");
  });

  it("reads contracts array from config file", () => {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), JSON.stringify({ contracts: ["CABC", "CXYZ"] }));
    expect(loadConfig().contracts).toEqual(["CABC", "CXYZ"]);
  });

  it("reads pollingIntervalMs from config file", () => {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), JSON.stringify({ pollingIntervalMs: 3000 }));
    expect(loadConfig().pollingIntervalMs).toBe(3000);
  });

  it("returns empty object for malformed JSON without throwing", () => {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), "{ invalid json }");
    expect(() => loadConfig()).not.toThrow();
    expect(loadConfig()).toEqual({});
  });

  it("reads aliases from config file", () => {
    fs.writeFileSync(
      path.join(tmpDir, CONFIG_FILE),
      JSON.stringify({ aliases: { token: "CABC" } })
    );
    expect(loadConfig().aliases).toEqual({ token: "CABC" });
  });

  it("reads rpcHeaders from config file", () => {
    fs.writeFileSync(
      path.join(tmpDir, CONFIG_FILE),
      JSON.stringify({ rpcHeaders: { "X-Api-Key": "secret" } })
    );
    expect(loadConfig().rpcHeaders).toEqual({ "X-Api-Key": "secret" });
  });
});

describe("resolveContractId", () => {
  it("resolves a known alias to its contract ID", () => {
    expect(resolveContractId("token", { aliases: { token: "CABC" } })).toBe("CABC");
  });

  it("returns the input unchanged when it is not a known alias", () => {
    expect(resolveContractId("CXYZ", { aliases: { token: "CABC" } })).toBe("CXYZ");
  });

  it("returns the input unchanged when no aliases are configured", () => {
    expect(resolveContractId("CXYZ", {})).toBe("CXYZ");
  });

  it("is case-sensitive — an alias only matches an exact key", () => {
    expect(resolveContractId("Token", { aliases: { token: "CABC" } })).toBe("Token");
  });
});

describe("validateConfig", () => {
  it("returns no errors for an empty config", () => {
    expect(validateConfig({})).toEqual([]);
  });

  it("returns no errors for a fully valid config", () => {
    const errors = validateConfig({
      network: "testnet",
      contracts: ["CABC", "CXYZ"],
      pollingIntervalMs: 5000,
      aliases: { token: "CABC" },
      rpcHeaders: { "X-Api-Key": "secret" },
    });
    expect(errors).toEqual([]);
  });

  it("rejects an unknown network name", () => {
    // A typo here (e.g. "mainet") previously loaded silently and only
    // surfaced much later as an opaque error deep inside whatever command
    // happened to call resolveNetworkConfig() — not at config-load time,
    // where the mistake actually is.
    const errors = validateConfig({ network: "mainet" as never });
    expect(errors.some((e) => e.includes("network"))).toBe(true);
  });

  it("rejects a non-integer pollingIntervalMs", () => {
    const errors = validateConfig({ pollingIntervalMs: 3000.5 });
    expect(errors.some((e) => e.includes("pollingIntervalMs"))).toBe(true);
  });

  it("rejects a non-positive pollingIntervalMs", () => {
    const errors = validateConfig({ pollingIntervalMs: 0 });
    expect(errors.some((e) => e.includes("pollingIntervalMs"))).toBe(true);
  });

  it("rejects contracts that isn't an array", () => {
    const errors = validateConfig({ contracts: "CABC" as never });
    expect(errors.some((e) => e.includes("contracts"))).toBe(true);
  });

  it("rejects a contracts array containing a non-string", () => {
    const errors = validateConfig({ contracts: ["CABC", 5 as never] });
    expect(errors.some((e) => e.includes("contracts"))).toBe(true);
  });

  it("rejects aliases that isn't a plain object", () => {
    const errors = validateConfig({ aliases: ["CABC"] as never });
    expect(errors.some((e) => e.includes("aliases"))).toBe(true);
  });

  it("rejects an aliases value that isn't a string", () => {
    const errors = validateConfig({ aliases: { token: 5 as never } });
    expect(errors.some((e) => e.includes("aliases"))).toBe(true);
  });

  it("rejects rpcHeaders that isn't a plain object", () => {
    const errors = validateConfig({ rpcHeaders: ["X-Api-Key"] as never });
    expect(errors.some((e) => e.includes("rpcHeaders"))).toBe(true);
  });

  it("rejects an rpcHeaders value that isn't a string", () => {
    const errors = validateConfig({ rpcHeaders: { "X-Api-Key": 5 as never } });
    expect(errors.some((e) => e.includes("rpcHeaders"))).toBe(true);
  });

  it("reports every error at once, not just the first", () => {
    const errors = validateConfig({
      network: "bogus" as never,
      pollingIntervalMs: -1,
    });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
