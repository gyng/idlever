// Typical-phone viewport review: actual earned Home and Watch header routes.
// Archive preserves the earlier elongated diagnostic protocol and its evidence.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
import { phoneReviewViewports } from "../../../web/tests/lib/viewport-cases.mjs";
const args = process.argv.slice(2);
const positional = args.filter((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--wasm-sha");
const phase = positional[0] || `phone-review-${new Date().toISOString().replace(/[^0-9]/g, "")}`;
if (positional.length > 1 || !/^[a-z0-9-]+$/.test(phase)) throw new Error("Invalid evidence phase");
for (const arg of args.filter((arg) => arg.startsWith("--")))
  if (arg !== "--wasm-sha") throw new Error(`Unknown option ${arg}`);
const hash = (x) => createHash("sha256").update(x).digest("hex");
const packagePath = "web/src/engine/pkg/idlever_wasm_bg.wasm";
const packageBytes = readFileSync(packagePath);
const packageAtStart = { path: packagePath, bytes: packageBytes.length, sha256: hash(packageBytes) };
const shaIndex = args.indexOf("--wasm-sha");
const expectedWasm = shaIndex < 0 ? packageAtStart.sha256 : args[shaIndex + 1];
if (!/^[a-f0-9]{64}$/.test(expectedWasm || "")) throw new Error("--wasm-sha needs a SHA256");
if (expectedWasm !== packageAtStart.sha256) throw new Error("Explicit WASM SHA differs from package at start");
const out = resolve(`docs/evidence/cut243-mobileheader/${phase}`);
// Exclusive creation protects every original capture, partial run and failure.
mkdirSync(out);
const fixtures = [
  { id: "empty", path: "docs/evidence/handoff-menus/input.game.json.gz" },
  { id: "saved", path: "docs/evidence/cut153/earned-d28.json.gz" },
].map((f) => ({ ...f, raw: gunzipSync(readFileSync(f.path)).toString() }));
const result = {
  harnessSha256: hash(readFileSync(new URL(import.meta.url))),
  viewportHelperSha256: hash(readFileSync("web/tests/lib/viewport-cases.mjs")),
  scope:
    "Current mobile header Home/actual active Watch on earned input. Actual send starts Watch; timer freeze after init isolates read-only Settings. No grants or state patches, no progression/performance pass.",
  inputs: fixtures.map((f) => ({
    path: f.path,
    rawSha256: hash(f.raw),
    gzipSha256: hash(readFileSync(f.path)),
    scope:
      f.id === "saved"
        ? "Historical actually earned Cut153camp/current package UI state, no pacing or historic departure retrofit"
        : "Existing earned menu input",
  })),
  expectedWasm,
  packageAtStart,
  viewportPresets: phoneReviewViewports(),
  rows: [],
  served: [],
  errors: [],
};
const save = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + "\n");
const port = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const log = createWriteStream(`${out}/vite.log`);
await new Promise((r) => log.once("open", r));
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--port",
    String(port),
    "--strictPort",
    "--config",
    "tests/vite.test.config.ts",
  ],
  { cwd: resolve("web"), stdio: ["ignore", log, log] },
);
let browser;
const pending = [];
try {
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await launchBrowser({ gpu: true });

  for (const {id: preset,width,height} of phoneReviewViewports()) for (const scale of [1,2]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
    page.on("pageerror",e=>result.errors.push(String(e)));
    page.on("response",r=>{const path=new URL(r.url()).pathname;if(path.startsWith("/src/")||path.endsWith(".wasm"))pending.push(r.body().then(b=>result.served.push({path,bytes:b.length,sha256:hash(b)})).catch(()=>{}));});
    await page.clock.install();
    await page.goto(`${url}?fresh=1&seed=1&runs=0`);
    await page.waitForFunction(()=>window.__idlever?.booted,null,{timeout:90000});
    await page.evaluate(async({raw,scale})=>{const a=window.__idlever;a.runnerOn=false;a.lineage=await a.engine.load(raw);await a.refresh();a.go({kind:"camp"});document.documentElement.style.fontSize=`${16*scale}px`;}, {raw:fixtures[0].raw,scale});
    const row={width,height,preset,actualViewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio,visualViewport:visualViewport?{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null})),captureKind:"viewport",scale,home:{},watch:{}};
    const measure=()=>page.evaluate(()=>{
      const h=document.querySelector('header.topbar'),R=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
      const texts=[...h.querySelectorAll('.heir,.trait,.stat')].map(e=>({selector:e.className,text:e.textContent,rect:R(e),font:getComputedStyle(e).fontSize,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}));
      return{view:window.__idlever.view,kind:window.__idlever.kind,live:window.__idlever.lineage.live,header:R(h),settings:R(h.querySelector('.gear')),texts,docOverflow:document.documentElement.scrollWidth-innerWidth};
    });
    // Home routes are actual public controls. Escape cannot spend or change save.
    for(const [label,selector]of[['gold','button.stat.gold'],['legacy','button.stat.legacy'],['settings','button.gear']]){
      const before=await page.evaluate(()=>window.__idlever.engine.save());await page.locator(selector).click();await page.locator('.sheet-wrap:not(.under) > .sheet').last().waitFor();
      const title=await page.locator('.sheet-wrap:not(.under) > .sheet').last().innerText();await page.keyboard.press('Escape');
      const exact=before===await page.evaluate(()=>window.__idlever.engine.save());row.home[label]={title,exact};if(!exact)throw Error('Home route mutated save '+label);
    }
    row.home.layout=await measure();
    await page.screenshot({path:`${out}/home-${preset}-${width}x${height}-${scale}x.png`,fullPage:false});
    // Enter real Watch; its init performs the actual public engine.send on earned state.
    await page.evaluate(()=>window.__idlever.go({kind:'watch'}));
    await page.waitForFunction(()=>document.querySelector('.watch')?.dataset.tick, null,{timeout:90000});
    // Freeze browser wall-clock timers only after actual Watch has started. The real run
    // remains active; no engine fields/methods are patched or state overwritten.
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+2000));
    row.watch.layout=await measure();
    const before=await page.evaluate(()=>window.__idlever.engine.save());
    await page.screenshot({path:`${out}/watch-${preset}-${width}x${height}-${scale}x.png`,fullPage:false});
    await page.locator('button.gear').click();await page.locator('.sheet-wrap:not(.under) > .sheet').last().waitFor();
    row.watch.settingsTitle=await page.locator('.sheet-wrap:not(.under) > .sheet').last().innerText();
    await page.screenshot({path:`${out}/settings-${preset}-${width}x${height}-${scale}x.png`,fullPage:false});
    await page.keyboard.press('Escape');row.watch.exact=before===await page.evaluate(()=>window.__idlever.engine.save());await page.clock.runFor(17);row.watch.exactAfterRaf=before===await page.evaluate(()=>window.__idlever.engine.save());row.watch.returned=await page.locator('button.gear').evaluate(e=>e===document.activeElement);
    result.rows.push(row);save();
    for(const x of [row.home.layout,row.watch.layout])if(x.docOverflow>1||x.settings.w<44||x.settings.h<44||(scale===1&&x.header.h>112))throw Error('Header geometry failure');
    if(!row.watch.exact||!row.watch.returned)throw Error('Watch settings changed save/focus');
    await page.close();
  }
  await Promise.all(pending);
  const wasm=result.served.filter(r=>r.path.endsWith('.wasm'));if(!wasm.length||wasm.some(r=>r.sha256!==expectedWasm))throw Error('Unexpected WASM');
  result.packageUnchanged = hash(readFileSync(packagePath)) === packageAtStart.sha256;
  if (!result.packageUnchanged) throw Error('Package changed during header review');
  result.status='PASS';save();
} catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}finally{await browser?.close();vite.kill('SIGTERM');log.end();}
