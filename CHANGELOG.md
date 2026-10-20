# Changelog

All notable changes to `sdev` (`@soroban-devkit/cli`) are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project hasn't cut a tagged release yet (still `0.1.0`), so everything below lives under **Unreleased**.

## Unreleased

### Known issues

- Transitively inherits `soroban-devkit-core`'s dependency chain, including the `@stellar/stellar-sdk` security advisories documented in [core's CHANGELOG](https://github.com/Raveu-lab/soroban-devkit-core/blob/main/CHANGELOG.md#known-issues).

### Added

- `demo/` — a walkthrough of every command against the live testnet deployments, with real captured output rather than illustrative snippets, plus `demo/run.sh` to reproduce it. The repo previously had no way for a reader to see the tool working without installing it, cloning the contracts and finding a deployed address themselves.

- `sdev simulate`, `sdev decode`, `sdev monitor`, `sdev bindings generate` — the initial scaffold.
- `sdev.config.json` support for contract aliases (`--contract` can take a friendly name instead of a raw `C...` ID).
- `sdev.config.json`'s `rpcHeaders`, for paid RPC providers that need an API key header.
- `sdev completion <shell>` — bash/zsh/fish completion scripts.
- `sdev chain` — simulate a sequence of contract calls in order, exercising core's `simulateSequence`.
- `sdev simulate` now surfaces a simulation's decoded return value, not just cost/footprint.
- `sdev monitor --json` — one JSON object per event, for piping into `jq` or another program.
- `sdev config validate` — validates `sdev.config.json`'s shape and reports errors, instead of a bad field only surfacing later as an opaque error deep inside an unrelated command.
- `sdev simulate` surfaces `restoreFee` when a simulation needs a restore, instead of a dead-end error message.

### Fixed

- `npm run lint`'s glob (`src/**/*.ts`) was unquoted, so the shell expanded it before eslint ever saw it, and the default shell has `globstar` off — the pattern matched only files inside subdirectories, never `src/cli.ts` itself. The entry point has been unlinted since this script was written. Switched to `eslint src --ext .ts`, which does its own recursion; confirmed it actually reaches `cli.ts` by injecting an unused variable there and watching lint catch it. Fixing it surfaced a real `@typescript-eslint/no-var-requires` error in `cli.ts`, now resolved by importing `package.json`'s `version` directly (`resolveJsonModule` added to `tsconfig.json`) instead of a bare `require()`.
- `sdev simulate` imported `@stellar/stellar-sdk` directly instead of going through core's `ArgEncoder` — forced consumers to depend on the Stellar SDK themselves.
- `--rpc-url` was declared as a flag on `sdev simulate` but silently had no effect.
- `--interval`/`--start-ledger` on `sdev monitor`: an unparseable value silently became `NaN`, and `setTimeout(fn, NaN)` fires almost immediately rather than erroring.
- `--interval` had a hardcoded Commander default, which meant core's adaptive-polling feature (active only when the option is truly `undefined`) was unreachable from the CLI entirely.
- `sdev bindings generate`'s success message re-derived the output filename convention independently instead of reading it from `BindingGenerator.outputPath()`, risking silent drift between the two.
- Shell completion offered `bindings`' flags directly instead of its `generate` subcommand first — Commander doesn't even recognize those flags until `generate` is typed.
- `sdev monitor` never read `sdev.config.json`'s `pollingIntervalMs`, despite it being documented as a working field.
- `sdev --version` was a hardcoded string literal, so a version bump in `package.json` and not here would silently report the wrong version.
- `formatEvent` leaked the bare string `"Invalid Date"` into output for an unparseable `ledgerClosedAt`, instead of a clear fallback.
- `sdev monitor` only handled `SIGINT`, not `SIGTERM` — Docker/Kubernetes send `SIGTERM` on shutdown, so the monitor got killed without its cleanup running.
- `loadConfig()` handed back `null`/an array/etc. as-is for valid-but-non-object JSON (`JSON.parse("null")` returns `null`), crashing every command with `Cannot read properties of null`. `sdev config validate` now reports it as a clear error instead.
- CI's Docker build ran `npm test` but never `npm run lint` — a lint violation could reach `main` undetected. Adding the lint step then exposed a second bug: `.dockerignore` excluded `.eslintrc.json`, so lint failed immediately with "couldn't find a configuration file" once it actually ran.
- Every command's `catch` block did `err instanceof Error ? err.message : String(err)` independently, which degraded to the literal string `"[object Object]"` for anything thrown that isn't a real `Error` — confirmed live: `@stellar/stellar-sdk/contract`'s `Client.from()` throws a plain `{ code, message }` object for a non-existent contract, so `sdev bindings generate` against a bad contract ID printed only `[object Object]` instead of the SDK's own useful message. Extracted a shared `extractErrorMessage()` that checks for a string `.message` on any object, not just `Error` instances.
- This repo had no GitHub issue templates at all, unlike `soroban-devkit-contracts`/`soroban-devkit-core` (both have a bug report template, `core` also has a feature request one) — anyone filing a bug against `sdev` got GitHub's generic blank form instead.
- No PR template existed in any of the three sibling repos either. `.github/PULL_REQUEST_TEMPLATE.md` now mirrors `CONTRIBUTING.md`'s existing "Pull Request Guidelines" as a checklist.
- `sdev monitor`'s startup banner never mentioned `--filter`, so a filtered watch printed a line byte-identical to an unfiltered one and there was no way to tell from the output whether the filter had taken effect. That is exactly how a core bug dropping `--filter` when `--contract` was omitted stayed invisible; it now reads `Watching all contracts on testnet for "transfer" events`.
- `--interval`/`--start-ledger` used `parseInt`, which stops at the first character it can't read and returns the prefix, so a malformed value became a plausible-looking wrong number instead of an error: `10e3` meant 10 rather than 10000, `5000abc` was accepted as 5000, `5.9` truncated to 5, and `1,000` meant 1 — a one-millisecond poll against a public RPC endpoint. The flag now has to be all digits and within safe-integer range. This is the same guard that previously only caught the `NaN` case; a test had explicitly blessed the decimal truncation as "matching parseInt's own behavior", which described the implementation rather than anything desirable.
- `sdev monitor` accepted a fractional `pollingIntervalMs` from `sdev.config.json` while `sdev config validate` rejected the very same file, the two having checked `Number.isFinite` and `Number.isInteger` respectively. They now agree.
- Shell completion's command/flag table was kept in sync with `src/commands/*.ts` purely by hand, with nothing to catch drift — a new command or flag would silently go missing from every shell's completions, and completion has already drifted once before (offering `bindings`' flags ahead of its required `generate` subcommand). A test now diffs the table against the real Commander program, verified to fail on a missing flag, a stale flag, and a missing command.
- The README claimed `Return Value` was "omitted for calls with no return value". It isn't: Soroban represents unit as `scvVoid`, which decodes to `null`, so a `transfer`/`mint`/`approve` style call prints `Return Value : null`. The line is only omitted when the simulation returns no result at all. Documented the real behaviour, including why `null` isn't hidden — `Option::None` is the same `scvVoid` on the wire, so suppressing it would hide a genuine result.
- `sdev config validate` checked that `contracts` entries and `aliases` values were strings, but never that they were valid contract IDs — a 56-character placeholder starting with `C` passed with no errors even though it wasn't a real strkey. This is not theoretical: an external PR's example config used exactly that shape (`CABCDEF01234567890...`, which fails because base32 excludes `0`/`1`/`8`/`9`) and `sdev config validate` reported it clean. Now checked with core's `isValidContractId`, which names the specific entry or alias that's wrong.
- `sdev config validate` accepted any unknown key in `sdev.config.json` without comment, so `{"wat": 1}` reported the config as valid. A misspelled key is the most common config mistake and the exact thing this command exists to catch: nothing ever reads it, so `pollingInterval` (missing the `Ms`) leaves `sdev monitor` silently on adaptive polling, and `alias` (missing the `es`) leaves `--contract` passing the alias through as a literal contract ID. Unknown keys are now reported, with the valid key names listed.
- The repo had no actual `LICENSE` file — `package.json` declared `"license": "MIT"`, but there was never an actual license grant for the code, only a field claiming one.

### Changed

- Updated to `soroban-devkit-core`'s current `SimulationResult` shape after a breaking change there.
- Removed the unused `chalk`, `table`, and `ora` dependencies.
- CI replaced a fragile checkout-core-then-build workflow with a Docker multi-stage build (`core-builder` → `cli-builder` → `runtime`).
