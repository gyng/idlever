import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const dir = process.env.CONTROL_EVIDENCE,
  baseline = process.env.CONTROL_BASELINE === "1",
  results = [],
  errors = [];
if (dir) mkdirSync(dir, { recursive: true });
const browser = await launchBrowser();
const geometry = (page) =>
  page.evaluate(() => {
    const ctl = document.querySelector(".ctl"),
      rect = (e) => {
        const r = e.getBoundingClientRect();
        return { w: r.width, h: r.height };
      };
    const visible = (e) => !!e.getClientRects().length && getComputedStyle(e).display !== "none";
    const tiles = [...ctl.querySelectorAll(".tile")].filter(visible);
    return {
      on: ctl.dataset.on,
      padHidden: ctl.querySelector(".ctl-pad").hidden,
      padDisplay: getComputedStyle(ctl.querySelector(".ctl-pad")).display,
      slab: rect(ctl),
      tiles: tiles.map((e) => ({ id: e.dataset.tile, ...rect(e) })),
      moves: tiles.filter((e) => e.classList.contains("ctl-dir")).length,
      verbs: tiles.filter((e) => e.classList.contains("ctl-verb")).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
const check = (ok, message) => {
  if (!ok) throw Error(message);
};
try {
  for (const width of [360, 400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?dev=1&fresh=1&runs=0&seed=611`);
    await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
    check((await page.evaluate(() => window.__idlever.kind)) === "wasm", "real WASM required");
    const house = page.locator(".town-tag[data-next=house]");
    if (await house.count()) {
      await house.first().click();
      await page.waitForFunction(
        () =>
          window.__idlever.lineage.town?.home !== false && !document.querySelector(".sheet-wrap"),
        null,
        { timeout: 15000 },
      );
    }
    await page.locator(".camp-gem, .gem").first().click();
    await page.waitForFunction(
      () =>
        document.querySelector(".ctl-toggle") && document.querySelector(".ctl")?.dataset.on === "0",
      null,
      { timeout: 30000 },
    );
    const automatic = await geometry(page);
    results.push({ width, automatic });
    if (dir) {
      writeFileSync(`${dir}/geometry.json`, JSON.stringify(results, null, 2));
      await page.screenshot({ path: `${dir}/${width}-automatic.png` });
    }
    if (baseline) {
      await page.close();
      continue;
    }
    check(
      automatic.tiles.length === 1 && automatic.moves === 0 && automatic.verbs === 0,
      `${width}: automatic controls hidden ${JSON.stringify(automatic)}`,
    );
    check(automatic.slab.h <= 90, `${width}: compact slab ${automatic.slab.h}`);
    await page.locator(".ctl-toggle").click();
    await page.waitForFunction(
      () =>
        document.querySelector(".ctl")?.dataset.on === "1" &&
        document.querySelector(".ctl")?.dataset.awaiting === "1",
    );
    const manual = await geometry(page);
    results.at(-1).manual = manual;
    check(manual.moves === 9 && manual.verbs >= 4, `${width}: complete manual pad`);
    check(
      !manual.overflow && manual.tiles.every((t) => t.w >= 44 && t.h >= 44),
      `${width}: manual touch targets and overflow`,
    );
    if (dir) await page.screenshot({ path: `${dir}/${width}-manual.png` });
    await page.locator(".ctl-toggle").click();
    await page.waitForFunction(() => document.querySelector(".ctl")?.dataset.on === "0");
    const released = await geometry(page);
    results.at(-1).released = released;
    check(
      released.tiles.length === 1 && released.slab.h <= 90,
      `${width}: release collapses controls`,
    );
    // Exercise the production panel's null-snapshot branch separately without changing engine truth.
    const absent = await page.evaluate(async () => {
      const { controlPanel } = await import("/src/ui/control.ts"),
        p = controlPanel({ takeControl() {} }, () => {});
      document.body.append(p.el);
      p.paint(null);
      const r = {
        hidden: p.el.hidden,
        display: getComputedStyle(p.el).display,
        height: p.el.getBoundingClientRect().height,
      };
      p.dispose();
      p.el.remove();
      return r;
    });
    results.at(-1).absent = absent;
    check(
      absent.hidden && absent.display === "none" && absent.height === 0,
      `${width}: absent panel consumes no space`,
    );
    if (dir) writeFileSync(`${dir}/geometry.json`, JSON.stringify(results, null, 2));
    await page.close();
    console.log(width, "automatic/manual/release/absent visibility PASS");
  }
  check(errors.length === 0, errors.join("\n"));
} finally {
  await browser.close();
}
