import { stateWidths } from "./lib/viewport-cases.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const source = gunzipSync(
  readFileSync(new URL("../../docs/evidence/cut145/source.save.json.gz", import.meta.url)),
).toString("utf8");
const out = process.env.PICK_PRICE_EVIDENCE,
  baseline = process.env.PICK_PRICE_BASELINE === "1",
  results = [];
if (out) mkdirSync(out, { recursive: true });
const browser = await launchBrowser(),
  check = (ok, msg) => {
    if (!ok) throw Error(msg);
  };
try {
  for (const width of stateWidths([400, 1440])) {
    const p = await browser.newPage({ viewport: { width, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=146`);
    await p.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
    const before = await p.evaluate(async (source) => {
      const a = window.__idlever;
      if (a.kind !== "wasm") throw Error("real WASM required");
      if (
        !(await a.importSave(
          JSON.stringify({
            v: 2,
            engine: source,
            loadout: JSON.parse(source).loadout,
            last_seen: Date.now(),
            runs: 0,
          }),
        ))
      )
        throw Error("import failed");
      const state = await a.engine.lineage(),
        original = a.engine.deathDeltas.bind(a.engine);
      window.__priceCalls = 0;
      a.engine.deathDeltas = async (...args) => {
        window.__priceCalls++;
        return original(...args);
      };
      const d = await a.engine.death(237);
      if (!d.pick?.pending) throw Error("unpriced King pick required");
      window.__pickMounted = performance.now();
      a.go({ kind: "death", death: d, kept: true });
      return {
        gold: state.gold,
        heir: state.heir,
        best: state.best_depth,
        rules: JSON.stringify(a.rules),
      };
    }, source);
    if (baseline) await p.waitForTimeout(5000);
    else
      await p.waitForFunction(
        () => document.querySelector(".death .death-pick .lever-price:not(.pending)"),
        null,
        { timeout: 15000 },
      );
    const result = await p.evaluate(async () => {
      const a = window.__idlever,
        state = await a.engine.lineage(),
        pick = document.querySelector(".death .death-pick"),
        price = pick?.querySelector(".lever-price");
      // Native cache may already be priced while the historical UI remains pending: record both.
      const label = pick?.querySelector(".lever-name")?.getBoundingClientRect(),
        priceRect = price?.getBoundingClientRect();
      const d = await a.engine.death(237),
        { priceText } = await import("/src/ui/patches.ts");
      return {
        calls: window.__priceCalls,
        elapsedMs: performance.now() - window.__pickMounted,
        pending: price?.classList.contains("pending"),
        text: price?.textContent,
        expected: d.pick?.price
          ? priceText(d.pick.price, !!d.pick.trade_off || !!d.pick.price.trade_off)
          : null,
        price: d.pick?.price,
        enginePending: d.pick?.pending ?? false,
        priceBelowName: !!label && !!priceRect && priceRect.top >= label.bottom,
        state: {
          gold: state.gold,
          heir: state.heir,
          best: state.best_depth,
          rules: JSON.stringify(a.rules),
        },
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    results.push({ width, before, ...result, errors });
    if (out) {
      writeFileSync(`${out}/observations.json`, JSON.stringify(results, null, 2));
      await p.screenshot({ path: `${out}/${width}-history-price.png` });
    }
    if (!baseline) {
      check(result.calls === 1, `${width}: shares one pricing call`);
      check(
        result.elapsedMs <= 15000 && !result.pending && !result.enginePending,
        `${width}: price finishes within15s`,
      );
      check(
        result.price?.depth === 33 && result.text === result.expected,
        `${width}: exact Rust wall price`,
      );
      check(
        JSON.stringify(before) === JSON.stringify(result.state),
        `${width}: no gold/heir/best/rules changes`,
      );
      check(result.priceBelowName, `${width}: price below tactic name`);
      check(!result.overflow && !errors.length, `${width}: no overflow/page errors`);
      console.log(width, "historical TRY Rust price/single request/no game mutation PASS");
    }
    await p.close();
  }
} finally {
  await browser.close();
}
