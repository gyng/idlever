import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const earned = execFileSync(
  "tar",
  [
    "-xOzf",
    new URL("../../docs/evidence/cut203/earned-kits.tar.gz", import.meta.url).pathname,
    "earned-wall.json",
  ],
  { encoding: "utf8" },
);
const earnedTown = execFileSync(
  "tar",
  [
    "-xOzf",
    new URL("../../docs/evidence/cut201/raw-earned-pacing.tar.gz", import.meta.url).pathname,
    "earned-plots/seed-1-final.json",
  ],
  { encoding: "utf8" },
);
const earnedQuest = readFileSync(
  new URL("../../docs/evidence/cut204/earned-quest.json", import.meta.url),
  "utf8",
);
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const shots = process.env.IDLEVER_LABEL_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const b = await launchBrowser({ gpu: process.env.IDLEVER_LABEL_GPU === "1" });
const results = [];
try {
  const widths = process.env.IDLEVER_LABEL_WIDTHS
    ? JSON.parse(process.env.IDLEVER_LABEL_WIDTHS)
    : [320, 400, 1440];
  for (const width of widths) {
    const p = await b.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    p.on("pageerror", (error) => errors.push(error.message));
    if (process.env.IDLEVER_LABEL_CANVAS === "1")
      await p.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return /^(webgl|webgl2|experimental-webgl)$/.test(kind)
            ? null
            : get.call(this, kind, ...args);
        };
      });
    await p.goto(`${url}?fresh=1&runs=0&seed=207`);
    await p.waitForFunction(() => window.__idlever?.booted && window.__town?.stats().frames > 3);
    await p.evaluate(() => {
      window.__idlever.runnerOn = false;
    });
    if (process.env.IDLEVER_LABEL_SCALE === "2")
      await p.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
    for (const state of [
      "ready-house",
      "locked-forge",
      "earned-night",
      "earned-all-night",
      "earned-quest-night",
    ]) {
      if (state === "locked-forge") {
        await p.locator(".town-tag").click();
        await p.waitForFunction(() => window.__idlever.lineage.town.home);
      }
      if (state.startsWith("earned")) {
        await p.evaluate(
          async (raw) => {
            const a = window.__idlever;
            await a.engine.load(raw);
            await a.refresh();
            a.go({ kind: "camp" });
          },
          state === "earned-quest-night"
            ? earnedQuest
            : state === "earned-all-night"
              ? earnedTown
              : earned,
        );
        await p.waitForFunction(() => window.__town?.stats().frames > 4);
        await p.evaluate(() => {
          window.__town.setHour(23);
          window.dispatchEvent(new PointerEvent("pointermove"));
        });
        await p.waitForFunction(
          () =>
            window.__town?.stats().night === 1 && window.__town.stats().activeBuilds.length === 0,
        );
      }
      await p.waitForTimeout(150);
      const geometry = await p.evaluate(() => {
        const town = document.querySelector(".town"),
          bounds = town.getBoundingClientRect();
        const rect = (node) => {
          const r = node.getBoundingClientRect();
          return {
            id: node.dataset.buildingInfo || node.dataset.marker || node.className,
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
          };
        };
        const visible = (selector) =>
          [...town.querySelectorAll(selector)]
            .filter(
              (node) =>
                !node.hidden &&
                node.getBoundingClientRect().width > 0 &&
                node.getBoundingClientRect().height > 0,
            )
            .map(rect);
        const labels = visible(".town-building-info"),
          fixed = visible(".town-marker,.town-tag,.next-pill");
        const overlap = (a, c) =>
          Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) *
          Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
        const collisions = [];
        for (let i = 0; i < labels.length; i++)
          for (const other of [...labels.slice(i + 1), ...fixed])
            if (overlap(labels[i], other) > 1) collisions.push([labels[i].id, other.id]);
        const outside = [...labels, ...fixed.filter((r) => r.id.includes("town-tag"))].filter(
          (r) =>
            r.x < bounds.left ||
            r.y < bounds.top ||
            r.x + r.w > bounds.right + 1 ||
            r.y + r.h > bounds.bottom + 1 ||
            r.h < 44,
        );
        const caption = document.querySelector(".topbar .concept-cap");
        let captionCollisions = [];
        if (caption) {
          const cap = rect(caption);
          captionCollisions = [...document.querySelectorAll(".topbar .stat")]
            .filter((node) => !node.contains(caption) && overlap(cap, rect(node)) > 1)
            .map((node) => node.textContent);
        }
        return {
          labels,
          fixed,
          collisions,
          outside,
          captionCollisions,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      assert.deepEqual(geometry.collisions, [], `${width} ${state}: overlapping labels`);
      assert.deepEqual(geometry.outside, [], `${width} ${state}: bounds/44px targets`);
      assert.deepEqual(geometry.captionCollisions, [], `${width} ${state}: header caption`);
      assert.equal(geometry.overflow, false);
      if (shots && state === "earned-all-night") {
        await p.mouse.move(1, 1);
        await p.screenshot({
          path: `${shots}/${width}-${process.env.IDLEVER_LABEL_CANVAS === "1" ? "canvas" : "gl"}-night-labels.png`,
        });
      }
      results.push({ width, state, ...geometry });
    }
    assert.deepEqual(errors, []);
    await p.close();
  }
  console.log(JSON.stringify({ contract: "Cut207 actual home label layout", results }));
} finally {
  await b.close();
}
