// Cold-title, save-safe navigation and direct-load coverage on the real engine.
import { execFileSync } from 'node:child_process';
import { launchBrowser } from '../../tools/browser.mjs';
import assert from 'node:assert/strict';
const url = execFileSync('bash', ['tools/dev.sh'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' }).trim();
const browser = await launchBrowser(); let checks = 0;
try {
  for (const width of [320, 400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    // Bare URL proves normal cold routing, rather than relying on menu=1.
    await page.goto(`${url}?runs=0`);
    await page.locator('.game-menu').waitFor();
    const cold = await page.evaluate(() => ({ app: !!window.__riddle, save: localStorage.getItem('riddle.save'), inert: document.getElementById('app').inert }));
    assert.equal(cold.app, false); assert.equal(cold.save, null); assert.equal(cold.inert, true); checks += 3;
    assert.equal(await page.locator('.game-menu button').evaluateAll(bs => bs.every(b => b.getBoundingClientRect().height >= 44)), true); checks++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('.menu-preferences .slowdowns').click();
    await page.locator('.menu-preferences .effects-level').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('riddle.slowdowns')), '0');
    assert.equal(await page.evaluate(() => localStorage.getItem('riddle.effects')), 'low');
    assert.equal(await page.evaluate(() => localStorage.getItem('riddle.save')), null); checks += 3;
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Credits', exact: true }).click();
    assert.equal(await page.locator('.menu-credit').count(), 2); checks++;
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await page.waitForFunction(() => window.__riddle?.booted);
    assert.equal(await page.locator('.game-menu').count(), 0);
    assert.equal(await page.evaluate(() => window.__riddle.kind), 'wasm');
    assert.equal(await page.evaluate(() => window.__riddle.slowdowns), false); checks += 3;
    await page.locator('.town-tag[data-next="house"]').click();
    await page.waitForFunction(() => window.__riddle.lineage.town.home);
    const before = await page.evaluate(() => ({ seed: window.__riddle.lineage.seed, heroes: window.__riddle.lineage.hero_slots }));
    await page.reload(); await page.waitForFunction(() => window.__riddle?.booted);
    assert.equal(await page.locator('.game-menu').count(), 0);
    assert.deepEqual(await page.evaluate(() => ({ seed: window.__riddle.lineage.seed, heroes: window.__riddle.lineage.hero_slots })), before); checks += 2;
    // Public settings → main menu; Continue never resets the mounted town.
    await page.locator('button.gear').click();
    await page.locator('.main-menu-button').click();
    assert.equal(await page.evaluate(() => document.getElementById('app').inert), true); checks++;
    const saved = await page.evaluate(() => localStorage.getItem('riddle.save'));
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    assert.equal(await page.locator('.menu-title').textContent(), 'Replace save'); checks++;
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('riddle.save')), saved); checks++;
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Credits'); checks++;
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Continue'); checks++;
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Save & data', exact: true }).click();
    await page.locator('.sheet-wrap .settings').waitFor();
    assert.equal(await page.locator('.game-menu').evaluate(el => el.inert), true); checks++;
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.game-menu').inert);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.equal(await page.locator('.game-menu').count(), 0);
    assert.equal(await page.evaluate(() => document.getElementById('app').inert), false);
    assert.deepEqual(await page.evaluate(() => ({ seed: window.__riddle.lineage.seed, heroes: window.__riddle.lineage.hero_slots })), before); checks += 3;
    // Confirmed restart actually removes the built home and hero.
    await page.locator('button.gear').click(); await page.locator('.main-menu-button').click();
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await page.waitForFunction(() => !window.__riddle.engineBusy);
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
    await page.waitForFunction(() => window.__riddle?.booted && !document.querySelector('.game-menu') && !window.__riddle.lineage.town.home);
    assert.equal(await page.evaluate(() => window.__riddle.lineage.hero_slots.length), 0);
    assert.equal(await page.evaluate(() => window.__riddle.totalRuns()), 0); checks += 2;
    await page.reload(); await page.waitForFunction(() => window.__riddle?.booted);
    assert.equal(await page.locator('.game-menu').count(), 0); assert.deepEqual(errors, []); checks += 2;
    console.log(width, 'real-WASM cold title/preferences/direct reload/cancel/Continue/confirmed reset PASS');
    await page.close();
  }
  console.log(checks, 'game menu checks PASS');
} finally { await browser.close(); }
