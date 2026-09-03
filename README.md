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

```bash
npm install -g @soroban-devkit/cli
```

Verify the install:

```bash
sdev --version
```

Requires Node.js >= 18.

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

  ┌─────────────────────┬──────────────────┐
  │ Metric              │ Value            │
  ├─────────────────────┼──────────────────┤
  │ CPU Instructions    │ 1,204,312        │
  │ Memory Bytes        │ 46,820           │
  │ Min Resource Fee    │ 132 stroops      │
  └─────────────────────┴──────────────────┘
```

---

### `sdev decode`

Decode a raw base64 XDR event blob into human-readable JSON.

```bash
sdev decode --data "AAAABQAAAAdzdHJpbmcAAAA..."
```

Or pipe from stdin:

```bash
echo "AAAABQAAAAdzdHJpbmcAAAA..." | sdev decode
```

**Output:**
```json
{
  "type": "symbol",
  "value": "transfer"
}
```

---

### `sdev monitor`

Watch one or more contracts for events in real-time. Prints decoded events as they arrive.

```bash
sdev monitor \
  --network testnet \
  --contract CXXXXXX... \
  --filter transfer \
  --interval 3000
```

**Output:**
```
◎ Watching CXXXXXX... on testnet (polling every 3s)

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

Completes top-level commands (`simulate`, `decode`, `monitor`, `bindings`, `chain`, `completion`) and each command's flags.

---

## Global Options

| Flag | Description | Default |
|------|-------------|---------|
| `--network` | `mainnet`, `testnet`, `futurenet`, `local` | `testnet` |
| `--rpc-url` | Custom RPC endpoint (overrides `--network`) | — |
| `--json` | Output raw JSON instead of formatted tables | `false` |

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

---

## License

MIT — see [LICENSE](LICENSE).

Built for the Stellar ecosystem.
