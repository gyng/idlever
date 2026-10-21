// Cut316: capture every player-facing surface of an earned town for the UI revamp's before/after review.
// Headless only (never steals focus). Earned first-ascension save (web/tests/fixtures), no grants.
//
//   node tools/ui-capture.mjs --out DIR [--viewport 1440x900|402x681|both] [--url URL] [--only name,name]
//   python3 tools/ui-diff.py BEFORE_DIR AFTER_DIR      # per-image changed-pixel share + contact sheet
//
// Writes DIR/<w>x<h>/<NN-name>.png and DIR/<w>x<h>/log.txt (failures named, never hidden).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "./browser.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const out = arg("--out");
if (!out) throw Error("--out DIR required");
const url =
  arg("--url") ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
  }).trim();
const vp = arg("--viewport", "both");
const viewports =
  vp === "both"
    ? [
        [1440, 900],
        [402, 681],
      ]
    : [vp.split("x").map(Number)];
const only = arg("--only")?.split(",");
const fixture = new URL("../web/tests/fixtures/earned-first-ascension-clear.json", import.meta.url);
const source = readFileSync(fixture, "utf8");

async function earned(browser, w, h) {
  const loadout = JSON.parse(source).loadout;
  const p = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  await p.goto(`${url}?dev=1&fresh=1&runs=0`);
  await p.waitForFunction(() => window.__idlever?.booted);
  await p.evaluate(
    ({ source, loadout }) =>
      window.__idlever.importSave(
        JSON.stringify({
          v: 2,
          engine: source,
          loadout,
          last_seen: Date.now(),
          runs: ["runs_banked", "runs_returned", "runs_died"].reduce(
            (s, k) => s + (JSON.parse(source).lineage[k] ?? 0),
            0,
          ),
        }),
      ),
    { source, loadout },
  );
  await p.waitForSelector(".ending-town");
  await p.waitForTimeout(500);
  return p;
}
async function toCamp(p) {
  await p.evaluate(() => {
    window.__idlever.runnerOn = false;
  });
  await p.locator(".ending-town").focus();
  await p.keyboard.press("Enter");
  await p.waitForSelector(".camp");
  await p.waitForTimeout(800);
}

const browser = await launchBrowser();
try {
  for (const [W, H] of viewports) {
    const dir = `${out}/${W}x${H}`;
    mkdirSync(dir, { recursive: true });
    const log = [];
    const shot = async (p, name) => {
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${dir}/${name}.png` });
      log.push(name);
      // Cut316: every window is dark slate — dark text inside one is invisible. Report it (label · colour · class).
      const dark = await p.evaluate(() => {
        const lum = (c) => {
          const m = c.match(/[\d.]+/g);
          if (!m) return 1;
          const [r, g, b, a = 1] = m.map(Number);
          if (a < 0.5) return 1;
          const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const out = [];
        for (const host of document.querySelectorAll(".game-window, .sheet, .panel[data-panel]"))
          for (const el of host.querySelectorAll("*")) {
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (!own || !el.getClientRects().length) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || +cs.opacity === 0) continue;
            if (lum(cs.color) < 0.08)
              out.push(`${el.textContent.trim().slice(0, 24)} · ${cs.color} · ${el.className}`);
          }
        return out;
      });
      if (dark.length) log.push(`DARK ${name}: ${dark.length} — ${dark.slice(0, 6).join(" | ")}`);
    };
    const click = (p, sel) => p.locator(sel).first().click({ timeout: 5000 });
    async function state(name, fn) {
      if (only && !only.some((o) => name.startsWith(o))) return;
      const p = await earned(browser, W, H);
      try {
        if (name !== "ending") await toCamp(p);
        await fn(p);
      } catch (e) {
        log.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
      }
      await p.close();
    }
    await state("ending", (p) => shot(p, "00-ending-town"));
    await state("camp", (p) => shot(p, "01-camp"));
    for (const t of ["heroes", "packages", "edit", "loadout", "unlocks", "ledger"])
      await state(`tile-${t}`, async (p) => {
        await click(p, `.tile[data-tile=${t}]:visible`);
        await shot(p, `10-tile-${t}`);
      });
    for (const bd of ["tent", "blacksmith", "bank", "guild", "device", "board"])
      await state(`bld-${bd}`, async (p) => {
        await click(p, `.town-hit[data-building=${bd}]`);
        await shot(p, `20-bld-${bd}`);
        if (bd !== "tent") return;
        const tabs = await p
          .locator("[data-hub-tab]")
          .evaluateAll((es) => es.map((e) => e.dataset.hubTab));
        for (const tb of tabs) {
          await click(p, `[data-hub-tab="${tb}"]`);
          await shot(p, `21-hub-${tb}`);
        }
      });
    const chips = {
      menu: "button.gear",
      forecast: "button.shaft",
      rules: "button.chip:has-text('Rules')",
      chronicle: "button.hero-history",
      gold: "button.stat.gold",
    };
    for (const [n, s] of Object.entries(chips))
      await state(n, async (p) => {
        await click(p, `${s}:visible`);
        await shot(p, `30-${n}`);
      });
    for (const [i, label] of ["Journal", "Achievements", "Settings"].entries())
      await state(`menu-${label}`, async (p) => {
        await click(p, "button.gear:visible");
        await p.waitForTimeout(300);
        await p
          .locator(".home-menu-panel button:visible, [role=menu] button:visible")
          .nth(i)
          .click({ timeout: 5000 });
        await shot(p, `31-menu-${label}`);
      });
    writeFileSync(`${dir}/log.txt`, log.join("\n"));
    console.log(
      `${W}x${H}: ${log.length} entries, ${log.filter((l) => l.startsWith("FAIL")).length} FAIL`,
    );
    for (const l of log.filter((l) => l.startsWith("FAIL"))) console.log("  " + l);
  }
} finally {
  await browser.close();
}
