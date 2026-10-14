import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { launchBrowser } from "../../tools/browser.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const out = process.env.IDLEVER_RESIDENT_OUT
  ? resolve(root, process.env.IDLEVER_RESIDENT_OUT)
  : undefined;
if (out) mkdirSync(out, { recursive: true });
const part = process.argv.find((a) => a.startsWith("--part="))?.slice(7) ?? "all";
const fixtures =
  part === "rest"
    ? ["three-actual.game.json.gz"]
    : part === "reincarnating"
      ? ["controlled/three-controlled-reincarnating.game.json.gz"]
      : ["three-actual.game.json.gz", "controlled/three-controlled-reincarnating.game.json.gz"];
const browser = await launchBrowser({ gpu: process.env.IDLEVER_RESIDENT_GPU === "1" });
const rows = [],
  errors = [],
  deliveries = [];
const expectedWasm = readFileSync(resolve(root, "web/src/engine/pkg/idlever_wasm_bg.wasm"));
const expectedPackage = {
  bytes: expectedWasm.length,
  sha256: createHash("sha256").update(expectedWasm).digest("hex"),
};
let checks = 0;
const ok = (v, m) => {
    assert.ok(v, m ?? "required condition");
    checks++;
  },
  eq = (a, b, m) => {
    assert.deepEqual(a, b, m ?? "exact values");
    checks++;
  };
try {
  const p = await browser.newPage({
    viewport: { width: 400, height: 900 },
    reducedMotion: "reduce",
  });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.url().includes("idlever_wasm_bg.wasm"))
      deliveries.push(
        r.body().then((bytes) => ({
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        })),
      );
  });
  const entry = new URL(url);
  for (const [key, value] of Object.entries({ dev: "1", fresh: "1", runs: "0" }))
    entry.searchParams.set(key, value);
  if (process.env.IDLEVER_TOWN_DEPTH === "pilot") entry.searchParams.set("townDepth", "pilot");
  await p.goto(entry.toString());
  await p.waitForFunction(() => window.__idlever?.booted);
  for (const fixture of fixtures) {
    const raw = gunzipSync(readFileSync(resolve(root, "docs/evidence/cut218", fixture))).toString();
    await p.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, raw);
    const canonical = await p.evaluate(async () => {
      const a = window.__idlever;
      const before = await a.engine.save();
      const phase = a.lineage.hero_slots.map((h) => ({
        id: h.id,
        life_state: h.life_state,
        recovery_s: h.recovery_s,
        rest_s: h.rest_s,
      }));
      for (const id of [2, 3, 1]) await a.engine.selectBloodline(id);
      await a.refresh();
      return {
        before,
        after: await a.engine.save(),
        phase,
        afterPhase: a.lineage.hero_slots.map((h) => ({
          id: h.id,
          life_state: h.life_state,
          recovery_s: h.recovery_s,
          rest_s: h.rest_s,
        })),
      };
    });
    eq(
      canonical.phase,
      canonical.afterPhase,
      "explicit old-save roster canonicalization does not advance phase/recovery/rest",
    );
    if (out)
      writeFileSync(
        resolve(
          out,
          fixture.includes("controlled")
            ? "controlled-canonicalization.json"
            : "earned-canonicalization.json",
        ),
        JSON.stringify(canonical, null, 2),
      );
    const initial = await p.evaluate(async () => ({
      engine: window.__idlever.kind,
      slots: window.__idlever.lineage.hero_slots,
      services: window.__idlever.lineage.persistent_hero,
      saved: await window.__idlever.engine.save(),
    }));
    eq(initial.engine, "wasm");
    eq(initial.slots.length, 3);
    ok(
      initial.slots.every((h) => h.rest_s > 0 && h.state !== "live"),
      "actual three home actors with real rest/recovery",
    );
    for (const width of [320, 400, 1440])
      for (const scale of [1, 2]) {
        await p.setViewportSize({ width, height: 900 });
        await p.evaluate((scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
          window.__town.setHour(12);
          window.dispatchEvent(new Event("pointermove"));
        }, scale);
        await p.waitForTimeout(900);
        await p.waitForFunction(
          () => {
            const ids = [...document.querySelectorAll("[data-home-hero]")]
              .filter((e) => !e.hidden)
              .map((e) => Number(e.dataset.homeHero))
              .sort();
            return JSON.stringify(ids) === "[1,2,3]";
          },
          undefined,
          { timeout: 10000 },
        );
        const state = await p.evaluate(() => {
          const host = document.querySelector(".town").getBoundingClientRect();
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x - host.x, y: r.y - host.y, w: r.width, h: r.height };
          };
          const actors = [...document.querySelectorAll("[data-home-hero]")]
            .filter((e) => !e.hidden)
            .map((e) => ({ id: Number(e.dataset.homeHero), ...rect(e) }));
          const labels = [...document.querySelectorAll(".town-building-info:not([hidden])")].map(
            (e) => ({ id: e.dataset.buildingInfo, ...rect(e) }),
          );
          const overlap = (a, b) =>
            a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          const hire = document.querySelector(
            "[data-building='worker'][data-worker] .town-marker.mk-coin",
          );
          const hint = document.querySelector(".town-tag:not([hidden])");
          const hireRect =
            hire && hire.getBoundingClientRect().width > 0
              ? { text: hire.textContent, ...rect(hire) }
              : null;
          const hintRect =
            hint && hint.getBoundingClientRect().width > 0
              ? { text: hint.textContent, ...rect(hint) }
              : null;
          return {
            actors,
            labels,
            hireRect,
            hintRect,
            hintHireOverlaps:
              hireRect && hintRect && overlap(hireRect, hintRect)
                ? [[hireRect.text, hintRect.text]]
                : [],
            host: { w: host.width, h: host.height },
            overlaps: actors.flatMap((a, i) =>
              actors
                .slice(i + 1)
                .filter((b) => overlap(a, b))
                .map((b) => [a.id, b.id]),
            ),
            labelActor: labels.flatMap((a) =>
              actors.filter((b) => overlap(a, b)).map((b) => [a.id, b.id]),
            ),
            overflow: document.documentElement.scrollWidth - innerWidth,
            stats: window.__town.stats(),
          };
        });
        if (out)
          writeFileSync(
            resolve(out, "last-geometry.json"),
            JSON.stringify({ state, errors }, null, 2),
          );
        eq(state.actors.map((a) => a.id).sort(), [1, 2, 3]);
        eq(state.overlaps, [], "distinct44px actor rectangles");
        eq(state.labelActor, [], "labels do not cover actor targets");
        eq(state.hintHireOverlaps, [], "persistent plot hint does not cover actual Hire badge");
        eq(state.overflow, 0);
        ok(
          state.actors.every(
            (a) =>
              a.w >= 44 &&
              a.h >= 44 &&
              a.x >= 0 &&
              a.y >= 0 &&
              a.x + a.w <= state.host.w &&
              a.y + a.h <= state.host.h,
          ),
          "full actor targets within scene",
        );
        const actualBuildingTargets = [];
        for (const id of [
          "tent",
          "blacksmith",
          "kennel",
          "guild",
          "pool",
          "staked",
          ...(initial.services.device.available ? ["device"] : []),
        ])
          eq(
            await p.locator(`.town-hit[data-building="${id}"]:not([hidden])`).count(),
            1,
            `earned fixture exposes its actual ${id} target`,
          );
        eq(
          await p.locator('.town-hit[data-building="device"]:not([hidden])').count(),
          initial.services.device.available ? 1 : 0,
          "Device presence matches actual published availability",
        );
        for (const id of [
          "tent",
          "blacksmith",
          "kennel",
          "bank",
          "guild",
          "pool",
          "device",
          "staked",
        ]) {
          const target = p.locator(`.town-hit[data-building="${id}"]:not([hidden])`);
          if (!(await target.count())) continue;
          actualBuildingTargets.push(id);
          await target.scrollIntoViewIfNeeded();
          const primary = await target.evaluate((e) => {
            const r = e.getBoundingClientRect(),
              top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return {
              id: e.dataset.building,
              rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              viewport: { w: innerWidth, h: innerHeight, scrollY },
              parent: e.parentElement?.getBoundingClientRect().toJSON(),
              hit: top?.closest(".town-hit")?.dataset.building,
              tag: top?.closest("[data-next]")?.dataset.next,
              plot: window.__idlever.lineage.town?.next,
              ready: window.__idlever.lineage.town?.next_ready,
              top: top?.closest("button")?.outerHTML?.slice(0, 1000),
              rawTop: top?.outerHTML?.slice(0, 1000),
              stack: document
                .elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                .slice(0, 6)
                .map((e) => ({ tag: e.tagName, cls: e.className })),
            };
          });
          if (out && primary.hit !== id && !(id === "staked" && primary.tag === primary.plot))
            writeFileSync(
              resolve(out, "failed-primary-centre.json"),
              JSON.stringify({ fixture, width, scale, primary }, null, 2),
            );
          ok(
            primary.hit === id || (id === "staked" && primary.tag === primary.plot),
            `actual ${id} centre routes to its own action beside residents`,
          );
          if (id === "staked" && !primary.ready) {
            const beforePreview = await p.evaluate(() => window.__idlever.engine.save());
            // The plot's own tag is an allowed same-action surface at its centre.
            // Click what the player actually sees rather than the covered DOM button.
            if (primary.tag === primary.plot)
              await p.mouse.click(
                primary.rect.x + primary.rect.w / 2,
                primary.rect.y + primary.rect.h / 2,
              );
            else await target.click();
            await p.locator(".plot-preview").waitFor({ state: "visible" });
            eq(
              await p.evaluate(() => window.__idlever.engine.save()),
              beforePreview,
              "locked plot preview is strictly read-only",
            );
            await p.keyboard.press("Escape");
            await p.locator(".plot-preview").waitFor({ state: "hidden" });
          }
        }
        for (const mode of ["mouse", "keyboard"])
          for (const slot of initial.slots) {
            const button = p.locator(`[data-home-hero="${slot.id}"]`);
            await button.scrollIntoViewIfNeeded();
            const hit = await button.evaluate((e) => {
              const r = e.getBoundingClientRect(),
                top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return top === e || e.contains(top);
            });
            ok(hit, `actual actor${slot.id} centre uncovered`);
            if (mode === "mouse") await button.click();
            else {
              await button.focus();
              await p.keyboard.press("Enter");
            }
            await p.locator(".hero-hub").waitFor({ state: "visible" });
            eq(
              await p.locator(".hero-hub-identity h2").innerText(),
              slot.hero_name,
              `correct${mode} actor identity`,
            );
            eq(await p.evaluate(() => window.__idlever.lineage.selected_bloodline), slot.id);
            await p.keyboard.press("Escape");
            await p.locator(".hero-hub").waitFor({ state: "hidden" });
          }
        await p.evaluate(async () => {
          const a = window.__idlever;
          await a.engine.selectBloodline(1);
          await a.refresh();
        });
        const restored = await p.evaluate(() => window.__idlever.engine.save());
        if (restored !== initial.saved && out) {
          const paths = [];
          const diff = (a, b, path = "") => {
            if (JSON.stringify(a) === JSON.stringify(b)) return;
            if (a && b && typeof a === "object" && typeof b === "object") {
              for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
                diff(a[k], b[k], `${path}.${k}`);
            } else paths.push({ path, before: a, after: b });
          };
          diff(JSON.parse(initial.saved), JSON.parse(restored));
          writeFileSync(
            resolve(out, "save-diff.json"),
            JSON.stringify({ fixture, width, scale, paths }, null, 2),
          );
        }
        eq(restored, initial.saved, "inspection changes only active selection, restored exactly");
        rows.push({ fixture, width, scale, actualBuildingTargets, ...state });
        if (out && process.env.IDLEVER_RESIDENT_GPU === "1")
          await p.screenshot({
            path: resolve(
              out,
              `${fixture.includes("controlled") ? "reincarnating" : "rest"}-${width}-${scale}.png`,
            ),
          });
      }
  }
  eq(errors, []);
  const packages = await Promise.all(deliveries);
  ok(packages.length > 0);
  for (const pkg of packages)
    eq(pkg, expectedPackage, "actual served WASM matches current package");
  if (out)
    writeFileSync(
      resolve(out, "results.json"),
      JSON.stringify({ checks, rows, errors, expectedPackage, packages }, null, 2),
    );
  console.log(
    `home-residents: ${checks} checks PASS; actual paid3rest and/or labelled controlled Core3reincarnation, perfixture6layouts/36mouse-keyboard inspections, unchanged restored save`,
  );
} finally {
  await browser.close();
}
