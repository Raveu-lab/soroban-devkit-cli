# Architecture — soroban-devkit-cli

## Overview

`soroban-devkit-cli` is a Node.js command-line application. It is a thin presentation layer over `soroban-devkit-core` — it handles argument parsing, output formatting, and user interaction. No business logic lives here. All Stellar/Soroban logic is delegated to core.

The CLI binary is `sdev`, registered via the `bin` field in `package.json`.

---

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Terminal / Shell                       │
│              sdev simulate --network testnet ...         │
└───────────────────────┬─────────────────────────────────┘
                        │ argv
┌───────────────────────▼─────────────────────────────────┐
│                     cli.ts (entry point)                 │
│              Commander.js program registration           │
└───────┬───────────────┬──────────────┬──────────────────┘
        │               │              │
┌───────▼──────┐ ┌──────▼──────┐ ┌────▼────────────┐
│ simulate.ts  │ │  decode.ts  │ │   monitor.ts    │
│  (command)   │ │  (command)  │ │   (command)     │
└───────┬──────┘ └──────┬──────┘ └────┬────────────┘
        │               │              │
        └───────────────┴──────────────┘
                        │ calls
┌───────────────────────▼─────────────────────────────────┐
│               soroban-devkit-core                        │
│  ContractSimulator | EventDecoder | ContractMonitor      │
│  BindingGenerator                                        │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                utils/format.ts                           │
│         chalk | table | ora spinner                      │
└─────────────────────────────────────────────────────────┘
```

---

## Entry Point — `cli.ts`

The root file. Responsibilities:
- Instantiate a `commander` `Program`
- Register all sub-commands by importing from `commands/`
- Parse `process.argv`
- Handle top-level errors and exit codes

```ts
// cli.ts (simplified)
import { Command } from 'commander';
import { registerSimulate } from './commands/simulate';
import { registerDecode } from './commands/decode';
import { registerMonitor } from './commands/monitor';
import { registerBindings } from './commands/bindings';

const program = new Command();
program.name('sdev').version('0.1.0');

registerSimulate(program);
registerDecode(program);
registerMonitor(program);
registerBindings(program);

program.parse(process.argv);
```

---

## Command Module Pattern

Every command follows the same pattern:

```ts
// commands/simulate.ts
export function registerSimulate(program: Command): void {
  program
    .command('simulate')
    .description('...')
    .option('--network <network>', '...', 'testnet')
    .option('--contract <id>', '...')
    .option('--method <method>', '...')
    .option('--caller <address>', '...')
    .option('--args <json>', '...')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      // 1. Validate and parse options
      // 2. Call soroban-devkit-core
      // 3. Format and print output
    });
}
```

**Rule:** No Stellar SDK imports in command files. All blockchain logic goes through `soroban-devkit-core`.

---

## Command Breakdown

### `simulate`

**Input:** `--contract`, `--method`, `--caller`, `--args` (JSON array), `--network`

**Flow:**
```
parse --args JSON string → xdr.ScVal[]
ContractSimulator.simulate(contractId, method, args, caller)
  └─ SimulationResult
       └─ format.printSimulationResult(result) OR JSON.stringify
```

**Output modes:**
- Default: formatted table with cost metrics
- `--json`: raw `SimulationResult` as JSON

---

### `decode`

**Input:** `--data` (base64 XDR string) OR stdin pipe

**Flow:**
```
read base64 XDR from --data or process.stdin
EventDecoder.decode({ data, topics: [] })
  └─ decodedData
       └─ JSON.stringify(decodedData, null, 2)
```

**Stdin support:** If `--data` is not provided, the command reads from `process.stdin`, enabling pipe usage:

```bash
echo "AAAAB..." | sdev decode
```

---

### `monitor`

**Input:** `--contract` (repeatable), `--filter`, `--interval`, `--network`

**Flow:**
```
ContractMonitor.watch({ contractIds, eventFilter, pollingIntervalMs })
  .on('event', (e) => format.printEvent(e))
  .on('error', (err) => format.printError(err))
  .start()

process.on('SIGINT', () => monitor.stop())
```

**Long-running:** This command runs indefinitely until `Ctrl+C`. The `ora` spinner indicates polling activity between events.

---

### `bindings`

**Sub-commands:** `bindings generate`

**Input:** `--contract`, `--output`, `--network`

**Flow:**
```
BindingGenerator({ contractId, outputDir, network }).generate()
  └─ writes file to disk
       └─ print success path
```

---

## Utilities

### `utils/format.ts`

All terminal output formatting. Imports `chalk` (colors) and `table` (ASCII tables). No Stellar logic.

| Function | Description |
|----------|-------------|
| `printSimulationResult(result)` | Renders cost/footprint as a formatted table |
| `printEvent(event)` | Renders a decoded contract event with timestamp and ledger |
| `printError(err)` | Red-colored error message to stderr |
| `printSuccess(msg)` | Green checkmark + message |

### `utils/config.ts`

Loads `sdev.config.json` from the current working directory if it exists. Merges config file values with CLI flags, with CLI flags taking precedence.

```ts
interface SdevConfig {
  network?: Network;
  contracts?: string[];
  pollingIntervalMs?: number;
}
```

---

## Error Handling Strategy

- All async command actions are wrapped in try/catch
- Errors print to `stderr` via `format.printError()`
- Non-zero exit codes on failure: `process.exit(1)`
- User input validation (missing flags, invalid JSON args) fails fast before any network calls

---

## Output Modes

Every command supports `--json` flag for machine-readable output. When `--json` is set:
- No spinners, no colors, no tables
- Raw JSON printed to stdout
- Errors printed as `{ "error": "message" }` to stderr

This makes `sdev` scriptable in shell pipelines and CI environments.

---

## Project Structure

```
soroban-devkit-cli/
├── src/
│   ├── cli.ts                  # Entry point
│   ├── commands/
│   │   ├── simulate.ts
│   │   ├── decode.ts
│   │   ├── monitor.ts
│   │   └── bindings.ts
│   └── utils/
│       ├── format.ts
│       └── config.ts
├── tests/
│   └── commands/
│       ├── simulate.test.ts
│       └── decode.test.ts
├── package.json
├── tsconfig.json
├── ARCHITECTURE.md
└── README.md
```

---

## Dependencies

| Package | Why |
|---------|-----|
| `@soroban-devkit/core` | All Stellar/Soroban logic |
| `commander` | Argument parsing and sub-command routing |
| `chalk` | Terminal color output |
| `ora` | Spinner for long-running operations |
| `table` | ASCII table rendering for simulation results |

---

## Adding a New Command

1. Create `src/commands/your-command.ts`
2. Export a `registerYourCommand(program: Command)` function
3. Import and call it in `cli.ts`
4. Add output formatting to `utils/format.ts` if needed
5. Write tests in `tests/commands/your-command.test.ts`
6. Update this document and the README
