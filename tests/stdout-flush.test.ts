import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Every command in this CLI used to call `process.exit()` immediately after
 * writing its final output (`simulate --json`, `chain --json`, a validation
 * error list, etc). Confirmed directly: when stdout is piped to another
 * process, `process.exit()` can tear the process down before Node has
 * finished flushing a large write to the OS pipe — the write lands
 * truncated to whatever fit in one pipe buffer (65536 bytes on Linux),
 * silently dropping the rest. Setting `process.exitCode` and letting the
 * event loop drain naturally instead delivers the full write every time.
 * This is exactly why every command's action handler was switched from
 * `process.exit(code)` to `process.exitCode = code`.
 *
 * This test validates that underlying mechanism directly — not through the
 * CLI's own commands, since reliably producing >64KB of output from them
 * requires either a live RPC call or an unrealistic number of --steps, both
 * too slow/flaky for a unit test — using the exact write-then-finish pattern
 * each command now follows.
 */
describe("process.exitCode vs process.exit() for a large piped write", () => {
  const SIZE = 200_000; // comfortably larger than a 65536-byte pipe buffer
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdev-stdout-flush-"));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runPiped(scriptBody: string): number {
    const scriptPath = path.join(tmpDir, `${Math.random().toString(36).slice(2)}.js`);
    fs.writeFileSync(scriptPath, scriptBody);
    const result = spawnSync("sh", ["-c", `node "${scriptPath}" | wc -c`], {
      encoding: "utf-8",
    });
    return Number(result.stdout.trim());
  }

  it("process.exit() right after a large write can truncate it when piped", () => {
    const received = runPiped(
      `process.stdout.write("x".repeat(${SIZE}) + "\\n"); process.exit(0);`
    );
    // Truncated to one pipe buffer's worth — not the full SIZE + 1 bytes.
    expect(received).toBeLessThan(SIZE);
  });

  it("process.exitCode lets the same write finish fully", () => {
    const received = runPiped(
      `process.stdout.write("x".repeat(${SIZE}) + "\\n"); process.exitCode = 0;`
    );
    expect(received).toBe(SIZE + 1);
  });
});
