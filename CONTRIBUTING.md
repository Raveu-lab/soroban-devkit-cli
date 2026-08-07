# Contributing to soroban-devkit-cli

This project is part of the **Stellar Wave Program** on [Drips](https://drips.network). Contributors earn rewards for completing issues during active Wave sprints.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- `soroban-devkit-core` built locally or installed via npm

### Setup

```bash
git clone https://github.com/soroban-devkit/soroban-devkit-cli
cd soroban-devkit-cli
npm install
npm run build

# Test the binary
node dist/cli.js --version
```

## Running Commands Locally

```bash
node dist/cli.js simulate --network testnet --contract CXXX --method my_fn --caller GXXX
node dist/cli.js decode --data "AAAA..."
node dist/cli.js monitor --network testnet --contract CXXX
```

## Picking Up an Issue

1. Browse [open issues](https://github.com/soroban-devkit/soroban-devkit-cli/issues)
2. Issues tagged `good first issue` are beginner-friendly
3. Comment to claim an issue before starting

## Adding a New Command

Follow the pattern in `src/commands/simulate.ts`:

1. Create `src/commands/your-command.ts`
2. Export `registerYourCommand(program: Command)`
3. Import and call it in `src/cli.ts`
4. Add formatting helpers to `src/utils/format.ts` if needed
5. Write tests in `tests/commands/your-command.test.ts`

## Pull Request Guidelines

- Run `npm run lint` and `npm test` before opening a PR
- Reference the issue: `feat: add sdev replay command (#12)`
- No Stellar SDK imports in command files — all logic goes through `@soroban-devkit/core`
