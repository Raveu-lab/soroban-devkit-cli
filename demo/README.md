# Demo

A walkthrough of `sdev` against **live contracts on Stellar testnet**. Every block
below is output captured from a real run — no illustrative or hand-written output.

Reproduce the whole thing with [`run.sh`](run.sh):

```bash
npm run build
./demo/run.sh
```

The contracts are the ones deployed from
[`soroban-devkit-contracts`](https://github.com/Raveu-lab/soroban-devkit-contract),
listed in that repo's `ADDRESSES.md`:

| Contract | Address |
|----------|---------|
| `token` | `CCEQRERHTDQU5Q45JRBRWSFF6QS22TWRURAIOH27FK23ZPOB6YNXRHSX` |
| `vesting` | `CB3DUVIYDN3AJOKHSX6YIXGDVEA3ZPXHHXHTURFP2VYYVHJYHWGONUDL` |
| `event-rich` | `CAVHZ2HA3MYBQRTGBSBWMJPABL4L7OQYLPOLSGQNCUYEYZLWMH2F6LFR` |

---

## 1. Simulate a call before sending it

See what a contract call costs and what it returns, without submitting a
transaction or spending anything.

```bash
sdev simulate \
  --contract CCEQRERHTDQU5Q45JRBRWSFF6QS22TWRURAIOH27FK23ZPOB6YNXRHSX \
  --method balance \
  --caller GC3BJ52UL6CBAJBSZRX5DIPHXUW6OGJFVWMQKV3GLBMXHEZ66BWLXZN6 \
  --args '["GC3BJ52UL6CBAJBSZRX5DIPHXUW6OGJFVWMQKV3GLBMXHEZ66BWLXZN6"]' \
  --network testnet
```

```
✔ Simulation successful

  Method:            balance
  Contract:          CCEQRERHTDQU5Q45JRBRWSFF6QS22TWRURAIOH27FK23ZPOB6YNXRHSX
  Network:           testnet

  Return Value     : "996000"

  Min Resource Fee : 53,550 stroops
  Instructions     : 510,379
```

`Return Value` is the invocation's actual decoded return value, not just a cost
estimate — the same decoding `sdev decode` uses.

---

## 2. Generate typed TypeScript bindings from a deployed contract

Reads the contract's spec straight off the chain. No ABI file, no local source.

```bash
sdev bindings generate \
  --contract CB3DUVIYDN3AJOKHSX6YIXGDVEA3ZPXHHXHTURFP2VYYVHJYHWGONUDL \
  --network testnet \
  --output ./generated
```

```
✔ Bindings written to ./generated/CB3DUVIY_bindings.ts
```

The generated file, abridged:

```ts
async get_schedule(id: number, callerAddress: string): Promise<SimulationResult> {
  return this.simulator.simulate(
    this.contractId,
    "get_schedule",
    this.encoder.encodeArgs([{ $u32: id }]),
    callerAddress
  );
}

async create_vesting(depositor: string, beneficiary: string, token: string, total_amount: string, start_time: string, cliff_duration: string, vesting_duration: string, callerAddress: string): Promise<SimulationResult> {
  return this.simulator.simulate(
    this.contractId,
    "create_vesting",
    this.encoder.encodeArgs([depositor, beneficiary, token, total_amount, { $u64: start_time }, { $u64: cliff_duration }, { $u64: vesting_duration }]),
    callerAddress
  );
}
```

Note the `{ $u32: id }` and `{ $u64: start_time }` wrappers. A plain number
encodes as `i32` and a digit string as `i128`, so a `u32` or `u64` parameter
would otherwise receive the wrong XDR type and fail with an opaque
`UnreachableCodeReached` host trap. The on-chain spec knows the real type, so
the generator pins it.

---

## 3. Decode raw XDR

These two values are real event fields, pulled from transaction
[`4c7d5267…a4e5290c`](https://stellar.expert/explorer/testnet/tx/4c7d5267869b58f14db30643782d9c9d84facb0fde76208568997622a4e5290c)
on testnet, emitted by `event-rich.emit_time_types()`.

```bash
sdev decode --data "AAAABwAAAABlU/EA" --topics "AAAADwAAAA90aW1lcG9pbnRfZXZlbnQA"
```

```json
{
  "decodedTopics": [
    "timepoint_event"
  ],
  "decodedData": "1700000000"
}
```

```bash
sdev decode --data "AAAACAAAAAAAAA4Q" --topics "AAAADwAAAA5kdXJhdGlvbl9ldmVudAAA"
```

```json
{
  "decodedTopics": [
    "duration_event"
  ],
  "decodedData": "3600"
}
```

`Timepoint` and `Duration` are two of the XDR types the decoder handles; so are
`u256`/`i256`, `Address`, `Bytes`, nested `Vec`/`Map`, and `Error`. The
`event-rich` contract exists specifically to emit one of each, so the decoder is
tested against real chain output rather than fixtures.

---

## 4. Simulate a sequence of calls

Check a multi-step flow end to end before committing to any of it.

```bash
sdev chain --network testnet --steps '[
  {"contract":"CCEQ...","method":"balance","args":["GC3B..."],"caller":"GC3B..."},
  {"contract":"CCEQ...","method":"balance","args":["GCTQ..."],"caller":"GC3B..."}
]'
```

```
— step 1/2: balance —

✔ Simulation successful

  Method:            balance
  Return Value     : "996000"

  Min Resource Fee : 53,569 stroops
  Instructions     : 510,379


— step 2/2: balance —

✔ Simulation successful

  Method:            balance
  Return Value     : "0"

  Min Resource Fee : 13,332 stroops
  Instructions     : 490,267
```

---

## 5. Catch mistakes early

Given an `sdev.config.json` with a misspelled key:

```json
{
  "network": "testnet",
  "pollingInterval": 5000,
  "aliases": { "dkt": "CCEQRERHTDQU5Q45JRBRWSFF6QS22TWRURAIOH27FK23ZPOB6YNXRHSX" }
}
```

```bash
sdev config validate
```

```
✖ sdev.config.json has 1 error(s):
  - pollingInterval: unknown setting — valid keys are network, contracts, pollingIntervalMs, aliases, rpcHeaders
```

Nothing reads `pollingInterval`, so without this the setting would simply never
apply and `sdev monitor` would quietly fall back to adaptive polling.

The same applies to flags:

```bash
sdev monitor --contract CCEQ... --interval 1,000 --network testnet
```

```
✖ --interval must be a positive integer, got "1,000"
```

`parseInt("1,000")` is `1`. Accepting that would mean polling a public RPC
endpoint every millisecond, from a flag the author read as one second.
