// Real current WASM earned-save child states, actual DOM entry, no offers/grants or purchases.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
import { auditContrast } from "./contrast.mjs";
const arg = (key, fallback) => {
  const i = process.argv.indexOf(key);
  return i < 0 ? fallback : process.argv[i + 1];
};
const phase = arg("--phase", "safe-entry");
const foundingOnly = process.argv.includes("--founding-only");
const focusOnly = process.argv.includes("--focus-only");
const contrastOnly = process.argv.includes("--contrast");
const skillsOnly = process.argv.includes("--skills-only");
const fullFocus = process.argv.includes("--full-focus");
const scrollOnly = process.argv.includes("--scroll-only");
const renameOnly = process.argv.includes("--rename-only");
const contrastTargets = new Set([
  "rename-current",
  "appearance-selected",
  "skill-review",
  "style-review",
  "founding-confirmation",
  "roster-native-acquisition",
]);
const out = resolve(`docs/evidence/cut243-states/${phase}`);
mkdirSync(out, { recursive: true });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const inputPath = arg("--input", "docs/evidence/handoff-menus/input.game.json.gz");
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
  browser = await launchBrowser({ gpu: contrastOnly });
  for (const width of arg("--widths", "320,1440").split(",").map(Number))
    for (const scale of focusOnly ? [1] : [1, 2]) {
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
        const exactNow = baseline === (await page.evaluate(() => window.__idlever.engine.save()));
        (result.readOnlyChecks ??= []).push({ name, width, scale, exactSave: exactNow, ...extra });
        save();
        if (!exactNow) throw Error(`${name} mutated engine save`);
        if (focusOnly && !name.includes("keyboard")) return;
        if (scrollOnly && !name.includes("-scroll-")) return;
        if (contrastOnly && !contrastTargets.has(name) && !name.includes("-scroll-")) return;
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
        if (contrastOnly && !(name === "roster-native-acquisition" && width >= 1024))
          await auditContrast(page, out, `${name}-${width}-${scale}x`);
        else if (contrastOnly)
          result.missing.push({
            width,
            scale,
            route: name,
            reason:
              "Desktop roster is inline Home, not a modal material; child contrast sampler not applied to the whole Home.",
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
        for (const direction of fullFocus ? ["Tab", "Shift+Tab"] : ["Tab"])
          for (let i = 0; i < 12; i++) {
            await page.keyboard.press(direction);
            positions.push(
              await page.evaluate(() => {
                const a = document.activeElement;
                const top = [...document.querySelectorAll(".sheet-wrap")]
                  .filter((e) => {
                    const r = e.getBoundingClientRect(),
                      s = getComputedStyle(e);
                    return (
                      r.width > 1 &&
                      r.height > 1 &&
                      s.visibility !== "hidden" &&
                      s.display !== "none" &&
                      !e.closest("[hidden]")
                    );
                  })
                  .at(-1);
                return {
                  tag: a?.tagName,
                  cls: a?.className,
                  inside: !!top?.contains(a),
                  top: top?.className,
                };
              }),
            );
            positions[positions.length - 1].direction = direction;
          }
        const refreshes = fullFocus
          ? await page.evaluate(async () => {
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
              const key = (e) =>
                JSON.stringify([
                  e?.tagName,
                  e?.getAttribute("aria-label"),
                  e?.getAttribute("role"),
                  e?.getAttribute("data-upgrade"),
                  e?.getAttribute("data-row"),
                  e?.textContent?.trim(),
                ]);
              const asked = key(document.activeElement),
                rows = [];
              for (let i = 1; i <= 100; i++) {
                await window.__idlever.refresh();
                const top = [...document.querySelectorAll(".sheet-wrap")].filter(visible).at(-1),
                  active = document.activeElement;
                rows.push({
                  i,
                  inside: !!top?.contains(active),
                  sameLogical: key(active) === asked,
                  key: key(active),
                });
              }
              return { asked, rows };
            })
          : null;
        await record(name, {
          refreshes,
          tabSequence: positions,
          tabContained: positions.every((p) => p.inside),
        });
        if (
          fullFocus &&
          (!positions.every((p) => p.inside) ||
            refreshes.rows.some((r) => !r.inside || !r.sameLogical))
        )
          throw Error(`${name} lost topmost logical focus`);
      };
      const scrollReview = async (name) => {
        const candidates = await page
          .locator(".sheet-wrap:not(.under) > .sheet")
          .evaluateHandle((root) =>
            [root, ...root.querySelectorAll("*")].filter((e) => {
              const s = getComputedStyle(e);
              return (
                /auto|scroll/.test(s.overflowY) &&
                e.scrollHeight > e.clientHeight + 1 &&
                e.clientHeight > 30
              );
            }),
          );
        const count = await candidates.evaluate((es) => es.length);
        if (!count) {
          result.missing.push({
            width,
            scale,
            route: name,
            scope: "scroll",
            reason:
              "No overflow in this actual state; full initially visible viewport covered by prior record",
          });
          return;
        }
        for (let index = 0; index < count; index++) {
          const handle = await candidates.getProperty(String(index));
          const metrics = () =>
            handle.evaluate((e) => ({
              top: e.scrollTop,
              client: e.clientHeight,
              total: e.scrollHeight,
              x: e.getBoundingClientRect().x,
              y: e.getBoundingClientRect().y,
              width: e.getBoundingClientRect().width,
              height: e.getBoundingClientRect().height,
              cls: e.className,
            }));
          const start = await metrics();
          let previous = start.top;
          for (let step = 0; step < 30; step++) {
            const m = await metrics();
            if (m.top + m.client >= m.total - 1) break;
            await page.mouse.move(
              Math.max(1, Math.min(width - 1, m.x + m.width / 2)),
              Math.max(1, Math.min(999, m.y + m.height / 2)),
            );
            await page.mouse.wheel(0, Math.max(80, Math.floor(m.client * 0.7)));
            await page.waitForTimeout(150);
            const after = await metrics();
            await record(`${name}-scroll-${index}-${step}`, {
              scroller: after,
              initialScroller: start,
            });
            if (after.top <= previous + 0.5)
              throw Error(`${name} wheel did not advance actual overflow`);
            previous = after.top;
          }
          const end = await metrics();
          if (end.top + end.client < end.total - 1) throw Error(`${name} did not reach bottom`);
        }
      };
      if (!skillsOnly) {
        if (!renameOnly) {
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
          if (foundingOnly) await record("roster-native-acquisition", { native: facts });
          if ((await add.count()) && (await add.isEnabled()) && facts.autoSend) {
            await add.click();
            await page.locator(".bloodline-founding").waitFor();
            await record("founding-confirmation", { native: facts });
            await trap("founding-keyboard");
            if (focusOnly) {
              await page.close();
              save();
              continue;
            }
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
          if (foundingOnly) {
            await page.close();
            save();
            continue;
          }
        }
        const rename = page.locator(".tab.edit[aria-label=rename]:visible").first();
        if (await rename.count()) {
          const setsBefore = await page.evaluate(() => JSON.stringify(window.__idlever.sets));
          await rename.click();
          await page.locator(".saved-setup-name").waitFor();
          if (
            renameOnly &&
            (await page.getByRole("textbox", { name: "Setup name", exact: true }).count()) !== 1
          )
            throw Error("Missing Setup name accessible textbox");
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
        if (renameOnly) {
          await page.close();
          save();
          continue;
        }
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
      }
      await page.locator(".town-hit[data-building=tent]").click();
      await page.locator("[data-hub-tab=skills]").click();
      await record("skills-actual-native-offers", {
        native: await page.evaluate(() => {
          const L = window.__idlever.lineage;
          return {
            class: L.class,
            selected: L.selected_bloodline,
            tree: L.class_tree,
            styles: L.class_styles,
            hero: L.persistent_hero?.id,
          };
        }),
      });
      for (const [kind, selector, dialog] of [
        ["skill", ".class-path-choose:not(:disabled)", ".class-path-review"],
        ["style", ".class-style-choose:not(:disabled)", ".class-style-review"],
      ]) {
        const choose = page.locator(selector).first();
        if (await choose.count()) {
          await choose.click();
          await page.locator(dialog).waitFor();
          await record(`${kind}-review`);
          if (scrollOnly) await scrollReview(`${kind}-review`);
          if (!scrollOnly) await trap(`${kind}-review-keyboard`);
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
