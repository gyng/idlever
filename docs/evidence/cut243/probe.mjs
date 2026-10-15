// Current real-fixture DOM census. Measurements are diagnostic until source/state coverage is reconciled.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
const gpu = process.argv.includes("--gpu");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const phase = arg("--phase", "baseline");
const only = arg("--only", "").split(",").filter(Boolean);
const out = resolve(`docs/evidence/cut243/${phase}-${gpu ? "gpu" : "dom"}`);
mkdirSync(out, { recursive: true });
const sha = (x) => createHash("sha256").update(x).digest("hex");
const inputPath = arg("--input", "docs/evidence/handoff-menus/input.game.json.gz");
const inputBytes=readFileSync(inputPath);
const input=(inputPath.endsWith(".gz")?gunzipSync(inputBytes):inputBytes).toString();
const result = {
  scope:
    "Actual current earned ready menu routes; full mounted text/targets census; source-bound diagnostic, not full route/state acceptance",
  inputSha256: sha(input),
  inputPath,
  node: process.version,
  gpu,
  rows: [],
  errors: [],
  served: [],
  wasm: [],
};
const save = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + "\n");
const port = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const log = createWriteStream(`${out}/vite.log`);
await new Promise((r) => log.once("open", r));
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--port",
    String(port),
    "--strictPort",
    "--config",
    "tests/vite.test.config.ts",
  ],
  { cwd: resolve("web"), stdio: ["ignore", log, log] },
);
let browser;
const routes = [
  "camp",
  "forge",
  "hero-gear",
  "hero-skills",
  "hero-behaviour",
  "hero-companions",
  "hero-attributes",
  "journal",
  "settings",
  "works",
  "packages",
  "looks",
  "gold",
  "runs",
  "heirs",
  "ledger",
  "oaths",
  "chronicle",
  "hero-life",
  "rebirth",
  "class",
  "preparation",
  "orders",
  "bank",
  "quest",
  "return-pick",
  "drop-diagnostic",
];
try {
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  result.url = url;
  browser = await launchBrowser({ gpu });
  const page = await browser.newPage({ reducedMotion: "reduce", deviceScaleFactor: gpu ? 1.5 : 1 });
  const responses = [];
  page.on("response", (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith("/src/") || p.endsWith(".wasm"))
      responses.push(
        r
          .body()
          .then((b) => {
            const row = { path: p, bytes: b.length, sha256: sha(b) };
            if (p.endsWith(".wasm")) result.wasm.push(row);
            else result.served.push(row);
          })
          .catch(() => {}),
      );
  });
  page.on("console",m=>{if(m.type()==="error"){(result.consoleErrors??=[]).push(m.text());save();}});
  page.on("requestfailed",r=>{(result.requestFailures??=[]).push({url:r.url(),failure:r.failure()});save();});
  page.on("pageerror", (e) => {
    result.errors.push(String(e));
    save();
  });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted,null,{timeout:90000});
  await page.evaluate(async () => (await import("/src/render/fxpref.ts")).setEffectsLevel("off"));
  await page.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    a.lineage = await a.engine.load(raw);
    await a.refresh();
    a.go({ kind: "camp" });
  }, input);
  result.wasmKind = await page.evaluate(() => window.__idlever.kind);
  if (process.argv.includes("--prepare-death-cache")) {
    result.preparation = await page.evaluate(async () => {
      const a = window.__idlever;
      const before = await a.engine.save();
      const id = a.lineage.graveyard.find((g) => g.death_id)?.death_id;
      if (!id) throw new Error("No genuine cached death");
      const death = await a.engine.death(id);
      const after = await a.engine.save();
      return {
        scope:
          "Actual public death lookup before presentation baselines; no grants, sends, choices or offline progress",
        id,
        patches: death.patches.length,
        saveChanged: before !== after,
        before,
        after,
      };
    });
    result.preparation.beforeSha256 = sha(result.preparation.before);
    result.preparation.afterSha256 = sha(result.preparation.after);
    delete result.preparation.before;
    delete result.preparation.after;
  }

  for (const width of arg("--widths", gpu ? "320,400,1440,2560" : "320,1440")
    .split(",")
    .map(Number)) {
    await page.setViewportSize({ width, height: 900 });
    for (const scale of process.argv.includes("--matrix") ? [1, 2] : [1]) {
      await page.evaluate((s) => (document.documentElement.style.fontSize = `${16 * s}px`), scale);
      for (const route of routes.filter((r) => !only.length || only.includes(r))) {
        const before = await page.evaluate(() => window.__idlever.engine.save());
        try {
          await page.evaluate(
            async ({ route, expandTasks }) => {
              const a = window.__idlever;
              (await import("/src/ui/sheet.ts")).closeAllSheets();
              a.runnerOn = false;
              if (a.view.kind !== "camp") a.go({ kind: "camp" });
              if (route.startsWith("hero-") && !["hero-life"].includes(route))
                (await import("/src/ui/hero-hub.ts")).openHeroHub(a, null, route.slice(5));
              else if (route === "forge") (await import("/src/ui/forge.ts")).openForge(a);
              else if (route === "journal")
                (await import("/src/ui/journal-window.ts")).openJournal(a, () => false);
              else if (route === "settings") (await import("/src/ui/settings.ts")).openSettings(a);
              else if (route === "works") (await import("/src/ui/works.ts")).openWorks(a);
              else if (route === "packages") (await import("/src/ui/packages.ts")).openPackages(a);
              else if (route === "looks") (await import("/src/ui/look.ts")).openLooks(a);
              else if (route === "gold") (await import("/src/ui/gold.ts")).openGoldSheet(a);
              else if (route === "runs" || route === "heirs")
                (await import("/src/ui/runs.ts")).openRuns(a, {
                  tab: route === "heirs" ? "heirs" : "runs",
                });
              else if (route === "ledger") (await import("/src/ui/party.ts")).openLedger(a);
              else if (route === "oaths")
                (await import("/src/ui/oaths.ts")).openOathBoard(
                  a,
                  document.querySelector(".gear"),
                );
              else if (route === "chronicle")
                (await import("/src/ui/chronicle.ts")).openChronicle(a);
              else if (route === "hero-life" || route === "rebirth")
                (await import("/src/ui/hero-life.ts")).openHeroLife(
                  a,
                  null,
                  route === "rebirth" ? "rebirth" : "hero",
                );
              else if (route === "class") (await import("/src/ui/town.ts")).openHeroClass(a);
              else if (route === "preparation")
                (await import("/src/ui/preparation.ts")).openPreparationForge(a);
              else if(route === "orders") (await import("/src/ui/camp.ts")).openCampOrders(a);
              else if(route === "bank") (await import("/src/ui/town.ts")).openBank(a);
              else if (route === "quest") (await import("/src/ui/quest.ts")).openQuest(a);
              else if (route === "return-pick") document.querySelector(".pick-one .tile")?.click();
              else if (route === "drop-diagnostic") {
                const id = a.lineage.graveyard.find((g) => g.death_id)?.death_id;
                if (!id) throw new Error("No genuine cached death");
                const death = await a.engine.death(id);
                if (!death.patches?.length) throw new Error("No genuine patch");
                (await import("/src/ui/patches.ts")).openDropSheet(
                  a,
                  death.patches[0],
                  death.trace,
                );
              }

              await document.fonts.ready;
            },
            { route, expandTasks: process.argv.includes("--expand-tasks") },
          );
          await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
          await page.waitForTimeout(700);
          if (
            route !== "camp" &&
            !(await page.locator(".sheet-wrap:not(.under):not([hidden]) > .sheet").count())
          )
            throw new Error("Actual opener produced no active sheet for this earned state");
          if (route === "camp" && process.argv.includes("--expand-tasks")) {
            const fold = page.locator(".task-fold");
            if ((await fold.count()) && !(await fold.evaluate((e) => e.open)))
              await page.locator(".task-summary").click();
            await page.waitForTimeout(350);
          }
          const data = await page.evaluate(() => {
            const root =
              document.querySelector(".sheet-wrap:not(.under):not([hidden]) > .sheet") ??
              document.querySelector("#app");
            const visible = (e) =>
              !!e.getClientRects().length &&
              !e.closest("[hidden],[aria-hidden=true]") &&
              (!e.closest("details:not([open])") ||
                e.closest("details:not([open])").querySelector(":scope > summary")?.contains(e)) &&
              getComputedStyle(e).visibility !== "hidden";
            const controls = [
              ...root.querySelectorAll(
                "button,summary,input:not([type=hidden]),textarea,select,[role=button]",
              ),
            ]
              .filter(visible)
              .map((e) => {
                const r = e.getBoundingClientRect(),
                  s = getComputedStyle(e);
                return {
                  tag: e.tagName,
                  cls: e.className,
                  text: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 80),
                  width: r.width,
                  height: r.height,
                  font: s.fontSize,
                  disabled: e.matches(":disabled"),
                  ariaDisabled: e.getAttribute("aria-disabled"),
                  pressed: e.getAttribute("aria-pressed"),
                  selected: e.getAttribute("aria-selected"),
                  title: e.title,
                  description: e.getAttribute("aria-describedby"),
                };
              });
            const words = [];
            const canvas = document.createElement("canvas"),
              ctx = canvas.getContext("2d"),
              walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const n = walker.currentNode,
                e = n.parentElement;
              if (!e || !n.textContent.trim() || !visible(e)) continue;
              const s = getComputedStyle(e);
              ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
              const sample = n.textContent
                .trim()
                .split(/\s+/)
                .find((w) => w.length >= 3);
              if (!sample) continue;
              const m = ctx.measureText(sample);
              words.push({
                text: n.textContent.trim().slice(0, 100),
                tag: e.tagName,
                cls: e.className,
                font: s.fontSize,
                fontFamily: s.fontFamily,
                glyphAscent: m.actualBoundingBoxAscent,
                glyphDescent: m.actualBoundingBoxDescent,
                dpr: devicePixelRatio,
                color: s.color,
                background: s.backgroundColor,
                fixedAtRootScale: null,
              });
            }
            const containers = [root, ...root.querySelectorAll("*")]
              .filter(visible)
              .filter((e) => e.clientWidth > 0 && e.scrollWidth - e.clientWidth > 1)
              .map((e) => ({
                tag: e.tagName,
                cls: e.className,
                text: e.textContent.trim().slice(0, 55),
                overflowX: e.scrollWidth - e.clientWidth,
                cssOverflow: getComputedStyle(e).overflowX,
              }));
            const homeSurfaces=[...document.querySelectorAll(".town-building-info,.next-pill,.camp .console .cmd .tile")].map(e=>{
              const r=e.getBoundingClientRect(),label=e.getAttribute("aria-label");
              const text=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
              while(w.nextNode()){const n=w.currentNode,p=n.parentElement;if(!p||!visible(p)||p.closest(".vh,[aria-hidden=true]"))continue;const pr=p.getBoundingClientRect(),ps=getComputedStyle(p);if(pr.width<=1||pr.height<=1||ps.clipPath!=="none")continue;text.push(n.textContent.trim());}
              return {class:e.className,id:e.getAttribute("data-building-info")??e.getAttribute("data-tile")??"next-worker",label,state:e.getAttribute("data-state"),rect:{x:r.x,y:r.y,width:r.width,height:r.height},persistentText:text.join(" ").trim(),visibleLock:!!e.querySelector(".town-lock:not([hidden])")&&[...e.querySelectorAll(".town-lock")].some(l=>getComputedStyle(l).display!=="none")};
            });
            return {
              homeSurfaces,
              material: root.dataset.material ?? null,
              rootClass: root.className,
              rootTransform: getComputedStyle(root).transform,
              controls,
              words,
              overflow: containers,
              focusInside: root.contains(document.activeElement),
              pageOverflow: document.documentElement.scrollWidth - innerWidth,
            };
          });
          const after = await page.evaluate(() => window.__idlever.engine.save());
          if (gpu) await page.screenshot({ path: `${out}/${route}-${width}-${scale}x.png` });
          result.rows.push({
            route,
            width,
            scale,
            exactSaveUnchanged: before === after,
            saveBeforeSha256: sha(before),
            saveAfterSha256: sha(after),
            ...data,
          });
        } catch (e) {
          result.rows.push({ route, width, error: String(e.stack ?? e) });
        }
        save();
      }
    }
  }
  await Promise.all(responses);
  result.status = "diagnostic-complete";
  save();
  console.log(JSON.stringify({ rows: result.rows.length, errors: result.errors.length }));
} catch (e) {
  result.status = "failed";
  result.error = String(e.stack ?? e);
  save();
  throw e;
} finally {
  await browser?.close();
  vite.kill("SIGTERM");
  log.end();
}
