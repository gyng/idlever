// Controlled world-cleared flag only; recovery deadline is from an actual Core defeat fixture.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
const url = process.env.IDLEVER_TEST_URL;
if (!url) throw Error("fresh no-HMR server required");
const raw = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL(
        "../../docs/evidence/cut227/recovery/fixtures/controlled-reincarnating-12000.game.json.gz",
        import.meta.url,
      ),
    ),
  ).toString(),
);
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    window.__idlever.runnerOn = false;
    if (window.__idlever.kind !== "wasm") throw Error("real WASM required");
  });
  for (const cleared of [false, true]) {
    raw.lineage.ended = cleared;
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp", afterClear: true });
    }, JSON.stringify(raw));
    const proof = await page.evaluate(async () => {
      const a = window.__idlever,
        button = document.querySelector(".gem.send"),
        before = await a.engine.save();
      const disabled = button.disabled,
        text = button.textContent,
        pulse = button.classList.contains("pulse");
      button.click();
      let error = "";
      try {
        await a.engine.ascend("");
      } catch (e) {
        error = String(e);
      }
      return {
        disabled,
        text,
        pulse,
        error,
        unchanged: before === (await a.engine.save()),
        screen: a.screen,
        seconds: a.lineage.persistent_hero.recovery_s,
      };
    });
    assert.equal(proof.seconds, 1200);
    assert.equal(proof.disabled, true);
    assert.match(proof.text, /Recovering 20m/);
    assert.equal(proof.pulse, false);
    assert.match(proof.error, /recover/i);
    assert.equal(proof.unchanged, true);
    assert.equal(proof.screen, "camp");
  }
  console.log(
    "14 actual camp recovery checks PASS; cleared-world flag controlled, no earned win claim",
  );
} finally {
  await browser.close();
}
