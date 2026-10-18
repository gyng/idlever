// Controlled world-cleared flag only; recovery deadline is from an actual Core defeat fixture.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
const url = process.env.IDLEVER_TEST_URL;
if (!url) throw Error("fresh no-HMR server required");
// Cut230: a first-floor death owes the depth ramp's shallow recovery (60 s); the Cut227 save (recorded before the
// ramp, no stored length) still owes its full 20 minutes and keeps showing them. (Cut264: the gem reads `Cloning`.)
const fixture = (path) =>
  JSON.parse(
    gunzipSync(readFileSync(new URL(`../../docs/evidence/${path}`, import.meta.url))).toString(),
  );
const cases = [
  {
    raw: fixture("cut230/fixtures/controlled-reincarnating-600.game.json.gz"),
    seconds: 60,
    copy: /Cloning 1m/,
  },
  {
    raw: fixture("cut227/recovery/fixtures/controlled-reincarnating-12000.game.json.gz"),
    seconds: 1200,
    copy: /Cloning 20m/,
  },
];
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    window.__idlever.runnerOn = false;
    if (window.__idlever.kind !== "wasm") throw Error("real WASM required");
  });
  for (const { raw, seconds, copy } of cases)
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
      assert.equal(proof.seconds, seconds);
      assert.equal(proof.disabled, true);
      assert.match(proof.text, copy);
      assert.equal(proof.pulse, false);
      assert.match(proof.error, /recover/i);
      assert.equal(proof.unchanged, true);
      assert.equal(proof.screen, "camp");
    }
  console.log(
    "28 actual camp recovery checks PASS (shallow 1m, older-save 20m); cleared-world flag controlled, no earned win claim",
  );
} finally {
  await browser.close();
}
