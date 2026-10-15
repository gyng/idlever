// Cut241 current-source material/focus comparison. Real saved inputs; private GPU for visual captures.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { launchBrowser } from "./browser.mjs";
const argv = process.argv.slice(2);
const value = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const phase = value("--phase", "baseline"),
  gpu = argv.includes("--gpu"),
  audit = argv.includes("--audit");
const url = value("--url", "http://127.0.0.1:5379");
const base = "docs/evidence/handoff-menus",
  out = `${base}/${phase}${gpu ? "-gpu" : audit ? "-geometry" : "-focus"}`;
mkdirSync(out, { recursive: true });
const sha = (v) => createHash("sha256").update(v).digest("hex");
const pending = [],
  deliveries = [],
  served = new Map(),
  errors = [],
  rows = [];
const b = await launchBrowser({ gpu });
let p;
async function open(route) {
  await p.mouse.move(0, 0);
  await p.evaluate(
    async ({ route, report }) => {
      const a = window.__idlever;
      (await import("/src/ui/sheet.ts")).closeAllSheets();
      a.runnerOn = false;
      if (a.view.kind !== "camp") a.go({ kind: "camp" });
      if (route === "forge") (await import("/src/ui/forge.ts")).openForge(a);
      else if (route === "hero") (await import("/src/ui/hero-hub.ts")).openHeroHub(a);
      else if (route === "journal")
        (await import("/src/ui/journal-window.ts")).openJournal(a, () => false);
      else if (route === "settings") (await import("/src/ui/settings.ts")).openSettings(a);
      else if (route === "works") (await import("/src/ui/works.ts")).openWorks(a);
      else if (route === "companions")
        (await import("/src/ui/hero-hub.ts")).openHeroHub(a, null, "companions");
      else if (route === "packages") (await import("/src/ui/packages.ts")).openPackages(a);
      else if (route === "looks") (await import("/src/ui/look.ts")).openLooks(a);
      else if (route === "gold") (await import("/src/ui/gold.ts")).openGoldSheet(a);
      else if (route === "runs") (await import("/src/ui/runs.ts")).openRuns(a);
      else if (route === "ledger") (await import("/src/ui/party.ts")).openLedger(a);
      else if (route === "oaths")
        (await import("/src/ui/oaths.ts")).openOathBoard(a, document.querySelector(".gear"));
      else if (route === "report") a.go({ kind: "report", report, absence: true });
      else throw Error(`unknown route ${route}`);
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    },
    { route, raw: input, report },
  );
  await p.waitForFunction(() => !document.querySelector(".sheet-ghost"));
}
async function inspect(id) {
  if (!audit && !argv.includes("--contrast")) return undefined;
  const data = await p.evaluate(() => {
    const root =
      document.querySelector(".sheet-wrap:not(.under) > .sheet") ??
      document.querySelector(".report-sheet");
    const visible = (el) =>
      el.getClientRects().length &&
      !el.closest("[hidden]") &&
      getComputedStyle(el).visibility !== "hidden";
    const controls = [
      ...root.querySelectorAll("button,summary,input:not([type=hidden]),select,textarea"),
    ]
      .filter(visible)
      .map((el) => {
        const r = el.getBoundingClientRect(),
          s = getComputedStyle(el);
        return {
          tag: el.tagName,
          cls: el.className,
          text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 60),
          width: r.width,
          height: r.height,
          disabled: el.matches(":disabled"),
          outline: { color: s.outlineColor, width: s.outlineWidth },
        };
      });
    const containers = [
      ...root.querySelectorAll(
        ".sheet-body,.srow,.works-trunk,.wnode,.pkg-panel,.looks,.gold-sheet,.ledger,.runs-list,.hero-hub,.journal-panel",
      ),
    ]
      .filter(visible)
      .map((el) => ({ cls: el.className, overflow: el.scrollWidth - el.clientWidth }));
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d"),
      samples = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode,
        el = node.parentElement;
      if (!el || !node.textContent.trim() || !visible(el)) continue;
      const range = document.createRange();
      range.selectNode(node);
      const style = getComputedStyle(el);
      let opacity = 1;
      for (let a = el; a; a = a.parentElement) opacity *= Number(getComputedStyle(a).opacity);
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const words = node.textContent
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 6)
        .map((word) => {
          const painted =
            style.textTransform === "uppercase"
              ? word.toUpperCase()
              : style.textTransform === "lowercase"
                ? word.toLowerCase()
                : word;
          const m = ctx.measureText(painted);
          return {
            word: painted,
            width: m.width,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          };
        });
      for (const r of range.getClientRects()) {
        if (
          r.width <= 2 ||
          r.height <= 2 ||
          r.x < 0 ||
          r.y < 0 ||
          r.right > innerWidth ||
          r.bottom > innerHeight
        )
          continue;
        let clipped = false;
        for (let a = el.parentElement; a; a = a.parentElement) {
          const s = getComputedStyle(a),
            b = a.getBoundingClientRect();
          if (
            /auto|scroll|hidden|clip/.test(s.overflowY) &&
            (r.y < b.y + a.clientTop || r.bottom > b.y + a.clientTop + a.clientHeight)
          )
            clipped = true;
          if (
            /auto|scroll|hidden|clip/.test(s.overflowX) &&
            (r.x < b.x + a.clientLeft || r.right > b.x + a.clientLeft + a.clientWidth)
          )
            clipped = true;
        }
        if (clipped) continue;
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!hit || !(el === hit || el.contains(hit))) continue;
        samples.push({
          text: node.textContent.trim().slice(0, 100),
          color: style.color,
          opacity,
          inactive: !!el.closest(':disabled,[aria-disabled="true"],.off'),
          cssSize: style.fontSize,
          font: style.fontFamily,
          words,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        });
      }
    }
    return {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      material: root.dataset.material ?? "journal",
      controls,
      containers,
      samples,
    };
  });
  if (gpu && argv.includes("--contrast")) {
    writeFileSync(`${out}/${id}-contrast.json`, JSON.stringify(data, null, 2));
    const invisible = await p.addStyleTag({
      content:
        ".sheet-wrap:not(.under) > .sheet *, .report-sheet * {-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}",
    });
    await p.screenshot({ path: `${out}/${id}-background.png` });
    await invisible.evaluate((el) => el.remove());
  }
  return {
    controls: data.controls,
    containers: data.containers,
    visibleTextSamples: data.samples.length,
  };
}
let input, report;
try {
  p = await b.newPage({
    viewport: { width: 400, height: 1000 },
    reducedMotion: argv.includes("--motion") ? "no-preference" : "reduce",
  });
  if (argv.includes("--missing"))
    await p.route(/\.(?:png|webp|avif)(?:\?|$)/, (route) => route.abort());
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.endsWith(".wasm"))
      pending.push(
        r.body().then((bytes) => deliveries.push({ bytes: bytes.length, sha256: sha(bytes) })),
      );
    if (path.startsWith("/src/") && /\.(ts|css)$/.test(path))
      pending.push(
        r.body().then((bytes) => served.set(path, { sha256: sha(bytes), bytes: bytes.length })),
      );
  });
  await p.goto(`${url}/?fresh=1&seed=1&runs=0`);
  await p.waitForFunction(() => window.__idlever?.booted);
  assert.equal(await p.evaluate(() => window.__idlever.kind), "wasm");
  if (!existsSync(`${base}/input.game.json.gz`)) {
    assert.equal(phase, "baseline", "baseline prepares the actual comparison input once");
    const fixture = "docs/evidence/cut220/core/fixtures/earned-hybrid-saved-kit.game.json.gz";
    const raw = gunzipSync(readFileSync(fixture)).toString();
    const prepared = await p.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      a.lineage = await a.engine.load(raw);
      const report = await a.engine.runOfflineQuick(3600);
      return { report, save: await a.engine.save() };
    }, raw);
    writeFileSync(`${base}/input.game.json.gz`, gzipSync(prepared.save));
    writeFileSync(`${base}/input-report.json`, JSON.stringify(prepared.report));
    writeFileSync(
      `${base}/input-provenance.json`,
      JSON.stringify(
        {
          fixture,
          fixtureSha256: sha(readFileSync(fixture)),
          method:
            "Load earned public-action fixture; actual current-WASM runOfflineQuick(3600); no grants.",
          saveSha256: sha(prepared.save),
        },
        null,
        2,
      ),
    );
  }
  input = gunzipSync(readFileSync(`${base}/input.game.json.gz`)).toString();
  report = JSON.parse(readFileSync(`${base}/input-report.json`));
  await p.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    a.lineage = await a.engine.load(raw);
    await a.refresh();
    a.go({ kind: "camp" });
  }, input);
  if (argv.includes("--effects"))
    await p.evaluate(
      async (level) => {
        (await import("/src/render/fxpref.ts")).setEffectsLevel(level);
      },
      value("--effects", "full"),
    );
  if (argv.includes("--board")) {
    for (const width of [400, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.evaluate(async () => {
        (await import("/src/ui/sheet.ts")).closeAllSheets();
        document.getElementById("app").hidden = true;
        document.querySelector(".foundation-board")?.remove();
        document.body.append((await import("/src/ui/design-system-board.ts")).designSystemBoard());
        await document.fonts.ready;
      });
      await p.waitForFunction(() => !document.querySelector(".sheet-ghost"));
      assert.equal(await p.locator("[data-cell]").count(), 27);
      await p.screenshot({ path: `${out}/${width}-states.png`, fullPage: true });
      assert.equal(
        await p.evaluate(() => window.__idlever.engine.save()),
        input,
        "state fixtures preserve exact engine save",
      );
      rows.push({
        width,
        cells: 27,
        label: "Design state fixtures, no fabricated game progression",
      });
    }
  } else if (!gpu && !audit) {
    await open("settings");
    const before = await p.evaluate(() => window.__idlever.engine.save());
    const activeOnOpen = await p.evaluate(
      () => !!document.querySelector(".sheet-wrap:not(.under)")?.contains(document.activeElement),
    );
    await p.evaluate(() => {
      const panel = document.querySelector(".sheet-wrap:not(.under)");
      const xs = [
        ...panel.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),textarea,summary,[tabindex='0']",
        ),
      ].filter((e) => e.getClientRects().length);
      xs.at(-1).focus();
    });
    await p.keyboard.press("Tab");
    const afterTab = await p.evaluate(() => ({
      inside: !!document.querySelector(".sheet-wrap:not(.under)")?.contains(document.activeElement),
      tag: document.activeElement?.tagName,
      cls: document.activeElement?.className,
    }));
    assert.equal(
      await p.evaluate(() => window.__idlever.engine.save()),
      before,
      "keyboard inspection preserves exact save",
    );
    rows.push({ route: "settings", activeOnOpen, afterTab });
    if (phase === "baseline")
      assert.equal(afterTab.inside, false, "reproduce actual modal Tab leak before correction");
    else
      assert.ok(activeOnOpen && afterTab.inside, "candidate initial focus and Tab remain inside");
  } else {
    for (const width of argv.includes("--quick") ? [400, 1440] : [320, 400, 1440, 2560]) {
      for (const scale of argv.includes("--quick") ? [1] : [1, 2]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.evaluate((scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
        }, scale);
        for (const route of argv.includes("--only")
          ? value("--only", "").split(",")
          : ["forge", "hero", "journal", "companions", "settings", "report"]) {
          await open(route);
          const before = await p.evaluate(() => window.__idlever.engine.save());
          const id = `${width}-${scale}x-${route}`;
          const geometry = await p.evaluate(() => {
            const panel =
              document.querySelector(".sheet-wrap:not(.under) > .sheet") ??
              document.querySelector(".report-sheet");
            const r = panel.getBoundingClientRect();
            return {
              material: panel.dataset.material ?? null,
              width: r.width,
              x: r.x,
              y: r.y,
              height: r.height,
              overflow: panel.scrollWidth - panel.clientWidth,
              documentOverflow: document.documentElement.scrollWidth - innerWidth,
              dpr: devicePixelRatio,
            };
          });
          if (gpu) await p.screenshot({ path: `${out}/${id}.png` });
          const detail = await inspect(id);
          assert.equal(
            await p.evaluate(() => window.__idlever.engine.save()),
            before,
            `${id}: exact read-only save`,
          );
          rows.push({ id, route, width, scale, ...geometry, detail });
          writeFileSync(`${out}/partial.json`, JSON.stringify(rows, null, 2));
        }
      }
    }
    for (const width of [400, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
      for (const route of argv.includes("--only")
        ? []
        : ["works", "packages", "looks", "gold", "runs", "ledger", "oaths"]) {
        await open(route);
        const before = await p.evaluate(() => window.__idlever.engine.save());
        if (gpu) await p.screenshot({ path: `${out}/${width}-1x-${route}.png` });
        const detail = await inspect(`${width}-1x-${route}`);
        assert.equal(
          await p.evaluate(() => window.__idlever.engine.save()),
          before,
          `${route}: exact save`,
        );
        rows.push({ id: `${width}-1x-${route}`, route, width, scale: 1, detail });
        writeFileSync(`${out}/partial.json`, JSON.stringify(rows, null, 2));
      }
    }
  }
  await Promise.all(pending);
  const local = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
  assert.ok(
    deliveries.length && deliveries.every((d) => d.sha256 === sha(local)),
    "actual served current WASM",
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      {
        phase,
        gpu,
        url,
        saveSha256: sha(input),
        wasm: deliveries,
        served: Object.fromEntries(served),
        errors,
        rows,
      },
      null,
      2,
    ),
  );
  console.log(`${phase} ${gpu ? "private GPU" : "focus"}: ${rows.length} cases PASS`);
} catch (e) {
  writeFileSync(
    `${out}/failure.json`,
    JSON.stringify({ error: String(e.stack), errors, rows }, null, 2),
  );
  throw e;
} finally {
  await b.close();
}
