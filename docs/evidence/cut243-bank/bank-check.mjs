// Source-frozen diagnostic: actual public child entry, wheel coverage and Tab focus.
// Outline-transparent capture is presentation-only; it leaves the real focus/layout intact.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
import { auditContrast } from "../cut243-states/contrast.mjs";
const phase = process.argv[2] || "current-e62c";
if (!/^[a-z0-9-]+$/.test(phase)) throw new Error("Invalid evidence phase");
const out = resolve(`docs/evidence/cut243-bank/${phase}`);
mkdirSync(out, { recursive: true });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const fixtures = [
  { id: "empty", path: "docs/evidence/handoff-menus/input.game.json.gz" },
  { id: "saved", path: "docs/evidence/cut153/earned-d28.json.gz" },
].map((f) => ({ ...f, raw: gunzipSync(readFileSync(f.path)).toString() }));
const expectedWasm = "e62c0867b3b68c2546ba316f90d901e45547f9c80e229e86c7d6d145c62df71c";
const result = {
  scope:
    "Actual earned Bank sprite entry, native empty/saved quotes, read-only Escape, current e62c. No transaction, grant, simulation or all-family/control-border pass. Paired focus background is a presentation diagnostic.",
  inputs: fixtures.map((f) => ({
    path: f.path,
    rawSha256: hash(f.raw),
    gzipSha256: hash(readFileSync(f.path)),
    scope:
      f.id === "saved"
        ? "Historical actually earned Cut153camp/current e62cUI state, no pacing or historic departure retrofit"
        : "Existing earned menu input",
  })),
  expectedWasm,
  rows: [],
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
  browser = await launchBrowser({ gpu: true });
  for (const fixture of fixtures)
    for (const width of [320, 1440])
      for (const scale of [1, 2]) {
        const input = fixture.raw;
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
        const before = await page.evaluate(() => window.__idlever.engine.save());
        {
          const kind = fixture.id;
          await page.locator(".town-hit[data-building=bank]").click();
          await page.locator(".bank-sheet").waitFor();
          await page.evaluate(() => document.fonts.ready);
          const root = page.locator(".sheet-wrap:not(.under) > .sheet");
          const native = await page.evaluate(() => {
            const L = window.__idlever.lineage;
            return {
              kind: window.__idlever.kind,
              gold: L.gold,
              town: L.town,
              selected: L.selected_bloodline,
            };
          });
          const controls = await root.evaluate((p) =>
            [...p.querySelectorAll("button")].map((e) => {
              const r = e.getBoundingClientRect(),
                s = getComputedStyle(e);
              return {
                cls: e.className,
                text: e.textContent.trim(),
                label: e.getAttribute("aria-label"),
                description: e.getAttribute("aria-description"),
                disabled: e.disabled,
                width: r.width,
                height: r.height,
                font: s.fontSize,
                color: s.color,
              };
            }),
          );
          const material = await root.getAttribute("data-material");
          const initialPrefix = `${kind}-${width}-${scale}x`;
          await page.screenshot({ path: `${out}/${initialPrefix}.png` });
          await auditContrast(page, out, initialPrefix);
          const coverage = [];
          const inspect = () =>
            root.evaluate((panel) => {
              const body = panel.querySelector(".sheet-body") ?? panel,
                ctx = document.createElement("canvas").getContext("2d"),
                walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT),
                words = [];
              let nodeIndex = 0;
              while (walker.nextNode()) {
                const node = walker.currentNode,
                  el = node.parentElement,
                  ix = nodeIndex++;
                if (
                  !el ||
                  !node.textContent.trim() ||
                  el.closest("[hidden],.vh,[aria-hidden=true]")
                )
                  continue;
                const style = getComputedStyle(el);
                if (style.display === "none" || style.visibility === "hidden") continue;
                ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
                for (const match of node.textContent.matchAll(/\S+/g)) {
                  const range = document.createRange();
                  range.setStart(node, match.index);
                  range.setEnd(node, match.index + match[0].length);
                  const word =
                      style.textTransform === "uppercase"
                        ? match[0].toUpperCase()
                        : style.textTransform === "lowercase"
                          ? match[0].toLowerCase()
                          : match[0],
                    m = ctx.measureText(word);
                  for (const r of range.getClientRects()) {
                    if (r.width < 1 || r.height < 1) continue;
                    const fb = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
                    const ink = {
                      x: r.x,
                      y:
                        Number.isFinite(fb) && fb > 0
                          ? r.y +
                            (r.height - fb) / 2 +
                            m.fontBoundingBoxAscent -
                            m.actualBoundingBoxAscent
                          : r.y,
                      w: r.width,
                      h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
                    };
                    let clip = { left: 0, right: innerWidth, top: 0, bottom: innerHeight };
                    for (let a = el; a; a = a.parentElement) {
                      const s = getComputedStyle(a),
                        b = a.getBoundingClientRect();
                      if (/auto|scroll|hidden|clip/.test(s.overflowX)) {
                        clip.left = Math.max(clip.left, b.x + a.clientLeft);
                        clip.right = Math.min(clip.right, b.x + a.clientLeft + a.clientWidth);
                      }
                      if (/auto|scroll|hidden|clip/.test(s.overflowY)) {
                        clip.top = Math.max(clip.top, b.y + a.clientTop);
                        clip.bottom = Math.min(clip.bottom, b.y + a.clientTop + a.clientHeight);
                      }
                    }
                    const fullyInside =
                      ink.x >= clip.left - 1 &&
                      ink.x + ink.w <= clip.right + 1 &&
                      ink.y >= clip.top - 1 &&
                      ink.y + ink.h <= clip.bottom + 1;
                    const hit = document.elementFromPoint(ink.x + ink.w / 2, ink.y + ink.h / 2),
                      unoccluded = !!hit && (hit === el || el.contains(hit));
                    words.push({
                      id: `${ix}:${match.index}`,
                      word,
                      range: { x: r.x, y: r.y, w: r.width, h: r.height },
                      ink,
                      clip,
                      fullyInside,
                      unoccluded,
                      visible: fullyInside && unoccluded,
                      font: style.font,
                      fontSize: style.fontSize,
                    });
                  }
                }
              }
              const scrolls = [panel, ...panel.querySelectorAll("*")]
                .filter((e) => {
                  const s = getComputedStyle(e);
                  return (
                    /auto|scroll/.test(s.overflowY) &&
                    e.scrollHeight > e.clientHeight + 1 &&
                    e.clientHeight > 30
                  );
                })
                .map((e) => ({
                  cls: e.className,
                  top: e.scrollTop,
                  client: e.clientHeight,
                  total: e.scrollHeight,
                  scrollWidth: e.scrollWidth,
                  clientWidth: e.clientWidth,
                }));
              return {
                words,
                scrolls,
                panelWidth: panel.clientWidth,
                panelScrollWidth: panel.scrollWidth,
                pageOverflow: document.documentElement.scrollWidth - innerWidth,
              };
            });
          coverage.push(await inspect());
          const handles = await root.evaluateHandle((panel) =>
            [panel, ...panel.querySelectorAll("*")].filter((e) => {
              const s = getComputedStyle(e);
              return (
                /auto|scroll/.test(s.overflowY) &&
                e.scrollHeight > e.clientHeight + 1 &&
                e.clientHeight > 30
              );
            }),
          );
          const count = await handles.evaluate((es) => es.length);
          for (let j = 0; j < count; j++) {
            const h = await handles.getProperty(String(j));
            for (let step = 0; step < 30; step++) {
              const m = await h.evaluate((e) => {
                const r = e.getBoundingClientRect();
                return {
                  top: e.scrollTop,
                  total: e.scrollHeight,
                  client: e.clientHeight,
                  x: r.x,
                  y: r.y,
                  w: r.width,
                  h: r.height,
                };
              });
              if (m.top + m.client >= m.total - 1) break;
              await page.mouse.move(
                Math.min(width - 1, m.x + m.w / 2),
                Math.min(999, m.y + m.h / 2),
              );
              await page.mouse.wheel(0, Math.max(80, Math.floor(m.client * 0.7)));
              await page.waitForTimeout(120);
              coverage.push(await inspect());
            }
          }
          const all = new Map(),
            seen = new Set();
          for (const c of coverage)
            for (const w of c.words) {
              all.set(w.id, w);
              if (w.visible) seen.add(w.id);
            }
          const row = {
            kind,
            native,
            controls,
            material,
            initialPrefix,
            width,
            scale,
            coverage,
            wordCount: all.size,
            everFullyVisible: seen.size,
            unseenWords: [...all.values()].filter((w) => !seen.has(w.id)),
            panelHorizontalOverflow: Math.max(
              ...coverage.map((c) => c.panelScrollWidth - c.panelWidth),
            ),
            focus: [],
          };
          for (const [which, target] of [
            ["available", page.locator(".bank-acts button:not(:disabled)").first()],
          ]) {
            let reached = false;
            for (let n = 0; n < 16; n++) {
              await page.keyboard.press("Tab");
              if (await target.evaluate((e) => e === document.activeElement)) {
                reached = true;
                break;
              }
            }
            if (!reached) throw Error(`${kind} ${which} unreachable by Tab`);
            await page.mouse.move(width - 1, 999);
            await page.evaluate(
              () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
            );
            const info = await target.evaluate((e) => {
              const r = e.getBoundingClientRect(),
                s = getComputedStyle(e);
              let opacity = 1;
              for (let a = e; a; a = a.parentElement)
                opacity *= Number(getComputedStyle(a).opacity);
              return {
                rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                outlineColor: s.outlineColor,
                outlineWidth: s.outlineWidth,
                outlineOffset: s.outlineOffset,
                outlineStyle: s.outlineStyle,
                focusVisible: e.matches(":focus-visible"),
                opacity,
                text: e.textContent,
                background: s.backgroundColor,
              };
            });
            const prefix = `${kind}-${which}-${width}-${scale}x`;
            await page.screenshot({ path: `${out}/${prefix}-focused.png` });
            await target.evaluate((e) => e.classList.add("cut243-outline-probe"));
            const style = await page.addStyleTag({
              content: ".cut243-outline-probe{outline-color:transparent!important}",
            });
            await page.screenshot({ path: `${out}/${prefix}-background.png` });
            await style.evaluate((e) => e.remove());
            await target.evaluate((e) => e.classList.remove("cut243-outline-probe"));
            row.focus.push({
              ...info,
              prefix,
              focusedSha256: hash(readFileSync(`${out}/${prefix}-focused.png`)),
              backgroundSha256: hash(readFileSync(`${out}/${prefix}-background.png`)),
            });
          }
          const keyboard = [];
          for (const direction of ["Tab", "Shift+Tab"])
            for (let n = 0; n < 12; n++) {
              await page.keyboard.press(direction);
              keyboard.push(
                await page.evaluate((direction) => {
                  const top = document.querySelector(".sheet-wrap:not(.under) > .sheet"),
                    a = document.activeElement;
                  return {
                    direction,
                    inside: !!top?.contains(a),
                    tag: a?.tagName,
                    label: a?.getAttribute("aria-label"),
                    text: a?.textContent,
                  };
                }, direction),
              );
            }
          row.keyboard = keyboard;
          row.refresh = await page.evaluate(async () => {
            const key = (e) =>
              JSON.stringify([e?.tagName, e?.getAttribute("aria-label"), e?.textContent?.trim()]);
            const asked = key(document.activeElement),
              samples = [];
            for (let n = 1; n <= 100; n++) {
              await window.__idlever.refresh();
              const top = document.querySelector(".sheet-wrap:not(.under) > .sheet"),
                a = document.activeElement;
              samples.push({ n, inside: !!top?.contains(a), sameLogical: key(a) === asked });
            }
            return { asked, samples };
          });
          await page.keyboard.press("Escape");
          row.focusReturnedToSprite = await page
            .locator(".town-hit[data-building=bank]")
            .evaluate((e) => e === document.activeElement);
          row.exactPostCancel =
            before === (await page.evaluate(() => window.__idlever.engine.save()));
          result.rows.push(row);
          save();
          if (!row.exactPostCancel) throw Error("read-only Bank proof mutated save");
          if (
            row.keyboard.some((s) => !s.inside) ||
            row.refresh.samples.some((s) => !s.inside || !s.sameLogical)
          )
            throw Error("Bank lost actual modal keyboard/refresh focus");
        }
        await page.close();
      }
  await Promise.all(pending);
  const wasm = result.served.filter((r) => r.path.endsWith(".wasm"));
  if (!wasm.length || wasm.some((r) => r.sha256 !== expectedWasm))
    throw Error("Unexpected actual served WASM identity");
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
