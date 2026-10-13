// Cut204 visual comparison: real menus; explicit fixtures only for the state board.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "./browser.mjs";
const phase = process.env.IDLEVER_FOUNDATIONS_PHASE ?? "baseline";
const out = `docs/evidence/cut204/${phase}`;
const foundationSource = readFileSync(
  new URL("../web/src/ui-foundations.css", import.meta.url),
  "utf8",
);
const servedModules = new Map();
const pendingResponses = [];
const servedPaths = new Set([
  "/src/ui/town.ts",
  "/src/ui/bloodline-loadouts.ts",
  "/src/ui/bloodline-tabs.ts",
  "/src/ui/forge.ts",
  "/src/ui/sheet.ts",
  "/src/ui/quest.ts",
  "/src/ui/design-system-board.ts",
  "/src/ui-foundations.css",
]);
mkdirSync(out, { recursive: true });
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../", import.meta.url),
  encoding: "utf8",
}).trim();
const raw = readFileSync(
  process.env.IDLEVER_FOUNDATIONS_SAVE ?? "scratchpad/cut201/after/seed-1-final.json",
  "utf8",
);
const questRaw = readFileSync(
  process.env.IDLEVER_FOUNDATIONS_QUEST_SAVE ??
    process.env.IDLEVER_FOUNDATIONS_SAVE ??
    "scratchpad/cut201/after/seed-1-final.json",
  "utf8",
);
async function openMenu(page, menu, questRaw) {
  await page.evaluate(
    async ({ menu, questRaw }) => {
      const a = window.__idlever;
      const sheets = await import("/src/ui/sheet.ts");
      sheets.closeAllSheets();
      if (menu === "journal") {
        a.lineage = await a.engine.load(questRaw);
        if (!a.lineage.town?.quest) throw Error("earned quest-ready save required");
        (await import("/src/ui/quest.ts")).openQuest(a);
      } else if (menu === "forge") (await import("/src/ui/forge.ts")).openForge(a);
      else
        (await import("/src/ui/town.ts")).openHero(
          a,
          undefined,
          menu === "bloodlines-class"
            ? "class"
            : menu === "bloodlines-legacy"
              ? "legacy"
              : "loadouts",
        );
    },
    { menu, questRaw },
  );
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const wasmPath = new URL("../web/src/engine/pkg/idlever_wasm_bg.wasm", import.meta.url);
const wasmBefore = readFileSync(wasmPath);
const phaseInputs = {
  phase,
  wasmBytes: wasmBefore.length,
  wasmSha256: hash(wasmBefore),
  saveSha256: hash(raw),
  questSaveSha256: hash(questRaw),
  foundationsSha256: hash(readFileSync(new URL("../web/src/ui-foundations.css", import.meta.url))),
};
const browser = await launchBrowser({ gpu: true });
const measurements = [];
try {
  for (const width of [400, 1440]) {
    const p = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    p.on("response", (response) => {
      const url = new URL(response.url());
      if (!servedPaths.has(url.pathname)) return;
      pendingResponses.push(
        response.body().then((body) => {
          const digest = hash(body);
          const name = `${url.pathname.split("/").pop()}-${digest.slice(0, 12)}.txt`;
          writeFileSync(`${out}/${name}`, body);
          servedModules.set(response.url(), { url: response.url(), sha256: digest, file: name });
        }),
      );
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    {
      const disabled = await p.evaluate(() => {
        const styles = [...document.querySelectorAll("style[data-vite-dev-id]")].filter((el) =>
          el.dataset.viteDevId.endsWith("/ui-foundations.css"),
        );
        styles.forEach((el) => {
          el.sheet.disabled = true;
        });
        return styles.length;
      });
      assert.equal(disabled, 1, "baseline reproduces pre-foundation styling only");
    }
    if (phase === "candidate") await p.addStyleTag({ content: foundationSource });
    await p.evaluate(async (raw) => {
      const a = window.__idlever;
      if (a.kind !== "wasm") throw Error("real WASM required");
      a.runnerOn = false;
      a.lineage = await a.engine.load(raw);
      a.go({ kind: "camp" });
    }, raw);
    for (const menu of [
      "forge",
      "bloodlines",
      "bloodlines-class",
      "bloodlines-legacy",
      "journal",
    ]) {
      await openMenu(p, menu, questRaw);
      await p.locator(".sheet-wrap:not(.under) .game-window").waitFor();
      await p.locator(".sheet-ghost").waitFor({ state: "detached" });
      await p.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.querySelectorAll("img")].map((im) => im.decode().catch(() => {})),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      await p.screenshot({ path: `${out}/${width}-${menu}.png` });
      if (phase === "candidate") {
        const active = p.locator(".sheet-wrap:not(.under) .game-window");
        assert.ok(
          await active
            .locator(".close-stud")
            .evaluate(
              (el) =>
                getComputedStyle(el).backgroundImage !== "none" ||
                getComputedStyle(el, "::before").content !== "none",
            ),
          "close mark remains visible",
        );
        const controls = await active
          .locator("button:visible, summary:visible")
          .evaluateAll((els) =>
            els.map((el) => ({
              label: el.textContent?.trim(),
              width: el.getBoundingClientRect().width,
              height: el.getBoundingClientRect().height,
            })),
          );
        assert.ok(
          controls.every((c) => c.width >= 44 && c.height >= 44),
          JSON.stringify({ width, menu, controls }),
        );
        const btn = active
          .locator("button:not(:disabled):not(.close-stud):not(.sheet-back)")
          .first();
        if (await btn.count()) {
          const goldBefore = await p.evaluate(() => window.__idlever.lineage.gold);
          const normal = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
          await btn.hover();
          const hovered = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
          assert.notEqual(hovered, normal, "real hover changes the plate");
          await p.mouse.down();
          assert.equal(await btn.evaluate((el) => el.matches(":active")), true);
          assert.notEqual(
            await btn.evaluate((el) => getComputedStyle(el).backgroundColor),
            hovered,
            "real press changes the plate",
          );
          await p.keyboard.press("Escape");
          await p.mouse.move(0, 0);
          await p.mouse.up();
          await openMenu(p, menu, questRaw);
          await p.locator(".sheet-ghost").waitFor({ state: "detached" });
          assert.equal(
            await p.evaluate(() => window.__idlever.lineage.gold),
            goldBefore,
            "press probe spends nothing",
          );
          await btn.focus();
          assert.equal(await btn.evaluate((el) => el.matches(":focus-visible")), true);
          assert.ok(await btn.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth) >= 2));
          await p.keyboard.press("Tab");
          assert.ok(await active.evaluate((el) => el.contains(document.activeElement)));
        }
        const samples = await p.evaluate(() => {
          const root = document.querySelector(".sheet-wrap:not(.under) .game-window");
          const nodes = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const rows = [];
          while (nodes.nextNode()) {
            const node = nodes.currentNode,
              el = node.parentElement;
            if (!node.textContent.trim() || !el || getComputedStyle(el).visibility !== "visible")
              continue;
            const range = document.createRange();
            range.selectNode(node);
            const st = getComputedStyle(el);
            for (const r of range.getClientRects())
              if (
                r.width > 2 &&
                r.height > 2 &&
                r.y >= 0 &&
                r.bottom <= innerHeight &&
                r.x >= 0 &&
                r.right <= innerWidth
              ) {
                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                if (!hit || !(el === hit || el.contains(hit))) continue;
                rows.push({
                  text: node.textContent.trim(),
                  color: st.color,
                  rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                  inactive: !!el.closest(":disabled"),
                });
              }
          }
          return rows;
        });
        writeFileSync(
          `${out}/${width}-${menu}-contrast.json`,
          JSON.stringify({ width, samples }, null, 2),
        );
        const transparent = await p.addStyleTag({
          content:
            ".game-window[data-material] * { color: transparent !important; text-shadow:none !important; }",
        });
        await p.screenshot({ path: `${out}/${width}-${menu}-background.png` });
        await transparent.evaluate((el) => el.remove());
        const normalBody = await active
          .locator(".sheet-body")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        const rootSize = await p.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        );
        const zoom = await p.addStyleTag({
          content: `html { font-size:${rootSize * 2}px !important; }`,
        });
        assert.equal(
          await active
            .locator(".sheet-body")
            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
          normalBody * 2,
        );
        assert.equal(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          `${width} ${menu} text scale overflow`,
        );
        const nested = await active.evaluate((el) =>
          [
            ...el.querySelectorAll(
              ".sheet-body,.bloodline-panel,.class-tree-panel,.legacy-tree,.quest-card",
            ),
          ].map((x) => ({ class: x.className, overflow: x.scrollWidth - x.clientWidth })),
        );
        assert.ok(
          nested.every((x) => x.overflow <= 1),
          JSON.stringify({ width, menu, zoomOverflow: nested }),
        );
        await p.screenshot({ path: `${out}/${width}-${menu}-zoom.png` });
        await active.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        assert.ok((await active.locator("button:visible").count()) > 0);
        await zoom.evaluate((el) => el.remove());
      }

      measurements.push(
        await p.evaluate(
          ({ width, menu }) => ({
            width,
            menu,
            material:
              document.querySelector(".sheet-wrap:not(.under) .game-window").dataset.material ??
              null,
            bodyFont: getComputedStyle(
              document.querySelector(".sheet-wrap:not(.under) .game-window .sheet-body"),
            ).fontSize,
            scrollWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
          }),
          { width, menu },
        ),
      );
    }
    if (phase === "candidate") {
      await p.evaluate(async () => {
        (await import("/src/ui/sheet.ts")).closeAllSheets();
        document.querySelector("#app").hidden = true;
        document.body.append((await import("/src/ui/design-system-board.ts")).designSystemBoard());
      });
      await p.locator(".sheet-ghost").waitFor({ state: "detached" });
      await p.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      assert.equal(await p.locator("[data-cell]").count(), 27);
      await p.screenshot({ path: `${out}/${width}-states.png`, fullPage: true });
      const stateSamples = await p.evaluate(() => {
        const nodes = document.createTreeWalker(
          document.querySelector(".foundation-board"),
          NodeFilter.SHOW_TEXT,
        );
        const samples = [];
        while (nodes.nextNode()) {
          const node = nodes.currentNode;
          if (!node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNode(node);
          const el = node.parentElement;
          for (const r of range.getClientRects())
            if (r.width > 2 && r.height > 2)
              samples.push({
                text: node.textContent.trim(),
                color: getComputedStyle(el).color,
                rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                inactive: !!el.closest(":disabled"),
              });
        }
        return samples;
      });
      writeFileSync(
        `${out}/${width}-states-contrast.json`,
        JSON.stringify({ width, samples: stateSamples }, null, 2),
      );
      const hiddenText = await p.addStyleTag({
        content:
          ".foundation-board * { color:transparent !important;text-shadow:none !important; }",
      });
      await p.screenshot({ path: `${out}/${width}-states-background.png`, fullPage: true });
      await hiddenText.evaluate((el) => el.remove());

      assert.ok(
        await p
          .locator(".ui-action")
          .evaluateAll((els) => els.every((el) => el.offsetWidth >= 44 && el.offsetHeight >= 44)),
      );
      assert.ok(
        await p
          .locator(".ui-material")
          .evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth)),
      );
    }
    assert.deepEqual(errors, []);
    await Promise.all(pendingResponses);
    await p.close();
  }
} finally {
  await browser.close();
}
assert.equal(
  hash(readFileSync(wasmPath)),
  phaseInputs.wasmSha256,
  "WASM source unchanged during phase",
);
phaseInputs.cssDelivery =
  phase === "candidate"
    ? "exact owned CSS snapshot injected; imported style disabled"
    : "owned stylesheet disabled for baseline";
writeFileSync(
  `${out}/served-modules.json`,
  JSON.stringify([...servedModules.values()], null, 2) + "\n",
);
writeFileSync(`${out}/inputs.json`, JSON.stringify(phaseInputs, null, 2) + "\n");
writeFileSync(`${out}/measurements.json`, JSON.stringify(measurements, null, 2) + "\n");
console.log(`${phase}: ${measurements.length} settled real-menu screenshots PASS`);
