import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { launchBrowser } from "../../../tools/browser.mjs";
import { phoneReviewViewport } from "../../../web/tests/lib/viewport-cases.mjs";

const [expectedWasm] = process.argv.slice(2);
assert.match(expectedWasm ?? "", /^[a-f0-9]{64}$/);
const browser = await launchBrowser();
const out = new URL("./", import.meta.url);
try {
  const page = await browser.newPage({ viewport: phoneReviewViewport() });
  const errors = [], deliveries = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.endsWith(".wasm"))
      deliveries.push(response.body().then((body) => ({
        bytes: body.length, sha256: createHash("sha256").update(body).digest("hex"),
      })));
  });
  await page.goto("https://dev.idlever.awoo.party/?dev=1&fresh=1&seed=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
  assert.equal(await page.evaluate(() => window.__idlever.lineage.town.home), false);
  await page.locator('.town-tag[data-next="house"]').click();
  await page.waitForFunction(() => window.__idlever.lineage.town.home === true);
  await page.waitForFunction(() => {
    const send = document.querySelector(".gem.send");
    return send && !send.disabled;
  });
  await page.locator(".gem.send").click();
  await page.waitForFunction(() => window.__idlever.view.kind === "watch");
  await page.waitForSelector("canvas.view");
  await page.waitForFunction(() => window.__viewer?.debugRects?.().some((rect) => rect.hero), null, { timeout: 30000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const state = await page.evaluate(() => ({
    engine: window.__idlever.kind, view: window.__idlever.view.kind,
    home: window.__idlever.lineage.town.home,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    text: document.body.innerText,
  }));
  assert.equal(state.horizontalOverflow, false);
  const packages = await Promise.all(deliveries);
  assert.ok(packages.length);
  for (const packet of packages) assert.equal(packet.sha256, expectedWasm);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: new URL("live-phone-watch.png", out).pathname });
  const result = { result: "PASS", checkedAt: new Date().toISOString(),
    captureKind: "visible viewport; headless Chromium, no performance or Safari claim",
    input: "fresh seed1; actual free-house and Delve UI clicks; no fixture or gold grant",
    state, packages, errors };
  writeFileSync(new URL("live-browser.json", out), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
