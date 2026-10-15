import * as fs from "fs";
import * as path from "path";
import { parseConfig, validateConfig } from "../src/utils/config";

/**
 * sdev.config.example.json is the copy-paste starting point for new users
 * (`cp sdev.config.example.json sdev.config.json`). Lock it down so the
 * example can never drift into a shape that `sdev config validate` rejects —
 * if a field is renamed or a placeholder stops being valid, this test fails.
 */
describe("sdev.config.example.json", () => {
  const examplePath = path.resolve(__dirname, "..", "sdev.config.example.json");

  it("exists and is valid JSON", () => {
    expect(fs.existsSync(examplePath)).toBe(true);
    const raw = fs.readFileSync(examplePath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("passes validateConfig with no errors", () => {
    const raw = fs.readFileSync(examplePath, "utf-8");
    const parsed = parseConfig(raw);
    expect(parsed).toHaveProperty("config");
    const config = (parsed as { config: unknown }).config;
    const errors = validateConfig(config as never);
    expect(errors).toEqual([]);
  });

  it("sets every documented field to a placeholder value", () => {
    const raw = fs.readFileSync(examplePath, "utf-8");
    const config = parseConfig(raw);
    expect("error" in config).toBe(false);
    const cfg = (config as { config: Record<string, unknown> }).config;
    // All five known keys are present so a new user sees every option.
    expect(cfg).toEqual(
      expect.objectContaining({
        network: expect.any(String),
        contracts: expect.any(Array),
        pollingIntervalMs: expect.any(Number),
        aliases: expect.any(Object),
        rpcHeaders: expect.any(Object),
      })
    );
  });
});
