import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";
const catalogue = JSON.parse(
  readFileSync(new URL("./fixtures/class-path-catalogue.json", import.meta.url), "utf8"),
);
const paintedManifest = JSON.parse(
  readFileSync(new URL("../../art/class-skills.json", import.meta.url), "utf8"),
);
const wantedPaint = new Map(
  paintedManifest.assets.map((asset) => [
    asset.output.replace("web/public", ""),
    asset.output_sha256,
  ]),
);
assert.equal(wantedPaint.size, 72);
const servedPaint = [];
const pendingPaint = [];
for (const [path, expected] of Object.entries(catalogue.sourceHashes))
  assert.equal(
    createHash("sha256")
      .update(readFileSync(new URL(`../../${path}`, import.meta.url)))
      .digest("hex"),
    expected,
    "Regenerate the native class catalogue fixture",
  );
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const shots = process.env.IDLEVER_SKILL_ICON_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const nodes = catalogue.classes.flatMap((group) =>
  group.nodes.map((node) => ({ id: node.id, name: node.name, cls: group.class })),
);
assert.equal(nodes.length, 72);
assert.equal(new Set(nodes.map((x) => x.id)).size, 72);
const b = await launchBrowser({ gpu: process.env.IDLEVER_ICON_GPU === "1" });
const errors = [];
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (wantedPaint.has(path))
      pendingPaint.push(
        response.body().then((bytes) => {
          const hash = createHash("sha256").update(bytes).digest("hex");
          assert.equal(
            hash,
            wantedPaint.get(path),
            "Served painting differs from its pinned master export",
          );
          servedPaint.push({ path, sha256: hash });
        }),
      );
  });
  await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=205`);
  await p.waitForFunction(() => window.__idlever?.booted);
  const before = await p.evaluate(() => window.__idlever.engine.save());
  const checks = await p.evaluate(async (nodes) => {
    const { classSkillIcon, SKILL_ICON_IDS } = await import("/src/ui/skill-icons.ts");
    const inventories = [...SKILL_ICON_IDS].sort(),
      wanted = nodes.map((x) => x.id).sort();
    if (JSON.stringify(inventories) !== JSON.stringify(wanted))
      throw Error("Core icon inventory mismatch");
    window.__idlever.runnerOn = false;
    const root = document.createElement("main");
    root.className = "skill-board";
    root.innerHTML =
      "<h1>Class skill insignias</h1><p>24 · 32 · 48px / Locked · Available · Learned</p>";
    const style = document.createElement("style");
    style.textContent =
      ".skill-board{position:absolute;inset:0;min-height:100vh;padding:24px;background:#0d0c14;color:#eadfc5;box-sizing:border-box;overflow:visible;font-family:var(--sans)}.skill-board h1{font-family:var(--display);font-size:28px;margin:0 0 8px}.skill-board p{margin:0 0 18px}.skill-board h2{font-family:var(--display);font-size:24px;margin:18px 0 8px}.skill-board-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.skill-board-card{padding:10px;background:#1c1b2b;border:1px solid #55647f}.skill-board-card b{display:block;margin-bottom:10px;font-size:16px}.skill-board-row{display:flex;justify-content:space-between;align-items:center;margin:8px 0;gap:8px}.skill-board-row>small{width:20px;flex-shrink:0}.skill-board-row .skill-icon{margin-right:4px}@media(max-width:700px){.skill-board{padding:16px}.skill-board-grid{grid-template-columns:minmax(0,1fr)}}";
    document.head.append(style);
    let cells = 0;
    const unique = new Set();
    for (const cls of new Set(nodes.map((x) => x.cls))) {
      const title = document.createElement("h2");
      title.textContent = cls;
      root.append(title);
      const grid = document.createElement("div");
      grid.className = "skill-board-grid";
      root.append(grid);
      for (const node of nodes.filter((x) => x.cls === cls)) {
        const card = document.createElement("section");
        card.className = "skill-board-card";
        const label = document.createElement("b");
        label.textContent = node.name;
        card.append(label);
        for (const size of [24, 32, 48]) {
          const row = document.createElement("div");
          row.className = "skill-board-row";
          const at = document.createElement("small");
          at.textContent = size;
          row.append(at);
          for (const state of ["locked", "available", "learned"]) {
            const icon = classSkillIcon(
              { ...node, owned: state === "learned", available: state === "available" },
              { size },
            );
            if (
              icon.getAttribute("aria-label") !== node.name ||
              icon.getAttribute("role") !== "img"
            )
              throw Error("Wrong accessible name");
            if (icon.dataset.state !== state) throw Error("Wrong state");
            if (icon.dataset.fallback) throw Error("Mapped icon fell back");
            row.append(icon);
            cells++;
            if (size === 32 && state === "available")
              unique.add(icon.querySelector("svg").innerHTML);
          }
          card.append(row);
        }
        grid.append(card);
      }
    }
    const fallback = classSkillIcon({ id: "future_unknown", name: "Actual future name" }),
      again = classSkillIcon({ id: "future_unknown", name: "Actual future name" });
    if (fallback.outerHTML !== again.outerHTML || fallback.dataset.fallback !== "true")
      throw Error("Nondeterministic fallback");
    const decorated = classSkillIcon(nodes[0], { decorative: true });
    if (
      decorated.getAttribute("aria-hidden") !== "true" ||
      decorated.hasAttribute("role") ||
      decorated.hasAttribute("aria-label")
    )
      throw Error("Decorative semantics");
    document.body.replaceChildren(root);
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    document.body.style.height = "auto";
    document.documentElement.style.height = "auto";
    for (const el of root.querySelectorAll(".skill-icon")) {
      const r = el.getBoundingClientRect(),
        size = Number(el.dataset.size);
      if (Math.abs(r.width - size) > 0.1 || Math.abs(r.height - size) > 0.1)
        throw Error("Incorrect size");
      const svg = el.querySelector("svg");
      if (!svg || !svg.querySelector("path") || svg.getBoundingClientRect().width <= 0)
        throw Error("Missing silhouette");
      for (const path of svg.querySelectorAll("path")) {
        const box = path.getBBox();
        if (!(box.width > 0 || box.height > 0)) throw Error("Empty SVG geometry");
        if (box.x < -1 || box.y < -1 || box.x + box.width > 33 || box.y + box.height > 33)
          throw Error("SVG geometry exceeds its viewBox");
      }
    }
    return { cells, unique: unique.size, ids: inventories, fallback: fallback.outerHTML };
  }, nodes);
  assert.equal(checks.cells, 648);
  assert.equal(checks.unique, 72);
  await p.waitForFunction(() =>
    [...document.querySelectorAll(".skill-paint")].every(
      (i) => i.complete && i.naturalWidth === 192,
    ),
  );
  const paintings = await p.locator('.skill-icon[data-art="painted"]').count();
  assert.equal(paintings, 648);
  const mappedPaints = await p
    .locator('.skill-icon[data-size="32"][data-state="available"] .skill-paint')
    .evaluateAll((images) => images.map((i) => i.src));
  assert.equal(new Set(mappedPaints).size, 72);
  await Promise.all(pendingPaint);
  assert.equal(new Set(servedPaint.map((p) => p.path)).size, 72);
  assert.equal(errors.length, 0);
  if (shots) {
    await p.screenshot({ path: `${shots}/1440-skill-board.png`, fullPage: true });
    const classes = catalogue.classes.map((group) => group.class);
    for (const [index, cls] of classes.entries())
      await p
        .locator(".skill-board-grid")
        .nth(index)
        .screenshot({ path: `${shots}/${cls}-states.png` });
    await p.setViewportSize(phoneReviewViewport());
    await p.screenshot({ path: `${shots}/402-skill-board.png`, fullPage: false });
  }
  // A real image failure leaves every mapped primitive and accessible name intact.
  const failedPage = await b.newPage({
    viewport: phoneReviewViewport(),
    reducedMotion: "reduce",
  });
  failedPage.on("pageerror", (e) => errors.push(e.message));
  await failedPage.route("**/ui/skills/*", (route) => route.abort());
  await failedPage.goto(`${url}?engine=fake&fresh=1`);
  await failedPage.waitForFunction(() => window.__idlever?.booted);
  const failed = await failedPage.evaluate(async (nodes) => {
    const { classSkillIcon } = await import("/src/ui/skill-icons.ts");
    const { PAINTED_CLASS_SKILLS } = await import("/src/ui/painted-skill-assets.ts");
    const root = document.createElement("div");
    root.id = "failed-icons";
    for (const n of nodes.filter((n) => n.id in PAINTED_CLASS_SKILLS))
      root.append(classSkillIcon(n));
    document.body.append(root);
    return root.childElementCount;
  }, nodes);
  assert.equal(failed, 72);
  await failedPage.waitForFunction(() =>
    [...document.querySelectorAll("#failed-icons .skill-icon")].every(
      (i) =>
        i.dataset.art === "primitive" &&
        !i.querySelector("img") &&
        !!i.querySelector("svg path") &&
        i.getAttribute("role") === "img" &&
        !!i.getAttribute("aria-label"),
    ),
  );
  await failedPage.close();
  assert.equal(errors.length, 0);
  assert.equal(await p.evaluate(() => window.__idlever.engine.save()), before);
  if (shots)
    writeFileSync(
      `${shots}/checks.json`,
      JSON.stringify(
        {
          checks,
          nodes,
          paintings,
          distinctPaints: 72,
          servedPaint,
          failedImages: failed,
          errors,
          phoneViewport: phoneReviewViewport(),
          captureKinds: {
            desktop: "scroll inventory",
            phone: "viewport",
            classes: "component captures",
          },
          protocolSha256: createHash("sha256")
            .update(readFileSync(new URL(import.meta.url)))
            .digest("hex"),
        },
        null,
        2,
      ),
    );
  console.log(
    JSON.stringify({
      cells: checks.cells,
      unique: checks.unique,
      paintings,
      failedImages: failed,
      errors,
    }),
  );
} finally {
  await b.close();
}
