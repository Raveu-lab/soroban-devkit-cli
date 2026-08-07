# soroban-devkit-cli

> The command-line interface for the Soroban DevKit — simulate, decode, monitor, and generate bindings from your terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stellar Wave Program](https://img.shields.io/badge/Stellar-Wave%20Program-blueviolet)](https://stellar.org)
[![npm version](https://img.shields.io/npm/v/@soroban-devkit/cli)](https://www.npmjs.com/package/@soroban-devkit/cli)
[![CI](https://github.com/soroban-devkit/soroban-devkit-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/soroban-devkit/soroban-devkit-cli/actions)

---

## What is this?

`soroban-devkit-cli` puts the full power of the Soroban DevKit in your terminal. One command to simulate a contract call. One command to watch a contract live. One command to decode an event you just copy-pasted from an explorer.

The CLI is built on top of [`soroban-devkit-core`](https://github.com/soroban-devkit/soroban-devkit-core) and exposes all its features through a clean, scriptable interface — no code required.

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

## Global Options

| Flag | Description | Default |
|------|-------------|---------|
| `--network` | `mainnet`, `testnet`, `futurenet`, `local` | `testnet` |
| `--rpc-url` | Custom RPC endpoint (overrides `--network`) | — |
| `--json` | Output raw JSON instead of formatted tables | `false` |
| `--quiet` | Suppress all output except errors | `false` |

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
  "pollingIntervalMs": 5000
}
```

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
│   │   └── bindings.ts
│   └── utils/
│       ├── format.ts      # Table and color formatting helpers
│       └── config.ts      # Config file loader
├── tests/
│   └── commands/
│       ├── simulate.test.ts
│       └── decode.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

This project is part of the **Stellar Wave Program** on [Drips](https://drips.network). Contributors earn rewards for completing issues during active Wave sprints.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and how to pick up an issue.

**Good first issues** are tagged [`good first issue`](https://github.com/soroban-devkit/soroban-devkit-cli/issues?q=label%3A%22good+first+issue%22) on GitHub.

---

## Roadmap

- [ ] `sdev replay` — replay a historical transaction locally
- [ ] `sdev diff` — compare contract state before and after a call
- [ ] `sdev chain` — simulate a sequence of multi-step contract calls
- [ ] Shell autocompletion (bash, zsh, fish)
- [ ] `sdev.config.json` full support with contract aliases

---

## License

MIT — see [LICENSE](LICENSE).

Built for the Stellar ecosystem. Sponsored by the [Stellar Development Foundation](https://stellar.org) via the Stellar Wave Program.
