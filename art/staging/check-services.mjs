import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { launchBrowser } from '../../tools/browser.mjs';

const base = 'http://127.0.0.1:5278/';
const out = 'art/staging/service-review';
mkdirSync(out, { recursive: true });
const raw = gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const atlas = JSON.parse(readFileSync('web/public/art/atlas.json', 'utf8'));
const serviceIds = Object.keys(atlas.frames).filter(id => id.startsWith('town_service_'));
assert.equal(serviceIds.length, 6);
const fallback = structuredClone(atlas);
for (const id of serviceIds) delete fallback.frames[id];
const results = { scope: 'Packed service art versus retained code fallback; actual saved residents; 400/1440px, effects, relief mapping and context-loss checks. Visual integration only.', rows: [], errors: [] };
const browser = await launchBrowser({ gpu: true });
try {
  for (const mode of ['packed', 'fallback']) {
    const page = await browser.newPage({ viewport: { width: 400, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => results.errors.push(e.message));
    if (mode === 'fallback') await page.route('**/art/atlas.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fallback) }));
    await page.goto(`${base}?dev=1&fresh=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    await page.evaluate(async raw => {
      const a = window.__idlever;
      a.runnerOn = false;
      await a.engine.load(raw);
      for (const id of [2, 3, 1]) await a.engine.selectBloodline(id);
      await a.refresh();
      await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h => h.rest_s))) * 1000 + 1000);
      await a.refresh();
      a.go({ kind: 'camp' });
    }, raw);
    await page.waitForFunction(() => window.__town?.stats().frames > 2);
    const saved = await page.evaluate(() => window.__idlever.engine.save());
    for (const width of [400, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const pref of ['full', 'low', 'off', 'reduced']) {
        await page.emulateMedia({ reducedMotion: pref === 'reduced' ? 'reduce' : 'no-preference' });
        await page.evaluate(async pref => {
          const fx = await import('/src/render/fxpref.ts');
          fx.setEffectsLevel(pref === 'reduced' ? 'full' : pref);
          window.__town.setHour(23);
          window.dispatchEvent(new PointerEvent('pointermove'));
        }, pref);
        await page.waitForTimeout(200);
        const stats = await page.evaluate(() => window.__town.stats());
        assert.equal(stats.mode, 'gl');
        assert.equal(stats.baseDepth, true);
        if (pref !== 'off') {
          assert(stats.mappedSprites.some(q => q.kind === 20), 'Guild relief preserved');
          assert(stats.mappedSprites.some(q => q.kind === 21), 'Pool relief preserved');
        }
        assert.equal(await page.evaluate(() => window.__idlever.engine.save()), saved);
        results.rows.push({ mode, width, pref, modeGL: stats.mode, services: stats.services, mappedServices: stats.mappedSprites.filter(q => q.kind === 20 || q.kind === 21) });
        if (pref === 'full') await page.screenshot({ path: `${out}/${mode}-${width}.png` });
      }
    }
    const gallery = await page.evaluate(async () => {
      const { TownAtlas } = await import('/src/render/town.ts');
      const atlas = new TownAtlas();
      while (!atlas.ready) await new Promise(resolve => setTimeout(resolve, 30));
      const ids = ['town_service_guild', 'town_service_pool', 'town_service_device', 'town_service_device_active_0', 'town_service_device_active_1', 'town_service_station'];
      const heights = [42, 22, 36, 36, 36, 6];
      const c = document.createElement('canvas'); c.width = 760; c.height = 140;
      const g = c.getContext('2d'); g.fillStyle = '#343849'; g.fillRect(0, 0, c.width, c.height);
      const slots = ids.map((id, i) => { const s = atlas.get(id, heights[i]); return { id, ...s, packed: atlas.has(id) }; });
      g.imageSmoothingEnabled = false;
      for (let i = 0; i < slots.length; i++) { const s = slots[i]; g.drawImage(atlas.canvas, s.x, s.y, s.w, s.h, i * 126 + 3, 3, s.w * 2, s.h * 2); g.fillStyle = '#eadfc5'; g.fillText(s.id.replace('town_service_', ''), i * 126 + 3, 125); }
      return { slots, png: c.toDataURL() };
    });
    for (const s of gallery.slots) assert.equal(s.packed, mode === 'packed');
    const vats = gallery.slots.filter(s => s.id.includes('device'));
    assert.equal(new Set(vats.map(s => `${s.w}x${s.h}`)).size, 1, 'Vat frames retain identical drawn dimensions');
    writeFileSync(`${out}/${mode}-gallery.png`, Buffer.from(gallery.png.split(',')[1], 'base64'));
    results.rows.push({ mode, gallery: gallery.slots });
    await page.evaluate(() => document.querySelector('.town-gl').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => window.__town.stats().mode === '2d');
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), saved);
    results.rows.push({ mode, contextLoss: '2d', sameSave: true });
    await page.close();
  }
  assert.deepEqual(results.errors, []);
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(`PASS: ${results.rows.length} service comparison rows, exact saves, relief mapping, context loss, no page errors`);
} catch (error) {
  results.failure = error.stack;
  writeFileSync(`${out}/failed.json`, JSON.stringify(results, null, 2) + '\n');
  throw error;
} finally { await browser.close(); }
