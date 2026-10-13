import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const baseline = process.argv.includes("--baseline");
const output = process.env.IDLEVER_CHROME_OUT;
if (output) mkdirSync(resolve(root, output), { recursive: true });
const fixturePath = "docs/evidence/cut215/ui-inputs-final/seed-1/earned-owned-home.game.json.gz";
const bytes = readFileSync(resolve(root, fixturePath));
const raw = gunzipSync(bytes).toString();
const browser = await launchBrowser();
const records = [],
  errors = [],
  deliveries = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().endsWith("idlever_wasm_bg.wasm"))
      deliveries.push(
        response.body().then((b) => ({
          bytes: b.length,
          sha256: createHash("sha256").update(b).digest("hex"),
        })),
      );
  });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  for (const mode of ["camp", "watch"])
    for (const width of [320, 400, 1024, 1440, 1920, 2560])
      for (const scale of [1, 2]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          async ({ raw, mode, scale }) => {
            const a = window.__idlever;
            a.runnerOn = false;
            if (a.kind !== "wasm") throw Error("real WASM required");
            a.go({ kind: "camp" });
            await a.engine.load(raw);
            await a.engine.renameHero("M".repeat(32));
            if (mode === "watch") await a.engine.send();
            await a.refresh();
            document.documentElement.style.fontSize = `${16 * scale}px`;
            a.watchMode = "one";
            a.go({ kind: mode });
            await document.fonts.ready;
            await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
          },
          { raw, mode, scale },
        );
        if (mode === "watch") {
          await page.waitForFunction(() => document.querySelector(".watch")?.dataset.tick);
          await page.locator('[aria-label="Pause watch"]').click();
        }
        await page.waitForTimeout(150);
        const proof = await page.evaluate(() => {
          const frame = document.querySelector("main.frame"),
            scene = frame.querySelector(".stage") ?? frame.querySelector(".town"),
            dock = frame.querySelector(".console"),
            header = frame.querySelector(".topbar");
          const rect = (node) => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          };
          const intersect = (a, b) =>
            Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
            Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
          const sr = rect(scene),
            dr = rect(dock);
          const controls = [...frame.querySelectorAll(".topbar button,.console button")]
            .filter((node) => node.getBoundingClientRect().width > 0)
            .map((node) => {
              const r = rect(node),
                hit = document.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2);
              const label = node.querySelector(".tl");
              let labelFits = true;
              let ellipsis = false;
              if (label) {
                const range = document.createRange();
                range.selectNodeContents(label);
                const css = getComputedStyle(label);
                ellipsis =
                  innerWidth < 1024 && css.overflow === "hidden" && css.textOverflow === "ellipsis";
                // A range includes text intentionally hidden by the existing phone
                // ellipsis. Check its actual clip box; desktop labels must fit in full.
                const bounds = ellipsis
                  ? [label.getBoundingClientRect()]
                  : [...range.getClientRects()];
                labelFits = bounds.every(
                  (l) =>
                    l.left >= r.x - 1 &&
                    l.right <= r.x + r.w + 1 &&
                    l.top >= r.y - 1 &&
                    l.bottom <= r.y + r.h + 1,
                );
              }
              return {
                name: node.getAttribute("aria-label") ?? node.textContent.trim(),
                ...r,
                centre: !!hit && (hit === node || node.contains(hit)),
                labelFits,
                ellipsis,
              };
            });
          const reserved = [...frame.querySelectorAll(".hud.top,.watch-depth-map,.watch-messages")]
            .filter((node) => node.getBoundingClientRect().width > 0)
            .map((node) => ({ name: node.className, overlap: intersect(rect(node), dr) }));
          return {
            scene: sr,
            dock: dr,
            header: rect(header),
            controls,
            reserved,
            floating: frame.classList.contains("floating-controls"),
            dockInScene: scene.contains(dock),
            unobscuredArea: sr.w * sr.h - intersect(sr, dr),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        records.push({ mode, width, scale, ...proof });
        assert.equal(proof.overflow, false, `${mode}/${width}/${scale}: viewport overflow`);
        for (const control of proof.controls) {
          assert.ok(
            control.w >= 44 && control.h >= 44,
            `${mode}/${width}/${scale}: ${control.name} ${control.w}×${control.h}`,
          );
          assert.equal(control.centre, true, `${mode}/${width}/${scale}: ${control.name} obscured`);
          assert.equal(
            control.labelFits,
            true,
            `${mode}/${width}/${scale}: ${control.name} label clipped`,
          );
        }
        if (proof.floating) {
          assert.equal(proof.dockInScene, true);
          assert.ok(
            proof.reserved.every((r) => r.overlap === 0),
            JSON.stringify(proof.reserved),
          );
        }
        if (!baseline && mode === "watch" && width >= 1440 && scale === 1)
          assert.equal(proof.floating, true, `${width}: roomy desktop must float`);
      }
  if (!baseline) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      await a.engine.load(raw);
      await a.engine.send();
      await a.refresh();
      document.documentElement.style.fontSize = "16px";
      a.watchMode = "one";
      a.go({ kind: "watch" });
    }, raw);
    await page.waitForFunction(() => document.querySelector(".watch")?.dataset.tick);
    await page.locator('[aria-label="Pause watch"]').click();
    const speed = page.locator('.console [data-tile="speed"]');
    await speed.focus();
    await page.setViewportSize({ width: 400, height: 900 });
    await page.waitForFunction(
      () => !document.querySelector(".watch").classList.contains("floating-controls"),
    );
    assert.equal(
      await speed.evaluate((e) => e === document.activeElement),
      true,
      "focus survives footer fallback",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() =>
      document.querySelector(".watch").classList.contains("floating-controls"),
    );
    assert.equal(
      await speed.evaluate((e) => e === document.activeElement),
      true,
      "focus survives floating restoration",
    );
    await page.locator(".watch-depth-map summary").click();
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => {
        const frame = document.querySelector(".watch");
        if (!frame.classList.contains("floating-controls")) return true;
        const a = frame.querySelector(".console").getBoundingClientRect();
        const b = frame.querySelector(".depth-map-details").getBoundingClientRect();
        return !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      }),
      true,
      "expanded depth inspector clears the dock",
    );
    await page.locator(".watch-depth-map summary").click();
    await speed.click();
    await page.locator('.sheet [data-tile="fast"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector(".watch")?.dataset.mode === "fast" &&
        !document.querySelector(".sheet"),
    );
    await page.locator('[aria-label="Pause watch"]').click();
    await page.waitForFunction(() => document.querySelector(".watch")?.dataset.speed === "0");
    await page.locator('[aria-label="Resume watch"]').click();
    await page.waitForFunction(() => Number(document.querySelector(".watch")?.dataset.speed) > 0);
    await page.locator('[data-tile="ctl-toggle"]').click();
    await page.waitForFunction(() => document.querySelector(".ctl")?.dataset.on === "1");
    await page.locator('[data-tile="ctl-toggle"]').click();
    await page.waitForFunction(() => document.querySelector(".ctl")?.dataset.on === "0");
    await page.locator('.console [data-tile="town"]').click();
    await page.waitForFunction(() => window.__idlever.screen === "camp");
  }
  assert.deepEqual(errors, []);
  const result = {
    baseline,
    records,
    errors,
    wasm: await Promise.all(deliveries),
    fixture: { path: fixturePath, sha256: createHash("sha256").update(bytes).digest("hex") },
  };
  if (output)
    writeFileSync(resolve(root, output, "results.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(
    `chrome-layout:24 actual viewport/font states PASS; ${records.filter((r) => r.floating).length} floating`,
  );
} catch (error) {
  if (output)
    writeFileSync(
      resolve(root, output, "failure.json"),
      JSON.stringify({ records, errors, error: String(error) }, null, 2) + "\n",
    );
  throw error;
} finally {
  await browser.close();
}
