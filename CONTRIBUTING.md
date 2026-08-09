# Contributing to soroban-devkit-cli

This project is part of the **Stellar Wave Program** on [Drips](https://drips.network). Contributors earn rewards for completing issues during active Wave sprints.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Setup

```bash
git clone https://github.com/Raveu-lab/soroban-devkit-cli
cd soroban-devkit-cli
npm install
npm run build

# Test the binary
node dist/cli.js --version
```

### Running Commands Locally

```bash
node dist/cli.js simulate --network testnet --contract CXXX --method my_fn --caller GXXX
node dist/cli.js decode --data "AAAA..."
node dist/cli.js monitor --network testnet --contract CXXX
```

---

## Coding Convention — Test-Driven Development (TDD)

This project follows **strict TDD**. Every contribution must follow this cycle:

```
1. Write a failing test that describes the behaviour you want
2. Write the minimal implementation to make the test pass
3. Refactor — clean up without changing behaviour
4. Repeat
```

**No implementation code is accepted without a corresponding test.**

### What this looks like in practice

Write the test first:

```ts
// tests/utils/format.test.ts
it("returns a success string when simulation succeeded", () => {
  const result = { success: true, cost: { cpuInstructions: "1000", memoryBytes: "500" }, ... };
  const output = formatSimulationResult(result, "CTEST", "transfer", "testnet");
  expect(output).toContain("Simulation successful");
});
```

Run it — it should fail:

```bash
npm test
# FAIL — formatSimulationResult is not implemented
```

Then implement the function. Run again — it should pass.

---

## SOLID Principles

- **Single Responsibility** — commands only parse args and print output. All Stellar logic lives in `@soroban-devkit/core`
- **Small, focused functions** — `formatSimulationResult`, `formatEvent`, `formatError` each do one thing
- **Pure formatting functions** — `format.ts` functions take data and return strings. They do not write to stdout. Commands call them and handle printing. This makes formatters independently testable without capturing stdout

---

## Code Standards

- **Method names describe what they do** — `formatEvent`, `loadConfig`, `registerSimulate` — not `process` or `run`
- No Stellar SDK imports in command files — all blockchain logic goes through `@soroban-devkit/core`
- Formatting functions in `format.ts` must be pure — no side effects
- All async command actions wrapped in try/catch — errors go to stderr, non-zero exit on failure

---

## Development Workflow

```bash
# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

---

## Adding a New Command

Follow the pattern in `src/commands/simulate.ts`:

1. **Write tests first** in `tests/commands/your-command.test.ts`
2. Create `src/commands/your-command.ts`
3. Export `registerYourCommand(program: Command)`
4. Import and call it in `src/cli.ts`
5. Add pure formatting helpers to `src/utils/format.ts` if needed — with tests

---

## Picking Up an Issue

1. Browse [open issues](https://github.com/Raveu-lab/soroban-devkit-cli/issues)
2. Issues tagged `good first issue` are beginner-friendly
3. Comment to claim an issue before starting

---

## Pull Request Guidelines

- Tests must be written before or alongside implementation — not after
- All tests must pass: `npm test`
- Reference the issue: `feat: add sdev replay command (#12)`
- No Stellar SDK imports in command files
