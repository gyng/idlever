// Cut225 client: the decoy / sentry replay cues (render/state.ts + render/tool-cues.ts, primitive sprites), the Hero Hub's class
// abilities and the one-time earned-class announcement. Controlled replay events and lineage fields; no earned-play claim (the real
// WASM watch is shown by docs/evidence/cut225/client screenshots).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const browser = await launchBrowser();
let checks = 0;
const eq = (a, b, m) => {
    assert.deepEqual(a, b, m);
    checks++;
  },
  ok = (v, m) => {
    assert.ok(v, m);
    checks++;
  };
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?dev=1&engine=fake&seed=225&fresh=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  // 1. replay state and cues
  const r = await page.evaluate(async () => {
    const { ReplayState, TOOL_END_T } = await import("/src/render/state.ts");
    const { toolCuePixels } = await import("/src/render/tool-cues.ts");
    const { TOOL_SPRITE } = await import("/src/render/tool-sprites.ts");
    const w = 12,
      h = 12;
    const hero = { id: 0, kind: "hero", x: 2, y: 2, hp: 20, max_hp: 20 };
    const foe = { id: 5, kind: "goblin", x: 8, y: 2, hp: 6, max_hp: 6 };
    const snap = (tools) => ({
      w,
      h,
      depth: 3,
      biome: "warrens",
      turn: 100,
      tiles: Array(w * h).fill("floor"),
      seen: Array(w * h).fill(true),
      visible: Array(w * h).fill(true),
      overlays: [],
      items: [],
      hero,
      entities: [foe],
      tools,
    });
    const body = (id) => (id === 5 ? { x: 68, y: -24, w: 8, h: 8 } : null);
    const out = {};
    // a standing sentry from the snapshot: drawn, no setup cue, a life bar
    const st = new ReplayState();
    st.load(
      snap({
        abilities: [],
        counter: 0,
        stats: {},
        sentry: {
          id: 40,
          x: 4,
          y: 2,
          hp: 12,
          max_hp: 12,
          ttl: 30,
          range: 4,
          next_shot: 5,
          braced: false,
          overdrive: false,
        },
      }),
    );
    out.loaded = [...st.tools.values()].map((t) => [t.kind, t.x, t.y, t.placed, t.until]);
    out.loadedCues = toolCuePixels(st, body, "full", true).length;
    // events: a decoy placed, the sentry shoots and is struck, braced, relocated; then the decoy expires, the sentry is destroyed
    st.apply([
      { t: 102, k: "tool", id: 41, kind: "decoy", state: "placed", x: 6, y: 4, until: 122 },
      { t: 104, k: "attack", src: 40, dst: 5, dmg: 3, hit: true, verb: "sentry" },
      { t: 105, k: "attack", src: 5, dst: 40, dmg: 2, hit: true, verb: "attack" },
      {
        t: 106,
        k: "tool",
        id: 40,
        kind: "sentry",
        state: "braced",
        x: 4,
        y: 2,
        until: 130,
        hp: 10,
      },
      { t: 112, k: "tool", id: 40, kind: "sentry", state: "moved", x: 5, y: 3, until: 130, hp: 10 },
      { t: 122, k: "tool", id: 41, kind: "decoy", state: "expired", x: 6, y: 4, until: 122 },
      { t: 124, k: "tool", id: 40, kind: "sentry", state: "destroyed", x: 5, y: 3, until: 124 },
    ]);
    const at = (t) => {
      st.seek(t);
      return {
        tools: [...st.tools.values()].map((x) => ({
          kind: x.kind,
          x: x.x,
          y: x.y,
          px: x.px,
          ended: x.ended?.how ?? null,
          flash: x.flashUntil > st.clock,
          mode: x.mode?.state ?? null,
        })),
        cues: toolCuePixels(st, body, "full", true).length,
        still: toolCuePixels(st, body, "full", false).length,
        off: toolCuePixels(st, body, "off", true).length,
      };
    };
    out.setup = at(102);
    out.shot = at(104);
    out.struck = at(105);
    out.braced = at(107);
    out.moving = at(113);
    out.moved = at(117);
    out.expiring = at(122);
    out.gone = at(124 + TOOL_END_T + 1);
    out.sprites = Object.fromEntries(
      Object.entries(TOOL_SPRITE).map(([k, rows]) => [
        k,
        rows.length === 8 && rows.every((r) => r.length === 8),
      ]),
    );
    // a seek back before the placement drops the decoy again (state is rebuilt from the snapshot + events)
    out.back = at(101).tools.map((x) => x.kind);
    // the atlas draws the primitive (no art loaded): a slot of 8×8 env texels
    const { Atlas } = await import("/src/render/atlas.ts");
    const a = new Atlas();
    out.atlas = ["decoy", "sentry"].map((k) => {
      const s = a.tool(k);
      return [s.w, s.h];
    });
    return out;
  });
  eq(r.loaded, [["sentry", 4, 2, -Infinity, 130]], "the snapshot standing sentry");
  eq(r.loadedCues, 2, "a standing construct carries only its life bar");
  eq(
    r.setup.tools.map((t) => t.kind),
    ["sentry", "decoy"],
  );
  ok(r.setup.cues > 2 + 10, "the bell's placement rings out");
  ok(r.setup.still > 2 + 10, "reduced motion keeps the placement cue");
  ok(r.setup.off > 2 + 10, "effects off keeps what the tool is doing");
  ok(r.shot.cues > r.loadedCues + 4, "a sentry shot draws its target line");
  ok(r.struck.tools.find((t) => t.kind === "sentry").flash, "a blow on the sentry flashes it");
  eq(r.braced.tools.find((t) => t.kind === "sentry").mode, "braced");
  ok(r.braced.cues >= 2 * 2 + 7 * 1, "the brace mark shows");
  const mv = r.moving.tools.find((t) => t.kind === "sentry");
  ok(mv.x === 5 && mv.px > 4 && mv.px < 5, "a relocation tweens");
  eq(r.moved.tools.find((t) => t.kind === "sentry").px, 5);
  eq(r.expiring.tools.find((t) => t.kind === "decoy").ended, "expired");
  eq(r.gone.tools, [], "ended tools leave");
  eq(r.sprites, { decoy: true, sentry: true });
  eq(r.back, ["sentry"]);
  eq(r.atlas, [
    [8, 8],
    [8, 8],
  ]);
  // 2. the Hub's abilities: every class with a ladder, reached rungs lit
  const hub = await page.evaluate(async () => {
    const { classAbilities } = await import("/src/ui/hero-hub.ts");
    const { CLASS_VERBS } = await import("/src/engine/classes.ts");
    const all = Object.keys(CLASS_VERBS).map((c) => {
      const el = classAbilities(c, 3);
      return [c, el?.dataset.hubAbilities, el?.querySelectorAll(".rung.on").length ?? -1];
    });
    const clown = classAbilities("Clown", 5);
    return {
      all,
      clown: [...clown.querySelectorAll(".rung")].map((x) => [
        x.textContent,
        x.classList.contains("on"),
      ]),
      none: classAbilities("nobody", 3),
    };
  });
  for (const [c, key, lit] of hub.all) {
    eq(key, c);
    ok(lit >= 1, `${c}: rungs up to L3 lit`);
  }
  eq(hub.clown, [
    ["L1 bell lure", true],
    ["L3 turnabout", true],
    ["L5 false bow", true],
    ["L7 curtain", false],
    ["L9 grand jape", false],
  ]);
  eq(hub.none, null);
  // the Skills tab shows them for the hero's class
  await page.evaluate(async () => {
    const a = window.__idlever;
    const { openHeroHub } = await import("/src/ui/hero-hub.ts");
    openHeroHub(a, null, "skills");
  });
  await page.locator("[data-hub-panel=skills] [data-hub-abilities]").waitFor();
  eq(
    await page
      .locator("[data-hub-panel=skills] [data-hub-abilities]")
      .getAttribute("data-hub-abilities"),
    await page.evaluate(() => window.__idlever.lineage.class.toLowerCase()),
  );
  await page.keyboard.press("Escape");
  // 3. the earned-class announcement: once per class per lineage, ≤ 3 words, Rust's availability only
  const said = await page.evaluate(async () => {
    const a = window.__idlever;
    const m = await import("/src/ui/class-unlock.ts");
    localStorage.removeItem("idlever.class-unlocks");
    for (const p of document.querySelectorAll(".class-unlock")) p.remove();
    const earned = (avail) =>
      ["clown", "engineer"].map((c, i) => ({
        class: c,
        available: avail[i],
        scout: true,
        completed: 0,
        required_completed: 0,
        depth: 0,
        required_depth: 0,
        level: 1,
        signature: "",
      }));
    const keep = a.lineage.earned_classes;
    a.lineage.earned_classes = earned([false, false]);
    const none = m.announceClassUnlock(a);
    a.lineage.earned_classes = earned([true, true]);
    const first = m.announceClassUnlock(a)?.textContent;
    const waits = m.announceClassUnlock(a); // the next class never replaces a plate still shown
    const plates = document.querySelectorAll(".class-unlock").length;
    for (const p of document.querySelectorAll(".class-unlock")) p.remove();
    const second = m.announceClassUnlock(a)?.textContent;
    const third = m.announceClassUnlock(a);
    const stored = localStorage.getItem("idlever.class-unlocks");
    a.lineage.earned_classes = keep;
    return { none, first, waits, plates, second, third, stored };
  });
  eq(said.none, null);
  eq(said.first, "Clown unlocked");
  eq(said.second, "Engineer unlocked");
  eq(said.third, null);
  ok(said.first.split(/\s+/).length <= 3);
  eq(JSON.parse(said.stored).classes, ["clown", "engineer"]);
  eq(said.plates, 1, "one plate at a time");
  eq(said.waits, null, "a second class waits for the first plate to go");
  eq(errors, []);
  console.log(`class-tools: ${checks} checks`);
} finally {
  await browser.close();
}
