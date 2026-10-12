import { launchGpu } from '../../tools/browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const url = process.argv[2], out = process.argv[3];
mkdirSync(out, {recursive: true});
const browser = await launchGpu();
const evidence = {url, at: new Date().toISOString(), errors: [], failures: [], wasm: []};
try {
  const context = await browser.newContext({viewport: {width: 400, height: 900}});
  const page = await context.newPage();
  page.on('pageerror', e => evidence.errors.push(e.message));
  page.on('response', r => {if (r.status() >= 400) evidence.failures.push({url:r.url(),status:r.status()}); if(r.url().endsWith('.wasm')) evidence.wasm.push({url:r.url(),status:r.status()});});
  await page.goto(url);
  evidence.renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  });
  assert.match(evidence.renderer, /D3D12/);
  await page.locator('.game-menu').waitFor();
  await page.waitForFunction(() => document.querySelector('.menu-title.has-wordmark'));
  assert.equal(await page.getByRole('button', {name: 'Credits',exact: true}).count(),0);
  evidence.primaryHeight = await page.locator('.menu-action.primary').evaluate(e => e.getBoundingClientRect().height);
  assert.ok(evidence.primaryHeight >= 104);
  assert.equal(await page.locator('.menu-title-text').textContent(), 'Idlever');
  for (const width of [320, 400, 1440]) {
    await page.setViewportSize({width, height: width === 1440 ? 900 : 900});
    await page.screenshot({path:`${out}/title-${width}.png`});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
  }
  await page.setViewportSize({width:400,height:900});
  await page.getByRole('button', {name: 'New game',exact: true}).click();
  await page.locator('.town-tag[data-next="house"]').waitFor();
  await page.locator('.town-tag[data-next="house"]').click();
  await page.locator('.hero-details:visible').first().waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({path:`${out}/town.png`});
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('idlever.save')));
  assert.ok(saved.engine);
  await page.reload();
  await page.locator('.hero-details:visible').first().waitFor();
  assert.equal(await page.locator('.game-menu').count(),0);
  await page.goto(`${url}?dev=1`);
  await page.waitForFunction(() => window.__idlever?.booted);
  evidence.engine = await page.evaluate(() => ({kind:window.__idlever.kind,version:window.__idlever.version,town:window.__idlever.lineage.town,heroes:window.__idlever.lineage.hero_slots.length}));
  assert.equal(evidence.engine.kind,'wasm');
  assert.ok(evidence.engine.heroes > 0);
  assert.ok(evidence.wasm.length > 0 && evidence.wasm.every(r => r.status === 200));
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.failures,[]);
  evidence.pass = true;
  console.log(JSON.stringify(evidence));
} finally {
  writeFileSync(`${out}/smoke.json`,JSON.stringify(evidence,null,2)+'\n');
  await browser.close();
}
