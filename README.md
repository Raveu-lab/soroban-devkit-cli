# soroban-devkit-cli

> The command-line interface for the Soroban DevKit — simulate, decode, monitor, and generate bindings from your terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@soroban-devkit/cli)](https://www.npmjs.com/package/@soroban-devkit/cli)
[![CI](https://github.com/Raveu-lab/soroban-devkit-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Raveu-lab/soroban-devkit-cli/actions)

---

## What is this?

`soroban-devkit-cli` puts the full power of the Soroban DevKit in your terminal. One command to simulate a contract call. One command to watch a contract live. One command to decode an event you just copy-pasted from an explorer.

The CLI is built on top of [`soroban-devkit-core`](https://github.com/Raveu-lab/soroban-devkit-core) and exposes all its features through a clean, scriptable interface — no code required.

---

## Why it exists

Soroban developers today have the `stellar` CLI for deployment and the browser for inspecting events. There is nothing in between — no tool for quickly simulating a call during development, no way to tail contract events from a terminal, no one-liner to decode an XDR blob you found in a transaction.

`soroban-devkit-cli` fills that gap. It is the developer's Swiss Army knife for working with Soroban contracts day to day.

---

## Installation

Neither `@soroban-devkit/cli` nor `@soroban-devkit/core` is published to npm yet — `npm install -g @soroban-devkit/cli` will 404 until that happens. Until then, run it from source:

```bash
# Clone both repos as siblings — cli's package.json depends on core via
# "file:../soroban-devkit-core", so this exact layout is required:
#   some-directory/
#   ├── soroban-devkit-core/
#   └── soroban-devkit-cli/
git clone https://github.com/Raveu-lab/soroban-devkit-core.git
git clone https://github.com/Raveu-lab/soroban-devkit-cli.git

cd soroban-devkit-core && npm install && npm run build && cd ..
cd soroban-devkit-cli && npm install && npm run build

# Run it directly...
node dist/cli.js --version

# ...or put `sdev` on your PATH:
npm link
sdev --version
```

Requires Node.js >= 20 (inherited from `@soroban-devkit/core`'s `@stellar/stellar-sdk` dependency).

---

## Commands

### `sdev simulate`

Simulate a contract function call and inspect cost and footprint — no broadcast.

```bash
sdev simulate \
  --network testnet \
  --contract CXXXXXX... \
  --method transfer \
  --caller GXXXXXX... \
  --args '["GABC...", "GXYZ...", "1000000"]'
```

**Output:**
```
✔ Simulation successful

  Method:            transfer
  Contract:          CXXXXXX...
  Network:           testnet

  Return Value     : true

  Min Resource Fee : 1,204,312 stroops
  Instructions     : 1,000
```

`Return Value` is the invocation's decoded return value (same type mapping as `sdev decode`). A function returning `()` shows `null`, because Soroban represents both unit and `Option::None` as the same `scvVoid` — the two are indistinguishable on the wire, so the line is shown rather than hidden. It is omitted only when the simulation came back with no result at all.

`--args` values are type-inferred (see `ArgEncoder` in `@soroban-devkit/core`'s README) — plain integers infer the *signed* variant by default. If the target function's parameter is actually `u32`/`u64`/`u128`/`u256` (common for ids, counts, and thresholds), pass a single-key hint object instead of a plain number to force the unsigned type:

```bash
sdev simulate --contract CDAO... --method get_proposal --caller GXXX... --args '[{"$u32": 0}]'
```

Without the hint, such a call fails with a `WasmVm`/`UnreachableCodeReached` error rather than a clear message — that error means "check whether this argument should be unsigned," not necessarily a bug in the contract. Same applies to `sdev chain`'s `--steps` args.

`Bytes`/`BytesN` parameters need the `$bytes` hint for the same reason, and there is no inference to fall back on: a hex string is indistinguishable from a Symbol or a String, so a bare `"deadbeef"` encodes as a Symbol and a 64-character hash encodes as a String. Both reach the contract as the wrong type.

```bash
sdev simulate --contract CVAULT... --method claim --caller GXXX... \
  --args '[{"$bytes": "a1b2c3d4"}]'
```

The hint takes hex (optionally `0x`-prefixed, case-insensitive) or an array of byte values. Hex is what `sdev decode` prints for a `Bytes` value and what a generated binding types as `string`, so it round-trips directly.

`$i64`, `$i256`, `$timepoint` and `$duration` cover the remaining types inference can't reach. `Timepoint` and `Duration` are the ones that come up most — deadlines, cliffs, lock periods and expirations are all declared as one of the two, and a bare integer reaches the contract as an `i128` instead:

```bash
sdev simulate --contract CVEST... --method create --caller GXXX... \
  --args '[{"$timepoint": 1760000000}, {"$duration": 86400}]'
```

The full set of hints: `$u32`, `$u64`, `$u128`, `$u256`, `$i64`, `$i256`, `$timepoint`, `$duration`, `$bytes`. Plain integers and digit strings already cover `i32` and `i128`.

`--args` values can be an `M...` muxed address (encoded correctly as a contract argument), but `--caller` can't — a muxed address isn't a valid transaction source account. Passing one as `--caller` fails with a clear error telling you to use the underlying `G...` account instead.

If the simulation determined the call would only succeed after archived contract data is restored, the failure output includes a `Restore required` line with the stroops fee for the needed `RestoreFootprintOp`:

```
✖ Simulation failed

  Contract data needs restoration before this call can succeed.

  Restore required — fee: 555555 stroops
```

Actually building and submitting that restore operation is outside `sdev`'s scope (it only simulates) — this just tells you a restore is needed and what it costs, instead of a dead-end error.

---

### `sdev decode`

Decode a raw base64 XDR event blob into human-readable JSON.

```bash
sdev decode --data "AAAADwAAAAh0cmFuc2Zlcg=="
```

Or pipe from stdin:

```bash
echo "AAAADwAAAAh0cmFuc2Zlcg==" | sdev decode
```

Pass `--topics` (space-separated, one base64 XDR blob per topic) to decode a
Soroban event's topic list alongside its data:

```bash
sdev decode --data "..." --topics "AAAADwAAAAh0cmFuc2Zlcg==" "AAAAAA=="
```

**Output:**
```json
{
  "decodedTopics": [],
  "decodedData": "transfer"
}
```

---

### `sdev monitor`

Watch one or more contracts for events in real-time. Prints decoded events as they arrive.

If `--interval` is omitted, the polling interval isn't a fixed guess — it
adapts to real ledger close cadence (see `ContractMonitor` in
`@soroban-devkit/core`), clamped to 2-30 seconds. Pass `--interval` to pin
a fixed value instead.

```bash
sdev monitor \
  --network testnet \
  --contract CXXXXXX... \
  --filter transfer \
  --interval 3000
```

**Output:**
```
◎ Watching CXXXXXX... on testnet (polling every 3000ms)

[12:04:33] Ledger 1204312  transfer
  from:   GABC...
  to:     GXYZ...
  amount: 1000000

[12:04:41] Ledger 1204318  transfer
  from:   GXYZ...
  to:     GDEF...
  amount: 500000
```

Press `Ctrl+C` to stop.

Pass `--json` to print one JSON object per event instead — useful for piping into `jq` or another program without parsing the formatted output:

```bash
sdev monitor --network testnet --contract CXXXXXX... --json | jq '.decodedTopics'
```

---

### `sdev bindings`

Generate TypeScript bindings from a deployed contract's on-chain WASM spec.

```bash
sdev bindings generate \
  --network testnet \
  --contract CXXXXXX... \
  --output ./generated
```

**Output:**
```
✔ Bindings written to ./generated/CXXXXXX_bindings.ts
```

Generated methods encode `u32`/`u64`/`u128` arguments correctly without you having to think about it — the generator reads the contract's real spec and applies `ArgEncoder`'s unsigned hint automatically where needed.

---

### `sdev chain`

Simulate a sequence of contract calls, in order — checks whether each step of a planned multi-step flow would succeed (and what it would cost) before submitting any of it for real. Each call is simulated independently against current ledger state; this does not compose them into one atomic on-chain transaction.

```bash
sdev chain --network testnet --steps '[
  {"contract": "CTOKEN...", "method": "approve", "args": ["GDEX...", "1000000"], "caller": "GXXX..."},
  {"contract": "CDEX...",   "method": "swap",    "args": ["GXXX...", "1000000"], "caller": "GXXX..."}
]'
```

Stops at the first failing step by default; pass `--continue-on-failure` to run every step regardless. `--contract` in each step accepts an alias from `sdev.config.json`, same as `simulate`.

---

### `sdev completion`

Print a shell completion script for `bash`, `zsh`, or `fish`.

```bash
sdev completion bash > /etc/bash_completion.d/sdev   # or: >> ~/.bashrc
sdev completion zsh > "${fpath[1]}/_sdev"
sdev completion fish > ~/.config/fish/completions/sdev.fish
```

Completes top-level commands (`simulate`, `decode`, `monitor`, `bindings`, `chain`, `completion`, `config`) and each command's flags.

---

### `sdev config validate`

Validate `sdev.config.json`'s shape and report any errors — a typo (an unknown network name, a non-integer `pollingIntervalMs`, a non-string alias) otherwise loads silently and only surfaces much later as an opaque error deep inside whatever command happened to use the bad field.

```bash
sdev config validate
```

**Output:**
```
✔ sdev.config.json is valid
```
or, for an invalid file:
```
✖ sdev.config.json has 2 error(s):
  - network: "mainet" is not a valid network
  - pollingIntervalMs: must be a positive integer, got -5
```

Exits `0` if the file is valid or missing (no config file is a valid state — every field is optional), `1` if it has errors.

---

## Common Options

Not truly global — only the commands that actually talk to an RPC endpoint accept these (`simulate`, `monitor`, `bindings generate`, `chain`). `decode`, `completion`, and `config validate` don't touch the network at all and reject them with `error: unknown option` if passed.

| Flag | Description | Default | Commands |
|------|-------------|---------|----------|
| `--network` | `mainnet`, `testnet`, `futurenet`, `local` | `testnet` | `simulate`, `monitor`, `bindings generate`, `chain` |
| `--rpc-url` | Custom RPC endpoint (overrides `--network`) | — | `simulate`, `monitor`, `bindings generate`, `chain` |
| `--json` | Output raw JSON instead of formatted tables | `false` | `simulate`, `monitor`, `chain` |

---

## Configuration File

You can set defaults in a `sdev.config.json` file in your project root to avoid repeating flags:

```json
{
  "network": "testnet",
  "contracts": [
    "CXXXXXX...",
    "CYYYYYY..."
  ],
  "pollingIntervalMs": 5000,
  "aliases": {
    "token": "CXXXXXX...",
    "multisig": "CYYYYYY..."
  },
  "rpcHeaders": {
    "X-Api-Key": "..."
  }
}
```

`contracts` is the default contract list for `monitor` when `--contract` isn't passed. `pollingIntervalMs` is `monitor`'s default polling interval when `--interval` isn't passed — `--interval` still wins if both are set; omit both for adaptive polling calibrated from real ledger close cadence.

`aliases` lets `--contract` take a friendly name instead of a raw `C...` ID, in `simulate`, `bindings generate`, and `monitor`:

```bash
sdev simulate --contract token --method balance --caller GXXXXXX...
```

An unrecognized value is passed through unchanged, so this is purely additive — existing configs and raw contract IDs keep working exactly as before.

`rpcHeaders` is sent with every RPC request — useful for a paid provider that requires an API key. Combine with `--rpc-url` (also available on `simulate`, `bindings generate`, and `monitor`) to point at that provider:

```bash
sdev simulate --contract token --method balance --caller GXXXXXX... --rpc-url https://my-provider.example/rpc
```

Note: `bindings generate` accepts `--rpc-url` but does not send `rpcHeaders` — the underlying stellar-sdk call it uses has no way to attach custom headers.

---

## Project Structure

```
soroban-devkit-cli/
├── src/
│   ├── cli.ts             # Entry point, command registration
│   ├── commands/
│   │   ├── simulate.ts
│   │   ├── decode.ts
│   │   ├── monitor.ts
│   │   ├── bindings.ts
│   │   ├── chain.ts
│   │   └── completion.ts
│   └── utils/
│       ├── format.ts      # Table and color formatting helpers
│       ├── config.ts      # Config file loader, contract aliases
│       ├── network.ts     # Network name/RPC config resolution
│       └── completion.ts  # Shell completion script generation
├── tests/
│   ├── commands/
│   │   ├── simulate.test.ts
│   │   ├── decode.test.ts
│   │   ├── monitor.test.ts
│   │   └── chain.test.ts
│   └── utils/
│       ├── config.test.ts
│       ├── format.test.ts
│       ├── network.test.ts
│       └── completion.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

This project is open source and welcomes contributions from the Stellar developer community.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and how to pick up an issue.

**Good first issues** are tagged [`good first issue`](https://github.com/Raveu-lab/soroban-devkit-cli/issues?q=label%3A%22good+first+issue%22) on GitHub.

---

## Roadmap

- [ ] `sdev replay` — replay a historical transaction locally
- [ ] `sdev diff` — compare contract state before and after a call

See [CHANGELOG.md](CHANGELOG.md) for what's actually shipped so far.

---

## License

MIT — see [LICENSE](LICENSE).

Built for the Stellar ecosystem.
