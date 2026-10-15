// Actual built-client Home review. Every interaction uses current DOM/public engine methods.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i < 0 ? d : process.argv[i + 1];
};
const phase = arg("--phase", "home-built");
const out = resolve(`docs/evidence/cut243/${phase}`);
mkdirSync(out, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const raw = gunzipSync(readFileSync("docs/evidence/handoff-menus/input.game.json.gz")).toString();
const sourcePaths = [
  "web/src/ui/camp.ts",
  "web/src/ui/town.ts",
  "web/src/ui/works.ts",
  "web/src/ui/hero-hub.ts",
  "web/src/ui/menu-material.ts",
  "web/src/ui/return-pick.ts",
  "web/src/ui/party.ts",
  "web/src/ui/concepts.ts",
  "web/src/ui/skin.ts",
  "web/src/render/town.ts",
  "web/src/styles.css",
  "web/src/town.css",
  "web/src/works.css",
  "web/src/tasks.css",
  "web/src/heroes-compact.css",
  "web/src/runs.css",
  "web/src/feats.css",
  "web/src/return-pick.css",
];
const result = {
  scope:
    "Current actual built-client earned Home, actual DOM actions, private GPU; no timing/performance claim",
  inputSha256: sha(raw),
  node: process.version,
  source: sourcePaths.map((path) => ({ path, sha256: sha(readFileSync(path)) })),
  served: [],
  errors: [],
  requestFailures: [],
  consoleErrors: [],
  rows: [],
  interactions: [],
  choices: [],
};
const save = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + "\n");
const check = (ok, message, extra = {}) => {
  result.interactions.push({ ok, message, ...extra });
  save();
  if (!ok) throw new Error(message);
};
const port = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const log = createWriteStream(`${out}/server.log`);
await new Promise((r) => log.once("open", r));
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: resolve("web"), stdio: ["ignore", log, log] },
);
const url = `http://127.0.0.1:${port}/`;
result.url = url;
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const width of arg("--widths", "320,400,1440").split(",").map(Number)) {
    browser = await launchBrowser({ gpu: true });
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1.5,
      hasTouch: true,
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    if (process.argv.includes("--failed-icons"))
      await context.route("**/ui/icons/*.png", (r) => r.abort());
    const page = await context.newPage();
    const pending = [];
    page.on("pageerror", (e) => {
      result.errors.push({ width, error: String(e) });
      save();
    });
    page.on("console", (m) => {
      if (m.type() === "error") {
        result.consoleErrors.push({ width, text: m.text() });
        save();
      }
    });
    page.on("requestfailed", (r) => {
      result.requestFailures.push({ width, url: r.url(), failure: r.failure() });
      save();
    });
    page.on("response", (r) => {
      if (/\.(js|css|wasm)(\?|$)/.test(r.url()))
        pending.push(
          r
            .body()
            .then((body) =>
              result.served.push({
                width,
                url: new URL(r.url()).pathname,
                sha256: sha(body),
                bytes: body.length,
              }),
            )
            .catch(() => {}),
        );
    });
    await page.goto(`${url}?dev=1&fresh=1&seed=1&runs=0&effects=off`);
    await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
    check(
      await page.evaluate(() => window.__idlever.kind === "wasm"),
      `${width}: actual WASM engine`,
    );
    await page.evaluate(() => {
      window.__idlever.runnerOn = false;
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const fresh = await page.evaluate(async () => ({
      save: await window.__idlever.engine.save(),
      town: window.__idlever.lineage.town,
      gold: window.__idlever.lineage.gold,
      scene: window.__town?.stats(),
      targets: window.__town?.targets(),
      buildText: document.querySelector('.town-tag[data-next="house"]')?.textContent,
    }));
    await page.screenshot({ path: `${out}/fresh-town-${width}.png` });
    check(
      fresh.scene?.staked === "house" && fresh.targets?.some((t) => t.id === "staked"),
      `${width}: actual scene diagnostic confirms readyHouse staked target`,
    );
    check(
      fresh.town?.home === false &&
        fresh.town?.next === "house" &&
        fresh.town?.next_ready === true &&
        /Build.*house.*Free/i.test(fresh.buildText ?? ""),
      `${width}: sparse actual fresh town keeps obvious ready free Build House`,
    );
    check(
      (await page.evaluate(() => window.__idlever.engine.save())) === fresh.save,
      `${width}: fresh inspection exact save`,
    );
    await page.locator('.town-tag[data-next="house"]').click();
    await page.waitForFunction(() => window.__idlever.lineage.town?.home === true);
    await page.waitForTimeout(700);
    const built = await page.evaluate(async () => ({
      save: await window.__idlever.engine.save(),
      town: window.__idlever.lineage.town,
      gold: window.__idlever.lineage.gold,
      scene: window.__town?.stats(),
      targets: window.__town?.targets(),
      futureHelp: document.querySelectorAll("[data-building-info=staked]").length,
    }));
    await page.screenshot({ path: `${out}/first-house-${width}.png` });
    result.choices.push({
      width,
      scope:
        "Isolated fresh initialization and actual explicit free Build House click, before loading earned fixture",
      beforeSha256: sha(fresh.save),
      afterSha256: sha(built.save),
      beforeTown: fresh.town,
      afterTown: built.town,
      beforeScene: fresh.scene,
      afterScene: built.scene,
      beforeTargets: fresh.targets,
      afterTargets: built.targets,
      goldBefore: fresh.gold,
      goldAfter: built.gold,
    });
    check(built.gold === fresh.gold, `${width}: manual free House leaves Gold unchanged`);
    if (built.town?.next && !built.town.next_ready)
      check(
        !built.scene?.staked && !built.targets?.some((t) => t.id === "staked") && !built.futureHelp,
        `${width}: native future next retained but unready scene/hit/help absent`,
      );
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      a.lineage = await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, raw);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.waitForFunction(() => !document.querySelector(".toast"), null, { timeout: 30000 });
    const pinned = await page.evaluate(() => window.__idlever.engine.save());
    const settle = async () => {
      await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
      await page.waitForTimeout(650);
    };
    const escape = async () => {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(60);
      }
      await settle();
    };
    const capture = async (name, scale = 1, baseline = pinned) => {
      if (name === "home") {
        await page.mouse.move(1, 1);
        await page.keyboard.press("Escape");
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        await page.waitForFunction(
          () => !document.querySelector(".toast,.class-unlock,#kw-tip:not([hidden])"),
          null,
          { timeout: 30000 },
        );
      }
      const data = await page.evaluate(() => {
        const rect = (e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const root =
          document.querySelector(".sheet-wrap:not(.under):not([hidden]) > .sheet") ??
          document.querySelector("#app");
        const visible = (e) => {
          if (
            !e.getClientRects().length ||
            e.closest("[hidden],[aria-hidden=true]") ||
            getComputedStyle(e).visibility === "hidden"
          )
            return false;
          const d = e.closest("details:not([open])");
          return !d || d.querySelector(":scope > summary")?.contains(e);
        };
        const controls = [
          ...root.querySelectorAll("button,summary,input,select,textarea,[role=button]"),
        ]
          .filter(visible)
          .map((e) => ({
            name: e.getAttribute("aria-label") ?? e.textContent.trim(),
            class: e.className,
            rect: rect(e),
            disabled: e.matches(":disabled"),
            selected: e.getAttribute("aria-selected"),
            pressed: e.getAttribute("aria-pressed"),
          }));
        const surfaces = [
          ...document.querySelectorAll(".town-building-info,.next-pill,.camp .console .cmd .tile"),
        ].map((e) => {
          const words = [],
            w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          while (w.nextNode()) {
            const n = w.currentNode,
              p = n.parentElement;
            if (!p || !visible(p) || p.closest(".vh,[aria-hidden=true]")) continue;
            const r = p.getBoundingClientRect(),
              s = getComputedStyle(p);
            if (r.width <= 1 || r.height <= 1 || s.clipPath !== "none") continue;
            words.push(n.textContent.trim());
          }
          return {
            id:
              e.getAttribute("data-building-info") ?? e.getAttribute("data-tile") ?? "next-worker",
            name: e.getAttribute("aria-label"),
            rect: rect(e),
            state: e.getAttribute("data-state"),
            kind: e.getAttribute("data-kind"),
            persistentText: words.join(" ").trim(),
            locked: [...e.querySelectorAll(".town-lock")].some(
              (l) => !l.hidden && getComputedStyle(l).display !== "none",
            ),
          };
        });
        const badImages = [...document.images]
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.currentSrc);
        return {
          rootClass: root.className,
          material: root.dataset.material ?? null,
          controls,
          surfaces,
          glyphFallbacks: [...root.querySelectorAll(".ico.glyph")].map((e) => ({
            class: e.className,
            glyph: e.dataset.glyph,
          })),
          badImages,
          pageOverflow: document.documentElement.scrollWidth - innerWidth,
          fonts: document.fonts.status,
          tip: document.querySelector("#kw-tip:not([hidden])")?.textContent ?? null,
          orderRows: [...root.querySelectorAll(".order-row")].map((e) => ({
            text: e.textContent,
            rect: rect(e),
            overflow: e.scrollWidth - e.clientWidth,
          })),
          tabs: [...root.querySelectorAll("[data-hub-tab]")].map((e) => ({
            id: e.dataset.hubTab,
            text: e.textContent,
            label: e.getAttribute("aria-label"),
            rect: rect(e),
            overflow: e.scrollWidth - e.clientWidth,
          })),
        };
      });
      const after = await page.evaluate(() => window.__idlever.engine.save());
      const path = `${name}-${width}-${scale}x.png`;
      await page.screenshot({ path: `${out}/${path}` });
      result.rows.push({
        name,
        width,
        scale,
        path,
        frameSha256: sha(readFileSync(`${out}/${path}`)),
        saveSha256: sha(after),
        exactBaselineSave: after === baseline,
        baselineSha256: sha(baseline),
        ...data,
      });
      save();
    };
    const narrow = process.argv.includes("--owned-only") || process.argv.includes("--pick-only");
    if (process.argv.includes("--owned-only")) await capture("home", 1);
    for (const scale of process.argv.includes("--owned-only")
      ? []
      : process.argv.includes("--single-scale")
        ? [1]
        : [1, 2]) {
      await page.evaluate((s) => (document.documentElement.style.fontSize = `${16 * s}px`), scale);
      await settle();
      await page.evaluate(() => {
        const well = document.querySelector(".camp-well");
        if (well) well.scrollTop = 0;
        window.scrollTo(0, 0);
      });
      await settle();
      if (process.argv.includes("--pick-only")) {
        await page.locator(".pick-one .tile").click();
        await settle();
        await capture("return-pick", scale);
        await escape();
        continue;
      }
      await capture("home", scale);
      if (process.argv.includes("--home-only")) continue;
      await page.locator(".hero-details:visible").first().click();
      await settle();
      await page.locator("[data-hub-tab=companions]").click();
      await settle();
      await page.locator("[data-hub-tab=companions]").scrollIntoViewIfNeeded();
      await capture("pets", scale);
      await escape();
      const orders = page.locator(".orders-tab:visible");
      if (await orders.count()) {
        await orders.click();
        await settle();
        await capture("orders", scale);
        await escape();
      }
      await page.locator(".console .tile[data-tile=bank]").click();
      await settle();
      await capture("savings", scale);
      await escape();
      const pendingPick = page.locator(".pick-one .tile");
      if (await pendingPick.count()) {
        await pendingPick.click();
        await settle();
        await capture("return-pick", scale);
        await escape();
      }
    }
    if (process.argv.includes("--home-only")) {
      await Promise.all(pending);
      await browser.close();
      browser = undefined;
      save();
      continue;
    }
    if (!narrow) {
      await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
      await settle();
      for (const selector of [
        ".town-building-info[data-building-info=bank]",
        ".next-pill",
        ".console .tile[data-tile=forge]",
      ]) {
        const target = page.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        await page.mouse.move(1, 1);
        await page.keyboard.press("Escape");
        await target.hover();
        await page.waitForTimeout(500);
        check(
          (await page.locator("#kw-tip:not([hidden])").count()) === 1,
          `${width}: hover details ${selector}`,
        );
        await capture(
          `hover-${selector.includes("next-pill") ? "worker" : selector.includes("building-info") ? "savings" : "forge"}`,
        );
        await page.keyboard.press("Escape");
        await target.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await page.waitForTimeout(450);
        check(
          (await page.locator("#kw-tip:not([hidden])").count()) === 1,
          `${width}: focus details ${selector}`,
        );
        await page.keyboard.press("Escape");
        const box = await target.boundingBox();
        const cdp = await context.newCDPSession(page);
        const x = box.x + box.width / 2,
          y = box.y + box.height / 2;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await page.waitForTimeout(550);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(100);
        await cdp.detach();
        check(
          (await page.locator("#kw-tip:not([hidden])").count()) === 1,
          `${width}: actual touch long-press details ${selector}`,
        );
        check(
          (await page.locator(".sheet-wrap").count()) === 0,
          `${width}: tooltip touch release does not open action ${selector}`,
        );
        check(
          (await page.evaluate(() => window.__idlever.engine.save())) === pinned,
          `${width}: touch details leave exact save ${selector}`,
        );
        await page.keyboard.press("Escape");
        await page.waitForTimeout(1250);
      }
      await page.locator(".console .tile[data-tile=forge]").click();
      await settle();
      check(
        (await page.locator(".forge:visible").count()) === 1,
        `${width}: normal unlocked Forge action still opens`,
      );
      await escape();
      await page.locator(".next-pill").click();
      await settle();
      check(
        (await page.locator(".works-sheet:visible").count()) === 1,
        `${width}: normal worker shortcut still opens`,
      );
      await escape();
      check(
        (await page.evaluate(() => window.__idlever.engine.save())) === pinned,
        `${width}: all read-only Home routes preserve exact save`,
      );
    }
    if (process.argv.includes("--hire-apprentice")) {
      const before = await page.evaluate(async () => ({
        save: await window.__idlever.engine.save(),
        gold: window.__idlever.lineage.gold,
        chest: window.__idlever.lineage.tree.chest,
        node: window.__idlever.lineage.tree.nodes.find((n) => n.id === "apprentice"),
      }));
      await page.locator(".next-pill").click();
      await settle();
      const hire = page.locator('.hire-btn[data-node="apprentice"]');
      check(
        (await hire.count()) === 1 && (await hire.isEnabled()),
        `${width}: genuine earned Apprentice hire available`,
      );
      await hire.click();
      await page.waitForFunction(
        () =>
          window.__idlever.lineage.tree.nodes.find((n) => n.id === "apprentice")?.state === "done",
      );
      await escape();
      const owned = await page.evaluate(async () => ({
        save: await window.__idlever.engine.save(),
        gold: window.__idlever.lineage.gold,
        chest: window.__idlever.lineage.tree.chest,
        node: window.__idlever.lineage.tree.nodes.find((n) => n.id === "apprentice"),
      }));
      const file = `earned-apprentice-owned-${width}.game.json.gz`;
      writeFileSync(`${out}/${file}`, gzipSync(owned.save, { mtime: 0 }));
      result.choices.push({
        width,
        scope:
          "Isolated actual earned input; explicit actual UI hire click, no grants or automatic spending policy",
        price: before.node.price,
        goldBefore: before.gold,
        goldAfter: owned.gold,
        chestBefore: before.chest,
        chestAfter: owned.chest,
        beforeSha256: sha(before.save),
        afterSha256: sha(owned.save),
        beforeNode: before.node,
        afterNode: owned.node,
        savePath: file,
      });
      check(
        before.gold + before.chest - owned.gold - owned.chest === before.node.price,
        `${width}: actual hire pays exact quoted price once`,
      );
      for (const scale of [1, 2]) {
        await page.evaluate(
          (s) => (document.documentElement.style.fontSize = `${16 * s}px`),
          scale,
        );
        await settle();
        const orders = page.locator(".orders-tab:visible");
        if (await orders.count()) await orders.click();
        else {
          await page.locator(".hero-details:visible").first().click();
          await settle();
          await page.locator("[data-hub-tab=behaviour]").click();
          await settle();
          await page.getByRole("button", { name: "Orders", exact: true }).click();
        }
        await settle();
        await capture("owned-apprentice-orders", scale, owned.save);
        await escape();
      }
    }
    await Promise.all(pending);
    await browser.close();
    browser = undefined;
    save();
  }
  result.status = "review-complete";
  save();
} catch (e) {
  result.status = "failed";
  result.error = String(e.stack ?? e);
  save();
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  log.end();
}
