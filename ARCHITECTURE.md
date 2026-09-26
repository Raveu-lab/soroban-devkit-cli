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
└───────┬───────────────┬──────────────┬───────────────────┘
        │               │              │                   │
┌───────▼──────┐ ┌──────▼──────┐ ┌────▼────────┐ ┌───────▼──────┐
│ simulate.ts  │ │  decode.ts  │ │ monitor.ts  │ │ bindings.ts  │
│  (command)   │ │  (command)  │ │  (command)  │ │  (command)   │
└───────┬──────┘ └──────┬──────┘ └────┬────────┘ └───────┬──────┘
        │               │              │                   │
        └───────────────┴──────────────┴───────────────────┘
                        │ calls
┌───────────────────────▼─────────────────────────────────┐
│               soroban-devkit-core                        │
│  ContractSimulator | EventDecoder | ContractMonitor      │
│  BindingGenerator                                        │
└─────────────────────────────────────────────────────────┘
        │
        ▼
```

`chain.ts` is a fifth command, omitted above only for diagram space — it fits the same box row as the other four, calling into core's `ContractSimulator.simulateSequence()`. `completion.ts` is the sixth and the real exception: it never calls into `soroban-devkit-core` at all — it only reads the static command/flag table in `utils/completion.ts` and prints a script. `config.ts` (`sdev config validate`) is the seventh, and doesn't call into `soroban-devkit-core` either — it only validates `utils/config.ts`'s own `SdevConfig` shape. All are still registered from `cli.ts` the same way as everything else.

```
┌─────────────────────────────────────────────────────────┐
│                utils/format.ts                           │
│    plain strings + toLocaleString() — no color/table lib  │
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

**Restore-required results:** `SimulationResult.needsRestore`/`restoreFee` (added in `@soroban-devkit/core`'s `ContractSimulator` — see its own ARCHITECTURE.md) previously had no CLI-visible effect at all; `formatSimulationResult`'s failure branch only printed `result.error`, silently dropping `restoreFee` even though core now computes it. It now appends a `Restore required — fee: N stroops` line when `needsRestore` is true.

---

### `decode`

**Input:** `--data` (base64 XDR string) OR stdin pipe, plus optional `--topics <base64...>`

**Flow:**
```
read base64 XDR from --data or process.stdin
buildDecodedOutput(data, topics)   → pure, testable without a CLI process
  └─ EventDecoder.decode({ data, topics, ... })
       └─ { decodedTopics, decodedData }
            └─ JSON.stringify(output, null, 2)
```

**Stdin support:** If `--data` is not provided, the command reads from `process.stdin`, enabling pipe usage:

```bash
echo "AAAAB..." | sdev decode
```

---

### `monitor`

**Input:** `--contract` (repeatable), `--filter`, `--interval`, `--network`, `--rpc-url`, `--start-ledger`, `--json`

**Flow:**
```
resolvePollingInterval(opts.interval, config.pollingIntervalMs) → pollingIntervalMs | undefined
parsePositiveInt(opts.startLedger, "--start-ledger")            → startLedger (if provided)
  │
ContractMonitor.watch({ contractIds, eventFilter, pollingIntervalMs, startLedger })
  .on('event', (e) => opts.json ? format.printEventJson(e) : format.printEvent(e))
  .on('error', (err) => format.printError(err))
  .start()

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

`--json` prints one JSON object per event (the full `ContractEvent` — raw base64 `topics`/`data` alongside `decodedTopics`/`decodedData`) instead of the human-formatted block, so a long-running stream stays consumable by another program (`jq`, a log pipeline) without parsing formatted text. Mirrors the `--json` flag already on `simulate`/`chain`, which this command was missing.

Both signals share the same `shutdown` handler — `SIGTERM` matters for running `sdev monitor` under a container/orchestrator (Docker/Kubernetes send `SIGTERM` on stop, not `SIGINT`), which would otherwise skip the `monitor.stop()` cleanup entirely.

`parsePositiveInt` exists because a bare `parseInt` on an invalid `--interval` silently produces `NaN`, and `setTimeout(fn, NaN)` fires after ~0ms rather than throwing — an unvalidated typo would have hammered the RPC in a tight loop instead of failing with a clear error.

`resolvePollingInterval` returns `undefined` when `--interval` is omitted, rather than defaulting it via Commander's own option default. `pollingIntervalMs: undefined` is what tells `ContractMonitor` to calibrate an adaptive interval instead of using a fixed one — a Commander-level default would have made it always defined, silently disabling adaptive polling from the CLI entirely.

**Long-running:** This command runs indefinitely until `Ctrl+C`. Progress is indicated by a status line written to stderr between polling cycles.

---

### `bindings`

**Sub-commands:** `bindings generate`

**Input:** `--contract`, `--output`, `--network`, `--rpc-url`

**Flow:**
```
BindingGenerator({ contractId, outputDir, network }).generate()
  └─ writes file to disk
       └─ print success path
```

Note: `--rpc-url` works here (core's `BindingGenerator` accepts a full `NetworkConfig`), but `rpcHeaders` from `sdev.config.json` is not sent — core's underlying `Client.from()` call has no headers option.

---

### `chain`

**Input:** `--steps` (JSON array of `{ contract, method, args, caller }`), `--network`, `--rpc-url`, `--continue-on-failure`, `--json`

**Flow:**
```
parseSteps(opts.steps)          → ChainStep[], validated (min 1, required fields)
  │
  └─ simulator.simulateSequence(steps.map(...), { stopOnFailure })
       └─ print each result, prefixed "— step N/M: method —"
```

Each step's `contract` goes through the same `resolveContractId()` alias resolution as `simulate`. This is core's `simulateSequence()` under the hood — see its own docs for why this checks "would each step succeed" rather than composing steps into one atomic transaction.

---

### `completion`

**Input:** one positional argument, `<shell>` (`bash`, `zsh`, or `fish`)

**Flow:**
```
getCompletionScript(shell)   ← pure string generation, no shell invoked
  └─ print script to stdout
```

The command list and each command's flags are declared once in `utils/completion.ts` — keep that in sync when adding a command or flag elsewhere.

`bindings` is the one entry with a `subcommands: ["generate"]` field — Commander's nested-command pattern (`sdev bindings generate`, not `sdev bindings --contract ...`). Each generator offers the subcommand name at that position before falling into the flags case; without this, completing right after `bindings` offered `generate`'s flags directly, which Commander doesn't even recognize until `generate` itself is typed.

---

### `config`

**Input:** none (reads `sdev.config.json` from the current working directory directly, not via `--` flags)

**Flow:**
```
fs.existsSync(CONFIG_FILE)?
  │
  ├─ no  → print "No sdev.config.json found — nothing to validate." → exit 0
  │
  └─ yes → loadConfig() → validateConfig(config) → string[] of errors
             │
             ├─ empty → print "sdev.config.json is valid" → exit 0
             └─ non-empty → formatValidationResult(errors) → exit 1
```

`validateConfig` (in `utils/config.ts`) is the actual check — pure, so it's tested without touching the filesystem. `loadConfig()` itself never validated the fields it reads; a typo (`"mainet"` instead of `"mainnet"`, a negative `pollingIntervalMs`) previously loaded silently and only surfaced much later as an opaque error deep inside whatever command happened to use the bad field, far from where the actual mistake was. `config` is Commander's nested-command pattern too (`sdev config validate`), same shape as `bindings generate` — `subcommands: ["validate"]` in `utils/completion.ts`'s `COMMANDS` table.

---

## Utilities

### `utils/format.ts`

All terminal output formatting — plain strings and stdlib `toLocaleString()` for number formatting, no color/table library dependency. No Stellar logic.

| Function | Description |
|----------|-------------|
| `printSimulationResult(result)` | Renders return value (if any), cost, and footprint |
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
  aliases?: Record<string, string>;    // --contract can pass a friendly name instead of a raw C... ID
  rpcHeaders?: Record<string, string>; // sent with every RPC request, e.g. an API key
}
```

`resolveContractId(idOrAlias, config)` resolves `aliases`; an unrecognized value passes through unchanged.

### `utils/network.ts`

Resolves a `--network` name (or `sdev.config.json`'s `network`) to a full `NetworkConfig`, optionally overriding `rpcUrl` (from `--rpc-url`) and attaching `headers` (from `rpcHeaders`). Always returns a new object — never mutates core's shared `NETWORK_CONFIGS` entries.

### `utils/completion.ts`

Generates bash/zsh/fish completion scripts from one command+flags table (`COMMANDS`). Pure string generation — no shell is invoked, nothing is written to disk here; `commands/completion.ts` handles printing to stdout.

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
│   │   ├── bindings.ts
│   │   ├── chain.ts
│   │   ├── completion.ts
│   │   └── config.ts
│   └── utils/
│       ├── format.ts
│       ├── config.ts
│       ├── network.ts
│       └── completion.ts
├── tests/
│   ├── commands/
│   │   ├── simulate.test.ts
│   │   ├── decode.test.ts
│   │   ├── monitor.test.ts
│   │   ├── bindings.test.ts
│   │   ├── chain.test.ts
│   │   └── config.test.ts
│   └── utils/
│       ├── config.test.ts
│       ├── format.test.ts
│       ├── network.test.ts
│       └── completion.test.ts
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
