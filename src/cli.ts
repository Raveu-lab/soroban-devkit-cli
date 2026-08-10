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

const program = new Command();

program
  .name("sdev")
  .description("Soroban DevKit CLI — developer tooling for Soroban smart contracts on Stellar")
  .version("0.1.0");

registerSimulate(program);
registerDecode(program);
registerMonitor(program);
registerBindings(program);

program.parse(process.argv);
