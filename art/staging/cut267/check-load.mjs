// Cut267 load check: serve web/public, open it in headless Chromium (tools/browser.mjs, no desktop window) and confirm that
// every Cut267 atlas frame is inside atlas.png with visible pixels, that the vat frames share one size, and that every
// Cut267 UI file listed in web/src/ui/skin.json decodes. Writes art/staging/cut267/load-check.json and load-check.png.
//   node art/staging/cut267/check-load.mjs <port>
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../../tools/browser.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../..");
const port = Number(process.argv[2] ?? 5391);
const manifest = JSON.parse(readFileSync(join(ROOT, "art/manifest.json"), "utf8"));
const ids = manifest.assets
  .filter((a) => /Cut267|Cut264 §5/.test(a.description ?? ""))
  .map((a) => a.id)
  .concat(["town_service_device", "town_service_device_active_0", "town_service_device_active_1"]);
const skin = JSON.parse(readFileSync(join(ROOT, "web/src/ui/skin.json"), "utf8"));
const ui = [
  ...skin.icons.filter((n) => n.startsWith("badge_")).map((n) => `ui/icons/${n}.png`),
  ...skin.fx.filter((n) => n.startsWith("chest_")).map((n) => `ui/fx/${n}${n.endsWith("_px") ? ".png" : ".webp"}`),
];

const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: join(ROOT, "web/public"),
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 1200));
const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/art/atlas.json`);
  const result = await page.evaluate(
    async ({ ids, ui }) => {
      const load = (src) =>
        new Promise((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => res(null);
          im.src = src;
        });
      const atlas = await (await fetch("/art/atlas.json")).json();
      const img = await load("/art/atlas.png");
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const frames = {};
      for (const id of ids) {
        const f = atlas.frames[id];
        if (!f) {
          frames[id] = { ok: false, why: "missing frame" };
          continue;
        }
        const d = g.getImageData(f.x, f.y, f.w, f.h).data;
        let vis = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 8) vis++;
        const cover = vis / (f.w * f.h);
        frames[id] = { ok: f.x + f.w <= img.width && f.y + f.h <= img.height && cover > 0.15, w: f.w, h: f.h, cover: +cover.toFixed(3) };
      }
      const files = {};
      for (const p of ui) {
        const im = await load("/" + p);
        files[p] = im ? { ok: im.naturalWidth > 0, w: im.naturalWidth, h: im.naturalHeight } : { ok: false };
      }
      // a contact strip: each Cut267 atlas frame at 1x on a dark ground, then the UI files at 48 px
      const strip = document.createElement("canvas");
      strip.width = 1600;
      strip.height = 260;
      const s = strip.getContext("2d");
      s.fillStyle = "#1c1b2b";
      s.fillRect(0, 0, strip.width, strip.height);
      let x = 4;
      let y = 4;
      for (const id of ids) {
        const f = atlas.frames[id];
        if (!f) continue;
        const w = Math.round((f.w * 72) / f.h);
        if (x + w > strip.width) {
          x = 4;
          y += 78;
        }
        s.drawImage(img, f.x, f.y, f.w, f.h, x, y, w, 72);
        x += w + 4;
      }
      x = 4;
      y += 80;
      for (const p of ui) {
        const im = await load("/" + p);
        if (!im) continue;
        const w = Math.round((im.naturalWidth * 40) / im.naturalHeight);
        if (x + w > strip.width) {
          x = 4;
          y += 44;
        }
        s.imageSmoothingEnabled = !p.endsWith("_px.png");
        s.drawImage(im, x, y, w, 40);
        x += w + 4;
      }
      return { atlas: { w: img.width, h: img.height }, frames, files, strip: strip.toDataURL("image/png") };
    },
    { ids, ui },
  );
  const vat = ids.filter((i) => i.startsWith("town_service_device")).map((i) => `${result.frames[i].w}x${result.frames[i].h}`);
  const out = {
    date: new Date().toISOString(),
    browser: "headless Chromium via tools/browser.mjs launchBrowser (SwiftShader); load/decode check, not a render or FPS claim",
    atlas: result.atlas,
    frames: result.frames,
    files: result.files,
    vatSizes: [...new Set(vat)],
    errors,
  };
  out.pass =
    Object.values(result.frames).every((f) => f.ok) &&
    Object.values(result.files).every((f) => f.ok) &&
    out.vatSizes.length === 1 &&
    errors.length === 0;
  writeFileSync(join(HERE, "load-check.json"), JSON.stringify(out, null, 1) + "\n");
  writeFileSync(join(HERE, "load-check.png"), Buffer.from(result.strip.split(",")[1], "base64"));
  console.log(
    `load check: ${Object.keys(result.frames).length} atlas frames, ${Object.keys(result.files).length} UI files, vat ${out.vatSizes.join(",")}, errors ${errors.length} -> ${out.pass ? "PASS" : "FAIL"}`,
  );
  process.exitCode = out.pass ? 0 : 1;
} finally {
  await browser.close();
  server.kill();
}
