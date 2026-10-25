#!/usr/bin/env bash
# Reproduces demo/README.md against live Stellar testnet.
# Read-only: every step simulates or decodes, nothing is submitted.
#
#   npm run build && ./demo/run.sh
set -euo pipefail

# A function, not a variable: the repo path may contain spaces, and an
# unquoted "$SDEV" would word-split on them.
CLI_JS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/dist/cli.js"
sdev() {
  if [[ -n "${SDEV:-}" ]]; then "$SDEV" "$@"; else node "$CLI_JS" "$@"; fi
}
NETWORK="${NETWORK:-testnet}"

TOKEN=CCEBWHXYP3Y7BGLI7DUZWZJXGXIRHLSZJR7PGCDD3ZKINCV4Y4S55DLJ
VESTING=CB3DUVIYDN3AJOKHSX6YIXGDVEA3ZPXHHXHTURFP2VYYVHJYHWGONUDL
HOLDER=GC3BJ52UL6CBAJBSZRX5DIPHXUW6OGJFVWMQKV3GLBMXHEZ66BWLXZN6
EMPTY=GCTQDPY6S7OZDBIM7MYXFQVTLOGGIXAGKKF7LYYUBYXWOBCCKIEBSPH2

OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

step() { printf '\n\033[1m── %s\033[0m\n\n' "$1"; }

step "1. Simulate a call before sending it"
sdev simulate --contract "$TOKEN" --method balance --caller "$HOLDER" \
  --args "[\"$HOLDER\"]" --network "$NETWORK"

step "2. Generate typed TypeScript bindings from the deployed contract"
sdev bindings generate --contract "$VESTING" --network "$NETWORK" --output "$OUT/generated"
echo
grep -A 6 "async create_vesting" "$OUT"/generated/*_bindings.ts

step "3. Decode raw XDR (real event fields from event-rich.emit_time_types)"
sdev decode --data "AAAABwAAAABlU/EA" --topics "AAAADwAAAA90aW1lcG9pbnRfZXZlbnQA"
sdev decode --data "AAAACAAAAAAAAA4Q" --topics "AAAADwAAAA5kdXJhdGlvbl9ldmVudAAA"

step "4. Simulate a sequence of calls"
sdev chain --network "$NETWORK" --steps "[
  {\"contract\":\"$TOKEN\",\"method\":\"balance\",\"args\":[\"$HOLDER\"],\"caller\":\"$HOLDER\"},
  {\"contract\":\"$TOKEN\",\"method\":\"balance\",\"args\":[\"$EMPTY\"],\"caller\":\"$HOLDER\"}
]"

step "5. Catch mistakes early"
cat > "$OUT/sdev.config.json" <<EOF
{
  "network": "testnet",
  "pollingInterval": 5000,
  "aliases": { "dkt": "$TOKEN" }
}
EOF
# config validate reads sdev.config.json from the working directory.
(cd "$OUT" && sdev config validate) || true
sdev monitor --contract "$TOKEN" --interval 1,000 --network "$NETWORK" || true
