// Current UI truthfully omits Replay when a completed ordinary capsule wasn't serialized.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../../tools/browser.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const url = execFileSync("bash", ["tools/dev.sh"], { encoding: "utf8" }).trim();
const browser = await launchBrowser();
const rows = [];
mkdirSync("docs/evidence/cut295/retention", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 402, height: 681 },
    serviceWorkers: "block",
  });
  await page.goto(`${url}?fresh=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  for (const c of JSON.parse(
    readFileSync("docs/evidence/cut295/selection-absence.json"),
  ).cases.filter((c) => c.id.startsWith("caster-") && c.id.endsWith("authored"))) {
    const raw = readFileSync(c.inputPath, "utf8");
    assert.equal(sha(raw), c.inputSha256);
    const state = await page.evaluate(async (raw) => {
      const app = window.__idlever;
      await app.importSave(
        JSON.stringify({ engine: raw, loadout: [], runs: 0, last_seen: Date.now() }),
      );
      const before = await app.engine.save();
      const rep = await app.engine.replay(133);
      return {
        kind: app.kind,
        held: app.lineage.replays ?? [],
        available: rep !== null,
        before,
        after: await app.engine.save(),
      };
    }, raw);
    assert.equal(state.kind, "wasm");
    assert.equal(state.available, false);
    assert.ok(!state.held.includes(133));
    assert.equal(state.before, state.after);
    if (!(await page.locator(".hero-details:visible").count()))
      await page.locator(".home-heroes-command:visible").click();
    await page.locator(".hero-details:visible").first().click();
    await page.locator('[data-hub-action="runs"]:visible').click();
    await page.locator('.runs-sheet .run-entry[data-run="133"]').waitFor();
    assert.equal(await page.locator('.runs-sheet .re-play[data-run="133"]').count(), 0);
    const file = `${c.id}-no-retained-replay.png`;
    await page.screenshot({ path: `docs/evidence/cut295/retention/${file}` });
    rows.push({
      id: c.id,
      inputSha256: sha(raw),
      replayAvailable: false,
      runEntryVisible: true,
      replayButtons: 0,
      readSaveBytesExact: true,
      file,
      frameSha256: sha(readFileSync(`docs/evidence/cut295/retention/${file}`)),
    });
  }
  writeFileSync(
    "docs/evidence/cut295/retention/results.json",
    JSON.stringify({ status: "PASS", rows }, null, 2) + "\n",
  );
  console.log("PASS two original Caster absence-source unavailable replay UI checks");
} finally {
  await browser.close();
}
