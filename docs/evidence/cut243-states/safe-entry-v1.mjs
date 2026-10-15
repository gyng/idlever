// Real current WASM earned-save child states, actual DOM entry, no offers/grants or purchases.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
const out = resolve("docs/evidence/cut243-states/safe-entry");
mkdirSync(out, { recursive: true });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const inputPath = "docs/evidence/handoff-menus/input.game.json.gz";
const input = gunzipSync(readFileSync(inputPath)).toString();
const result = {
  scope:
    "Actual public earned child-entry/state/Cancel/focus checks; no purchases, grants, game advancement or complete contrast claim",
  inputPath,
  inputSha256: hash(input),
  node: process.version,
  rows: [],
  missing: [],
  served: [],
  errors: [],
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
const pending = [];
try {
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await launchBrowser();
  for (const width of [320, 1440])
    for (const scale of [1, 2]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (e) => {
        result.errors.push(String(e));
        save();
      });
      page.on("response", (r) => {
        const path = new URL(r.url()).pathname;
        if (path.startsWith("/src/") || path.endsWith(".wasm"))
          pending.push(
            r
              .body()
              .then((b) => result.served.push({ path, bytes: b.length, sha256: hash(b) }))
              .catch(() => {}),
          );
      });
      await page.goto(`${url}?fresh=1&seed=1&runs=0`);
      await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
      await page.evaluate(
        async ({ raw, scale }) => {
          const a = window.__idlever;
          a.runnerOn = false;
          a.lineage = await a.engine.load(raw);
          await a.refresh();
          a.go({ kind: "camp" });
          document.documentElement.style.fontSize = `${16 * scale}px`;
          (await import("/src/render/fxpref.ts")).setEffectsLevel("off");
        },
        { raw: input, scale },
      );
      await page.waitForTimeout(800);
      const baseline = await page.evaluate(() => window.__idlever.engine.save());
      const record = async (name, extra = {}) => {
        const data = await page.evaluate(() => {
          const visible = (e) => {
            const r = e.getBoundingClientRect(),
              s = getComputedStyle(e);
            return (
              r.width > 1 &&
              r.height > 1 &&
              s.visibility !== "hidden" &&
              s.display !== "none" &&
              !e.closest("[hidden]")
            );
          };
          const roots = [...document.querySelectorAll(".sheet-wrap")].filter(visible);
          const root = roots.at(-1) ?? document.querySelector("main");
          const controls = [
            ...root.querySelectorAll(
              "button,input,select,textarea,summary,[role=button],[role=tab]",
            ),
          ]
            .filter(visible)
            .map((e) => {
              const r = e.getBoundingClientRect(),
                s = getComputedStyle(e);
              return {
                tag: e.tagName,
                text: e.textContent?.trim().slice(0, 120),
                label: e.getAttribute("aria-label"),
                labelledBy: e.getAttribute("aria-labelledby"),
                description: e.getAttribute("aria-description"),
                placeholder: e.getAttribute("placeholder"),
                disabled: !!e.disabled,
                pressed: e.getAttribute("aria-pressed"),
                selected: e.getAttribute("aria-selected"),
                width: r.width,
                height: r.height,
                font: s.fontSize,
                color: s.color,
                background: s.backgroundColor,
              };
            });
          return {
            material:
              root.dataset.material ?? root.querySelector("[data-material]")?.dataset.material,
            text: root.textContent?.trim(),
            controls,
            undersized: controls.filter((c) => c.width < 44 || c.height < 44),
            focus: {
              inside: root.contains(document.activeElement),
              active: document.activeElement?.outerHTML,
            },
            pageOverflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        const exact = baseline === (await page.evaluate(() => window.__idlever.engine.save()));
        const file = `${name}-${width}-${scale}x.png`;
        await page.screenshot({ path: `${out}/${file}` });
        result.rows.push({
          name,
          width,
          scale,
          ...extra,
          ...data,
          exactSave: exact,
          saveSha256: hash(baseline),
          frame: file,
          frameSha256: hash(readFileSync(`${out}/${file}`)),
        });
        save();
        if (!exact) throw Error(`${name} mutated engine save`);
      };
      const close = async () => {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      };
      const trap = async (name) => {
        const positions = [];
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press("Tab");
          positions.push(
            await page.evaluate(() => {
              const a = document.activeElement;
              return { tag: a?.tagName, cls: a?.className, inside: !!a?.closest(".sheet-wrap") };
            }),
          );
        }
        await record(name, {
          tabSequence: positions,
          tabContained: positions.every((p) => p.inside),
        });
      };
      // Real roster UI and its real native acquisition state. Never click an immediate-spend branch.
      const facts = await page.evaluate(() => {
        const L = window.__idlever.lineage;
        return {
          autoSend: L.tree?.auto_send,
          gold: L.gold,
          price: L.bloodline_price,
          cap: L.bloodline_cap,
          slots: L.hero_slots?.length,
          home: L.town?.home,
        };
      });
      const expand = page.locator(".hero-expand:visible");
      if (await expand.count()) await expand.click();
      const add = page.locator(".hero-add:visible").first();
      if ((await add.count()) && (await add.isEnabled()) && facts.autoSend) {
        await add.click();
        await page.locator(".bloodline-founding").waitFor();
        await record("founding-confirmation", { native: facts });
        await trap("founding-keyboard");
        await page.getByRole("button", { name: "Scout settings", exact: true }).click();
        await page.locator(".settings").waitFor();
        await record("founding-scout-settings");
        await close();
        await page.locator(".bloodline-founding").waitFor();
        await record("founding-settings-return");
        await close();
      } else
        result.missing.push({
          width,
          scale,
          route: "founding-confirmation",
          native: facts,
          reason:
            "Earned wire does not permit safe confirmation branch; immediate-spend branch never clicked",
        });
      await page.evaluate(async () => {
        (await import("/src/ui/sheet.ts")).closeAllSheets();
      });
      const rename = page.locator(".tab.edit[aria-label=rename]:visible").first();
      if (await rename.count()) {
        const setsBefore = await page.evaluate(() => JSON.stringify(window.__idlever.sets));
        await rename.click();
        await page.locator(".saved-setup-name").waitFor();
        await record("rename-current");
        await page.locator(".name-input").fill("12345678901234567890");
        await record("rename-max12", {
          inputValue: await page.locator(".name-input").inputValue(),
        });
        await trap("rename-keyboard");
        await close();
        const sameSets =
          setsBefore === (await page.evaluate(() => JSON.stringify(window.__idlever.sets)));
        await record("rename-cancel", { savedSetNamesUnchanged: sameSets });
        if (!sameSets) throw Error("rename Cancel changed saved sets");
      } else
        result.missing.push({
          width,
          scale,
          route: "rename",
          reason: "No actual visible rename entry in this earned UI",
        });
      // Header Appearance is reached through the real House→Hero route.
      await page.locator(".town-hit[data-building=tent]").click();
      await page.locator("[data-hub-action=appearance]").click();
      await page.locator(".look-sheet").waitFor();
      await record("appearance-selected");
      await trap("appearance-keyboard");
      const current = page.locator(".look[aria-pressed=true]");
      if (await current.count()) {
        await current.click();
        await record("appearance-current-click");
      } else {
        result.missing.push({
          width,
          scale,
          route: "appearance-current-click",
          reason: "No native look is selected",
        });
        await close();
      }
      await page.evaluate(async () => {
        (await import("/src/ui/sheet.ts")).closeAllSheets();
      });
      await page.locator(".town-hit[data-building=tent]").click();
      await page.locator("[data-hub-tab=skills]").click();
      await record("skills-actual-native-offers");
      for (const [kind, selector, dialog] of [
        ["skill", ".class-path-choose:not(:disabled)", ".class-path-review"],
        ["style", ".class-style-choose:not(:disabled)", ".class-style-review"],
      ]) {
        const choose = page.locator(selector).first();
        if (await choose.count()) {
          await choose.click();
          await page.locator(dialog).waitFor();
          await record(`${kind}-review`);
          await trap(`${kind}-review-keyboard`);
          await page.getByRole("button", { name: "Cancel", exact: true }).click();
          await record(`${kind}-review-cancel`);
        } else
          result.missing.push({
            width,
            scale,
            route: `${kind}-review`,
            reason: "No native available real review entry; actual blocked/owned offers recorded",
          });
      }
      await page.close();
      save();
    }
  await Promise.all(pending);
  result.status = "diagnostic-complete";
  save();
} catch (e) {
  result.status = "FAIL";
  result.error = String(e.stack ?? e);
  save();
  throw e;
} finally {
  await browser?.close();
  vite.kill("SIGTERM");
  log.end();
}
