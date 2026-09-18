#!/usr/bin/env node
/**
 * sdev — Soroban DevKit CLI
 *
 * Entry point. Registers all sub-commands and parses process.argv.
 * No business logic lives here — only command registration.
 */

import { Command } from "commander";
import { registerSimulate } from "./commands/simulate";
import { registerDecode } from "./commands/decode";
import { registerMonitor } from "./commands/monitor";
import { registerBindings } from "./commands/bindings";
import { registerChain } from "./commands/chain";
import { registerCompletion } from "./commands/completion";

// Read the version from package.json instead of duplicating it as a string
// literal here — a version bump in one place and not the other would mean
// `sdev --version` silently reports the wrong version.
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("sdev")
  .description("Soroban DevKit CLI — developer tooling for Soroban smart contracts on Stellar")
  .version(version);

registerSimulate(program);
registerDecode(program);
registerMonitor(program);
registerBindings(program);
registerChain(program);
registerCompletion(program);

program.parse(process.argv);
