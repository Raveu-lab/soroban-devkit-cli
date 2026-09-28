import * as fs from "fs";
import * as path from "path";
import { Network } from "@soroban-devkit/core";
import { isValidNetwork } from "./network";

export interface SdevConfig {
  network?: Network;
  contracts?: string[];
  pollingIntervalMs?: number;
  /** Friendly name -> contract ID, so --contract can take an alias instead of a raw C... ID */
  aliases?: Record<string, string>;
  /** Extra HTTP headers sent with every RPC request — e.g. an API key for a paid provider */
  rpcHeaders?: Record<string, string>;
}

export const CONFIG_FILE = "sdev.config.json";

/**
 * Parse raw sdev.config.json text. Pure — no I/O — so it's testable without
 * touching the filesystem. Valid JSON that isn't an object (null, an array,
 * a string, a number) is rejected too: JSON.parse("null") returns null,
 * which used to be handed back as the config, crashing every command on
 * `config.network` with "Cannot read properties of null".
 */
export function parseConfig(raw: string): { config: SdevConfig } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `could not parse ${CONFIG_FILE}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { error: `${CONFIG_FILE} must contain a JSON object` };
  }
  return { config: parsed as SdevConfig };
}

/**
 * Load sdev.config.json from the current working directory.
 * Returns an empty config object if the file does not exist.
 * Returns an empty config and logs a warning if the file is malformed JSON
 * or isn't a JSON object.
 */
export function loadConfig(): SdevConfig {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(configPath)) return {};

  const result = parseConfig(fs.readFileSync(configPath, "utf-8"));
  if ("error" in result) {
    process.stderr.write(`Warning: ${result.error}, ignoring.\n`);
    return {};
  }
  return result.config;
}

/**
 * Resolve a --contract value against sdev.config.json's aliases map.
 * Returns the value unchanged if it isn't a known alias (i.e. it's already a raw contract ID).
 */
export function resolveContractId(idOrAlias: string, config: SdevConfig): string {
  return config.aliases?.[idOrAlias] ?? idOrAlias;
}

function isPlainStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((v) => typeof v === "string");
}

/**
 * Validate a loaded SdevConfig's shape, returning a list of human-readable
 * error messages (empty if the config is valid). loadConfig() itself never
 * validates the fields it reads — a typo (an unknown network name, a
 * non-integer pollingIntervalMs) previously loaded silently and only
 * surfaced much later as an opaque error deep inside whatever command
 * happened to use the bad field, far from where the actual mistake was.
 */
export function validateConfig(config: SdevConfig): string[] {
  const errors: string[] = [];

  if (config.network !== undefined && !isValidNetwork(config.network)) {
    errors.push(`network: "${config.network}" is not a valid network`);
  }

  if (config.pollingIntervalMs !== undefined) {
    const value = config.pollingIntervalMs;
    if (!Number.isInteger(value) || value <= 0) {
      errors.push(`pollingIntervalMs: must be a positive integer, got ${value}`);
    }
  }

  if (config.contracts !== undefined) {
    if (!Array.isArray(config.contracts)) {
      errors.push("contracts: must be an array of strings");
    } else if (!config.contracts.every((c) => typeof c === "string")) {
      errors.push("contracts: every entry must be a string");
    }
  }

  if (config.aliases !== undefined && !isPlainStringRecord(config.aliases)) {
    errors.push("aliases: must be an object mapping alias names to contract ID strings");
  }

  if (config.rpcHeaders !== undefined && !isPlainStringRecord(config.rpcHeaders)) {
    errors.push("rpcHeaders: must be an object mapping header names to string values");
  }

  return errors;
}
