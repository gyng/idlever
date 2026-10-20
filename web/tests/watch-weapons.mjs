// Actual atlas selection + controlled missing-art/legacy/seek and GL context restoration.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const root = new URL("../../", import.meta.url);
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const original = JSON.parse(readFileSync(new URL("web/public/art/atlas.json", root)));
const moments = JSON.parse(readFileSync(new URL("docs/evidence/cut294/moments.json", root))).cases;
const moment = moments.find((c) => c.id === "gunner-short_gun-baseline");
const combinations = [
  ["fighter", "crownsplitter"],
  ["rogue", "crownsplitter"],
  ["ranger", "sword"],
  ["caster", "dagger"],
  ["caster", "bow"],
  ["gunner", "short_gun"],
];
const b = await launchBrowser();
const results = { checks: 0, phases: [], errors: [] };
try {
  for (const phase of ["full", "missing-variants", "no-art"]) {
    const p = await b.newPage({ viewport: { width: 402, height: 681 }, serviceWorkers: "block" });
    p.on("pageerror", (e) => results.errors.push(e.message));
    await p.route("**/art/atlas.json", (route) => {
      const j = structuredClone(original);
      if (phase === "missing-variants")
        j.frames = Object.fromEntries(
          Object.entries(j.frames).filter(
            ([id]) =>
              !/^hero_.*_(male|female|cat)_(sword|dagger|bow|short_gun|crownsplitter)$/.test(id),
          ),
        );
      if (phase === "no-art") j.frames = {};
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(j) });
    });
    await p.route(url, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><style>html,body{margin:0}canvas{width:402px;height:681px}</style><canvas></canvas>",
      }),
    );
    await p.goto(url);
    const measured = await p.evaluate(
      async ({ combinations, snapshot, phase }) => {
        const { heroKind, heroBase, heroFallbacks, setHeroLook } =
          await import("/src/render/look.ts");
        const { ReplayState } = await import("/src/render/state.ts");
        const { Atlas } = await import("/src/render/atlas.ts");
        const { View2D } = await import("/src/render/view2d.ts");
        const { CombatCues } = await import("/src/render/combat-cues.ts");
        let checks = 0;
        const check = (value, label) => {
          if (!value) throw Error(label);
          checks++;
        };
        const atlas = new Atlas();
        let loadingError = "";
        const override = atlas.override.bind(atlas);
        atlas.override = (...args) => {
          try {
            return override(...args);
          } catch (e) {
            loadingError = String(e);
            throw e;
          }
        };
        check(
          await atlas.load("/art/atlas.json"),
          "atlas loads under controlled availability: " + phase + " " + loadingError,
        );
        const canvas = document.querySelector("canvas"),
          view = new View2D({ own: canvas });
        // Loader readiness only; frame() is the same lookup used by the production Canvas draw.
        if (phase !== "no-art")
          for (let i = 0; i < 100 && !view.frame("hero_fighter"); i++)
            await new Promise((r) => setTimeout(r, 20));
        if (phase === "no-art") await new Promise((r) => setTimeout(r, 100));
        for (const [cls, weapon] of combinations)
          for (const look of ["male", "female", "cat"]) {
            const base = `hero_${cls}`,
              expected = `${base}_${look}_${weapon}`,
              snap = structuredClone(snapshot);
            snap.hero.kind = base;
            snap.hero.class = cls;
            snap.hero.weapon = weapon;
            setHeroLook(look);
            const st = new ReplayState();
            st.load(snap);
            check(st.hero.kind === expected, "snapshot selects actual weapon + look");
            st.seek(snap.turn + 2);
            check(st.hero.kind === expected, "seek/reset retains selection");
            check(heroBase(expected) === base, "variant has class primitive fallback");
            const chosen = atlas.entity(expected),
              canvasId = heroFallbacks(expected).find((id) => view.frame(id));
            if (phase === "full") {
              check(
                chosen === atlas.sprite.get(`ent:${expected}`),
                "GL uses actual packed variant",
              );
              check(canvasId === expected, "Canvas uses actual packed variant");
            } else if (phase === "missing-variants") {
              check(
                chosen === atlas.sprite.get(`ent:${base}_${look}`),
                "GL falls back to same class/look",
              );
              check(canvasId === `${base}_${look}`, "Canvas falls back to same class/look");
            } else {
              check(
                chosen === atlas.sprite.get(`ent:${base}`) && chosen.w > 0 && chosen.h > 0,
                "GL class primitive available",
              );
              check(canvasId === undefined, "Canvas uses primitive when all frames absent");
            }
            view.draw(st, new CombatCues());
            check(canvas.width > 0 && canvas.height > 0, "Canvas primitive/art draw completes");
          }
        setHeroLook("female");
        check(
          heroKind("hero_caster") === "hero_caster_female",
          "legacy no-weapon snapshot unchanged",
        );
        check(
          heroKind("hero_ranger", "female", "axe") === "hero_ranger_female",
          "unsupported weapon unchanged",
        );
        check(
          heroKind("hero_caster", "", "bow") === "hero_caster_male_bow",
          "default look uses existing male painting",
        );
        check(heroKind("goblin", "female", "bow") === "goblin", "nonhero unchanged");
        view.dispose();
        return {
          phase,
          checks,
          variantCases: 18,
          kind: "controlled fixture; no earned progression claim",
        };
      },
      { combinations, snapshot: moment.floor.snapshot, phase },
    );
    results.checks += measured.checks;
    results.phases.push(measured);
    if (phase === "full") {
      await p.evaluate(async (c) => {
        const { createViewer } = await import("/src/render/index.ts");
        const { setHeroLook } = await import("/src/render/look.ts");
        setHeroLook(c.look);
        const canvas = document.createElement("canvas");
        document.body.append(canvas);
        const v = createViewer(canvas);
        v.load(c.floor.snapshot);
        v.apply(c.floor.events.filter((e) => e.k !== "exit" && e.k !== "descend"));
        v.seek(c.target);
        v.setSpeed(0);
        v.setFrame("fight");
        window.testViewer = v;
        window.testCanvas = canvas;
      }, moment);
      const expected = `hero_gunner_${moment.look || "male"}_short_gun`;
      await p.waitForFunction(
        (expected) => window.testViewer.stats().heroKind === expected,
        expected,
      );
      await p.evaluate(() => {
        window.loss = window.testCanvas.getContext("webgl2").getExtension("WEBGL_lose_context");
        window.loss.loseContext();
      });
      await p.waitForFunction(() => window.testViewer.stats().glLost === true);
      assert.equal(await p.evaluate(() => window.testViewer.stats().heroKind), expected);
      results.checks++;
      await p.evaluate(() => window.loss.restoreContext());
      await p.waitForFunction(() => window.testViewer.stats().glLost === false);
      assert.equal(await p.evaluate(() => window.testViewer.stats().heroKind), expected);
      results.checks++;
      await p.evaluate(() => window.testViewer.dispose());
      results.contextRestore = { kind: expected, lost: true, restored: true };
    }
    await p.close();
  }
  assert.deepEqual(results.errors, []);
  results.status = "PASS";
  if (process.env.IDLEVER_WATCH_WEAPONS_OUT)
    writeFileSync(process.env.IDLEVER_WATCH_WEAPONS_OUT, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results));
} finally {
  await b.close();
}
