import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { loadConfig, CONFIG_FILE } from "../../src/utils/config";

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
});
