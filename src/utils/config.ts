import * as fs from "fs";
import * as path from "path";
import { Network } from "@soroban-devkit/core";

export interface SdevConfig {
  network?: Network;
  contracts?: string[];
  pollingIntervalMs?: number;
  /** Friendly name -> contract ID, so --contract can take an alias instead of a raw C... ID */
  aliases?: Record<string, string>;
}

export const CONFIG_FILE = "sdev.config.json";

/**
 * Load sdev.config.json from the current working directory.
 * Returns an empty config object if the file does not exist.
 * Returns an empty config and logs a warning if the file is malformed JSON.
 */
export function loadConfig(): SdevConfig {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(configPath)) return {};

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as SdevConfig;
  } catch {
    process.stderr.write(`Warning: could not parse ${CONFIG_FILE}, ignoring.\n`);
    return {};
  }
}

/**
 * Resolve a --contract value against sdev.config.json's aliases map.
 * Returns the value unchanged if it isn't a known alias (i.e. it's already a raw contract ID).
 */
export function resolveContractId(idOrAlias: string, config: SdevConfig): string {
  return config.aliases?.[idOrAlias] ?? idOrAlias;
}
