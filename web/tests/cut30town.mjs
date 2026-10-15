#!/usr/bin/env node
// Cut 30 §3 client gates — the town hub (docs/CUT30.md Gates; docs/TOWN.md), on the fake engine (its Cut 30 stand-ins: blacksmith at the
// first gold home, storehouse at the first find kept, kennel at the first tame, bank at a night's purse), headless at 400 × 800:
//   day0     sparse Home retains mouth, tent, roster and send; no unready future plot surfaces;
//            every actual target ≥44px with a hidden label
//   build    fake legacy milestone fixtures retain built-building targets/bar order; unready next goals remain on
//            the engine wire without scaffold, tag, hit or help; ≤3 markers and ≤12 above-fold elements
//   mouth    tapping the dungeon's mouth sends (the watch opens)
//   checkin  owner Cut243 explicitly supersedes direct-marker purchase: report, Forge, purchase, Close, send — five actions
//   desk     desktop shows the same scene and targets
// Cut201 retires Storehouse. Cut243 progressive disclosure hides unready plots without changing their wire milestones.
//
//   node web/tests/cut30town.mjs [--shots dir] [--part=a,b]      (part of `pnpm test` in web/)
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", [resolve(ROOT, "tools/dev.sh")], { encoding: "utf8" }).trim();
const shotsArg = process.argv.indexOf("--shots"),
  shots = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const partArg = process.argv.find((a) => a.startsWith("--part="));
const parts = partArg ? partArg.slice(7).split(",") : null;
const part = (p) => !parts || parts.includes(p);
if (shots) mkdirSync(shots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [],
  out = [];
let failed = 0;
const check = (ok, what) => {
  out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};

const browser = await launchBrowser();
let page;
async function open(w = 400, hgt = 800) {
  page = await browser.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1 });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
}
const shot = async (name) => {
  if (shots) await page.screenshot({ path: resolve(shots, `${name}.png`) });
};
async function until(pred, label, timeout = 20_000, arg) {
  const t = Date.now();
  let v;
  while (Date.now() - t < timeout) {
    v = await page.evaluate(pred, arg).catch(() => null);
    if (v) return v;
    await sleep(80);
  }
  throw new Error(`timeout waiting for ${label}`);
}
const camp = async () => {
  await until(
    () => window.__idlever?.booted && window.__idlever.screen === "camp" && window.__town,
    "camp",
  );
  await sleep(400);
};
const boot = async (seed, q = "") => {
  await page.goto(`${url}?dev=1&engine=fake&fresh=1&seed=${seed}${q}`, {
    waitUntil: "domcontentloaded",
  });
  await until(
    () => window.__idlever?.booted && ["camp", "report"].includes(window.__idlever.screen),
    "boot",
    60_000,
  );
  await page.evaluate(() => {
    localStorage.removeItem("idlever.reveal");
    localStorage.removeItem("idlever.unlocks.all");
    for (const k of Object.keys(localStorage))
      if (k.startsWith("idlever.town.")) localStorage.removeItem(k);
  });
};
/** a heir-1 lineage with nothing earned (the fake seeds a chronicle and a free unlock; strip them), then `fn` on it, then the camp */
const STAGES = {
  0: (L) =>
    Object.assign(L, {
      heir: 1,
      chronicle: [],
      unlocks: ["tame"],
      marks: 0,
      gold: 0,
      gold_ledger: [],
      graveyard: [],
      vault: [],
      forge: {},
      party: [],
      kennel: [],
      eggs: [],
      rank: 0,
      renown: 0,
      best_depth: 0,
      trophies: [],
      trait_offer: [],
      class_offer: [],
      supplies: [{ id: 100000, kind: "leash", known: true, label: "leash", free: true }],
    }),
  1: (L) => Object.assign(L, { gold: 60, best_depth: 3 }), // first gold home → blacksmith
  2: (L) => {
    L.vault = [{ id: 9001, kind: "sword", known: true, label: "sword" }];
  }, // first find kept → storehouse
  3: (L) => {
    L.kennel = [
      {
        id: 77,
        kind: "jackal",
        name: "Ash",
        level: 1,
        tags: [],
        gen: 0,
        rules: { rows: [] },
        max_rows: 2,
        hp: 5,
        max_hp: 5,
      },
    ];
  }, // first tame → kennel
  4: (L) => {
    L.gold = 900;
  }, // a night's purse → bank
};
const toStage = (n) =>
  page.evaluate(
    async ([n, src]) => {
      const r = window.__idlever;
      const save = JSON.parse(await r.engine.save());
      const fns = src.map((s) => new Function("L", `return (${s})(L)`));
      for (let i = 0; i <= n; i++) fns[i](save.lineage);
      r.lineage = await r.engine.load(JSON.stringify(save));
      r.go({ kind: "camp" });
    },
    [n, Object.values(STAGES).map(String)],
  );
/** the interactive elements a player sees above the fold (ui.mjs's reading), one per function: a building's target and its bar tile
 *  (and the crate and the pack's tile) open the same panel — one element */
const SAME = {
  forge: "blacksmith",
  vault: "storehouse",
  party: "kennel",
  bank: "bank",
  loadout: "crate",
};
const fold = (scope = "") =>
  page.evaluate(
    ([SAME, scope]) => {
      // (on screen: inside the viewport and inside every scrolling box around it — a row under the well's fold is not above the fold)
      const shown = (b) => {
        let r = b.getBoundingClientRect();
        let top = Math.max(0, r.top),
          bottom = Math.min(innerHeight, r.bottom);
        for (let p = b.parentElement; p && bottom > top; p = p.parentElement) {
          const o = getComputedStyle(p).overflowY;
          if (o === "visible") continue;
          const q = p.getBoundingClientRect();
          top = Math.max(top, q.top);
          bottom = Math.min(bottom, q.bottom);
        }
        return bottom - top > 1 && r.width > 0;
      };
      const els = [
        ...document.querySelectorAll(
          `${scope} :is(button, input, select, textarea, a[href], [role=button])`,
        ),
      ].filter((b) => {
        if (
          b.closest("[inert]") ||
          !b.getClientRects().length ||
          getComputedStyle(b).visibility === "hidden" ||
          b.hidden
        )
          return false;
        return shown(b);
      });
      // (Cut 229: a building's name label (`House ⓘ`, data-building-info) and the staked plot's tag (data-next) explain the
      // same building or plot; they count with it, one function, like a building and its bar tile)
      const keys = new Set(
        els.map(
          (b) =>
            b.dataset.building ??
            b.dataset.buildingInfo ??
            (b.dataset.next ? "staked" : undefined) ??
            (b.dataset.tile
              ? (SAME[b.dataset.tile] ?? `tile:${b.dataset.tile}`)
              : (b.getAttribute("aria-label") || b.textContent || b.className)
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 24)),
        ),
      );
      return [...keys];
    },
    [SAME, scope],
  );
const town = () =>
  page.evaluate(() => ({
    ...window.__town.stats(),
    targets: window.__town.targets(),
    tiles: [...document.querySelectorAll(".console .cmd .tile:not(.empty)")].map(
      (t) => t.dataset.tile,
    ),
    next: window.__idlever.lineage.town?.next,
    nextReady: window.__idlever.lineage.town?.next_ready,
    nextTrigger: window.__idlever.lineage.town?.next_trigger,
    lockedSurfaces: document.querySelectorAll(
      '.town-hit[data-building="staked"], [data-building-info="staked"], .town-tag:not([hidden])',
    ).length,
  }));

try {
  await open();
  // ---- day 0: the camp
  if (part("day0") || part("build")) {
    await boot(3011); // (`systems=none` is an older core: no town on the wire)
    await toStage(0);
    await camp();
    await shot("town-day0");
    const t = await town();
    const surf = await fold(":is(.well-wrap, .console)");
    // Cut243: the fake-engine future milestone remains, but its unready plot has no Home surface.
    const pill = await page.evaluate(() => !!document.querySelector(".next-pill:not([hidden])"));
    check(
      surf.length <= (pill ? 5 : 4) &&
        ["mouth", "tent", "Heroes"].every((x) => surf.includes(x)) &&
        surf.some((x) => /send|delve/i.test(x)) &&
        !surf.includes("crate") &&
        !surf.includes("staked"),
      `day 0: sparse Home retains mouth, tent, roster and send (${surf.join(" | ")})`,
    );
    check(
      t.next === "blacksmith" &&
        !t.nextReady &&
        t.nextTrigger === "first gold home" &&
        !t.staked &&
        !t.targets.some((x) => x.id === "staked") &&
        t.lockedSurfaces === 0 &&
        t.buildings.length === 0,
      "day 0: future Forge remains on engine wire without scaffold, tag, help or hit target",
    );
    check(
      t.targets.every((x) => x.w >= 44 && x.h >= 44),
      `day 0: every target ≥ 44 px (${t.targets.map((x) => `${x.id} ${Math.round(x.w)}×${Math.round(x.h)}`).join(", ")})`,
    );
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll(".town-hit")].map((b) => ({
        id: b.dataset.building,
        label: b.getAttribute("aria-label"),
        hidden:
          getComputedStyle(b.querySelector(".vh")).clip !== "auto" ||
          b.querySelector(".vh").getBoundingClientRect().width <= 1,
      })),
    );
    check(
      labels.every((l) => l.label && l.hidden),
      `day 0: each target has a hidden label (${labels.map((l) => `${l.id}=${l.label}`).join(", ")})`,
    );
    check(
      t.tiles.length === 0 || !t.tiles.some((x) => ["forge", "vault", "party", "bank"].includes(x)),
      `day 0: no building tile on the bar (${t.tiles.join(",") || "–"})`,
    );
    const all = await fold();
    check(
      all.length <= 12,
      `day 0: ≤ 12 elements above the fold (${all.length}: ${all.join(" | ")})`,
    );
  }

  // ---- fake legacy build fixtures; unready next goals have no Home plot
  if (part("build")) {
    // Cut 229: Cut 201 retired the storehouse (core town.rs: no plot, no build, no system; the fake now agrees). Stage 2's
    // trigger (first find kept) still runs and must build nothing; the v1 set is the forge, the kennel and the bank.
    const order = ["blacksmith", null, "kennel", "bank"],
      tileOf = { blacksmith: "forge", kennel: "party", bank: "bank" };
    for (let n = 1; n <= 4; n++) {
      await toStage(n);
      await camp();
      const t = await town();
      const want = order.slice(0, n).filter(Boolean),
        next = order.slice(n).find(Boolean);
      check(
        JSON.stringify(t.buildings) === JSON.stringify(want) &&
          want.every((b) => t.targets.some((x) => x.id === b)) &&
          !t.targets.some((x) => x.id === "storehouse"),
        `stage ${n}: ${order[n - 1] ? `the trigger built ${order[n - 1]}` : "the retired storehouse's trigger built nothing"} — standing ${t.buildings.join(" · ")}, targets ${t.targets.map((x) => x.id).join(",")}`,
      );
      const bar = t.tiles.filter((x) => [...Object.values(tileOf), "vault"].includes(x));
      check(
        bar.length === 0 && want.every((b) => t.targets.some((x) => x.id === b)),
        `stage ${n}: built sprites retain actions without duplicate Forge/Pets/Savings console tiles (${t.tiles.join(" · ")})`,
      );
      check(
        next ? t.next === next && !t.nextReady && !t.staked && t.lockedSurfaces === 0 : !t.staked,
        `stage ${n}: fake-engine next ${next ?? "none"} has no unready Home plot`,
      );
      check(t.markers.length <= 3, `stage ${n}: ≤ 3 markers (${t.markers.join(", ") || "–"})`);
      check(
        t.targets.every((x) => x.w >= 44 && x.h >= 44),
        `stage ${n}: every target ≥ 44 px`,
      );
      const all = await fold();
      check(
        all.length <= 12,
        `stage ${n}: ≤ 12 elements above the fold (${all.length}: ${all.join(" | ")})`,
      );
      if (n === 1) await shot("town-blacksmith");
      if (n === 2) {
        const lockedBefore = await page.evaluate(() => window.__idlever.engine.save());
        check(
          t.next === "kennel" &&
            t.nextTrigger === "first tame" &&
            !t.nextReady &&
            !t.staked &&
            t.lockedSurfaces === 0,
          "stage 2: fake-engine first-tame goal retained without future plot surfaces",
        );
        await shot("town-hidden-future-mobile");
        if (shots) {
          await page.setViewportSize({ width: 1280, height: 800 });
          await sleep(400);
          await shot("town-hidden-future-desktop");
          await page.setViewportSize({ width: 400, height: 800 });
          await sleep(400);
        }
        check(
          lockedBefore === (await page.evaluate(() => window.__idlever.engine.save())),
          "stage 2: inspecting sparse Home preserves exact save",
        );
      }
      if (n === 3) {
        // a building's panel stands over it (or under it when the room above is short). Cut 229: the storehouse and its
        // vault panel are retired, so the kennel (the next panel building, built here) carries the check: its party panel.
        await page.locator('.town-hit[data-building="kennel"]').click();
        await sleep(250);
        const pa = await page.evaluate(() => {
          const p = document.querySelector('.panel[data-panel="party"]'),
            b = document.querySelector('.town-hit[data-building="kennel"]');
          if (!p || !b) return null;
          const r = p.getBoundingClientRect(),
            a = b.getBoundingClientRect();
          return { pb: r.bottom, pt: r.top, at: a.top, ab: a.bottom };
        });
        check(
          !!pa && (pa.pb <= pa.at + 2 || pa.pt >= pa.ab - 2),
          `stage 3: the kennel opens the party panel over itself (${pa ? `panel ${Math.round(pa.pt)}–${Math.round(pa.pb)}, building ${Math.round(pa.at)}–${Math.round(pa.ab)}` : "no panel"})`,
        );
        await page.keyboard.press("Escape");
      }
      if (n === 4) await shot("town-full");
    }
  }

  // ---- the mouth sends
  if (part("mouth")) {
    await boot(3013);
    await toStage(0);
    await camp();
    const t0 = Date.now();
    await page.locator('.town-hit[data-building="mouth"]').click();
    const ok = await until(() => window.__idlever.screen === "watch", "the watch", 8000).then(
      () => true,
      () => false,
    );
    check(ok, `a tap on the dungeon's mouth sends (the watch in ${Date.now() - t0} ms)`);
  }

  // ---- owner Cut243: explicit Forge review/purchase replaces the old direct-marker three-tap route
  if (part("checkin")) {
    await boot(3014);
    await toStage(1);
    await camp();
    const before = await page.evaluate(async () => {
      const r = window.__idlever;
      const save = JSON.parse(await r.engine.save());
      save.lineage.gold = 2000;
      r.lineage = await r.engine.load(JSON.stringify(save));
      const report = await r.runOfflineChunked(8 * 3600);
      await r.refresh();
      r.go({ kind: "report", report, absence: true });
      return { kit: (r.lineage.kit ?? []).reduce((a, k) => a + k.owned, 0) };
    });
    await until(() => window.__idlever.screen === "report", "the report");
    let taps = 0;
    await page.locator(".console .gem").click();
    taps++; // 1. harvest: the report read, home
    await camp();
    const mk = await town();
    await page.evaluate((owned) => {
      window.__checkinKitBefore = owned;
    }, before.kit);
    const forge = page.locator('.town-hit[data-building="blacksmith"]');
    const beforeOpen = await page.evaluate(() => window.__idlever.engine.save());
    await forge.click();
    taps++; // Owner Cut243: availability marker opens Forge; it never purchases directly.
    await page.locator(".simple-kit").waitFor({ state: "visible" });
    check(
      beforeOpen === (await page.evaluate(() => window.__idlever.engine.save())),
      "opening actual Forge sprite is read-only",
    );
    const purchase = page.locator(".simple-kit .forge-buy[data-slot]:not(:disabled)").first();
    check((await purchase.count()) > 0, "actual Forge offers an affordable kit purchase");
    await purchase.click();
    taps++;
    const bought = await until(
      () => {
        const L = window.__idlever.lineage;
        const owned = (L.kit ?? []).reduce((a, k) => a + k.owned, 0);
        return owned > window.__checkinKitBefore ? owned : null;
      },
      "the explicit kit purchase",
      5000,
    ).catch(() => 0);
    await page.keyboard.press("Escape");
    taps++; // Close Forge before sending from the scene.
    await page.locator('.town-hit[data-building="mouth"]').click();
    taps++; // Send after deliberately purchasing and closing Forge.
    const sent = await until(() => window.__idlever.screen === "watch", "the watch", 8000).then(
      () => true,
      () => false,
    );
    check(
      bought > before.kit && sent && taps === 5,
      `owner Cut243 supersedes direct-marker 3-tap route: ${taps} actions — report → Forge → purchase → Close → mouth (kit ${before.kit} → ${bought}; markers ${mk.markers.join(",")}; sent: ${sent})`,
    );
  }

  // ---- the desktop: the same scene in the frame's centre
  if (part("desk")) {
    await page.close();
    await open(1440, 900);
    await boot(3015);
    await toStage(4);
    await camp();
    await shot("town-desktop");
    const d = await page.evaluate(() => {
      const t = document.querySelector(".town").getBoundingClientRect();
      return {
        w: t.width,
        h: t.height,
        x: t.x,
        mode: window.__town.stats().mode,
        targets: window.__town.targets().map((x) => x.id),
      };
    });
    check(
      // Cut 229: seven targets counted the retired storehouse; the six of the v1 set, by name, replace the count
      d.w >= 600 &&
        d.h >= 400 &&
        ["mouth", "tent", "crate", "blacksmith", "kennel", "bank"].every((id) =>
          d.targets.includes(id),
        ),
      `desktop: the town fills the frame's centre (${Math.round(d.w)}×${Math.round(d.h)} at x ${Math.round(d.x)}, targets ${d.targets.join(",")}, ${d.mode})`,
    );
  }
} catch (e) {
  check(false, `threw: ${e.message}`);
}
const errs = errors.filter((e) => !/favicon|404|net::ERR/.test(e));
check(errs.length === 0, `no page errors (${errs.slice(0, 3).join(" | ")})`);
await browser.close();
console.log(out.join("\n"));
console.log(failed ? `cut30town: ${failed} failed` : "cut30town: all passed");
process.exit(failed ? 1 : 0);
