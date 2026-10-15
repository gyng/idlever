// Controlled component wire states only; no earned eligibility/gameplay claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import net from 'node:net';
import { resolve } from 'node:path';
import { launchBrowser } from '../../../tools/browser.mjs';
import { phoneReviewViewport } from '../../../web/tests/lib/viewport-cases.mjs';

const out = process.argv[2]; assert(out && !existsSync(out)); mkdirSync(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = ['web/tests/lib/viewport-cases.mjs','web/src/ui/class-tree.ts', 'web/src/ui/class-interaction.ts', 'web/src/ui/class-stage-notice.ts', 'web/src/ui/combat-log.ts', 'web/src/ui/watch.ts', 'web/src/ui/camp.ts', 'web/src/class-tree.css', 'web/src/engine/types.ts'];
const source = Object.fromEntries(sources.map(p => [p, sha(readFileSync(p))]));
const port = await new Promise(done => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--config', 'tests/vite.test.config.ts'], { cwd: resolve('web'), stdio: 'ignore' });
let browser; const pending=[]; const result = { scope: 'Controlled next-pick wire presentation, native-notice display and receipt labels; no earned native progression claim', source, protocolSha256:sha(readFileSync(new URL(import.meta.url))), inputMethods:['scripted DOM','keyboard'], captures:[], rows: [], servedWasm:[], errors: [] };
try {
  const url = `http://localhost:${port}/`;
  let ready = false; for (let i = 0; i < 120; i++) { try { ready = (await fetch(url)).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 100)); } assert(ready);
  browser = await launchBrowser(); const page = await browser.newPage({ viewport: phoneReviewViewport(), reducedMotion: 'reduce' });
  page.on('pageerror', e => result.errors.push(String(e)));
  page.on('response', response => { if (new URL(response.url()).pathname.endsWith('.wasm')) pending.push(response.body().then(bytes => result.servedWasm.push(sha(bytes)))); });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`); await page.waitForFunction(() => window.__idlever?.booted);
  assert.equal(await page.evaluate(() => window.__idlever.kind),'wasm');
  await page.evaluate(() => { window.__idlever.runnerOn = false; });
  const before = await page.evaluate(() => window.__idlever.engine.save());
  for (const viewport of [phoneReviewViewport(), {width:1440,height:900}]) for (const scale of [1, 2]) {
    const width = viewport.width; await page.setViewportSize(viewport);
    const rows = await page.evaluate(async ({ scale }) => {
      const app = window.__idlever;
      const { renderClassTree } = await import('/src/ui/class-tree.ts');
      const { classInteractionText } = await import('/src/ui/class-interaction.ts');
      const { combatLogEvents } = await import('/src/ui/combat-log.ts');
      const old = structuredClone(app.lineage.class_tree); if (!old) throw Error('Missing tree');
      old.level = 10; old.spent = 6; old.points = 0;
      old.nodes.forEach(n => { n.owned = true; n.available = false; });
      for (const [i, id] of ['rally', 'oathguard', 'opening_cut', 'siege_rhythm', 'holdfast', 'execution_arc'].entries()) old.nodes.push({ ...old.nodes[0], id: `fighter_${id}`, name: id.replaceAll('_', ' '), parent: old.nodes[i % 6].id, owned: false, available: false, required_level: 9, required_depth: 23, blocked: 'Controlled requirement' });
      window.pickComponentBase = structuredClone(old);
      const root = document.createElement('main'); root.className = 'game-window'; root.dataset.material = 'bloodlines';
      root.style.cssText = 'position:fixed;inset:0;overflow:auto;background:#eadfc5;container:hero-folio / inline-size';
      const body = document.createElement('div'); body.className = 'sheet-body'; body.style.cssText = 'max-width:100%;box-sizing:border-box'; root.append(body);
      document.body.replaceChildren(root); document.documentElement.style.fontSize = `${16 * scale}px`;
      const stages = [['advanced',9,23,24], ['advanced_second',10,28,32], ['capstone',10,29,48], ['mastery',10,33,64]];
      const cases = [
        ['legacy-early', { ...old, level: 3, spent: 1, points: 0 }],
        ['legacy-max', old],
        ['canonical-early', { ...old, level: 3, spent: 1, budget: 1, next_pick: { stage: 'class_level', level: 3, required_level: 4, depth: 1, required_depth: 0, completed: 0, required_completed: 0, scout: false, requires_scout: false } }],
        ...stages.map(([stage, level, depth, completed], i) => [stage, { ...old, spent: 6 + i, budget: 6 + i, next_pick: { stage, level: level - 1, required_level: level, depth: depth - 1, required_depth: depth, completed: completed - 1, required_completed: completed, scout: false, requires_scout: true } }]),
        ['unspent', { ...old, budget: 7, spent: 6, points: 1, next_pick: { stage: 'advanced_second', level: 9, required_level: 10 } }],
        ['max', { ...old, budget: 10, spent: 10, next_pick: null }],
      ];
      const rows = [];
      for (const [name, tree] of cases) {
        const clone = { ...app, lineage: { ...app.lineage, town: { ...app.lineage.town, home: true }, class_tree: tree } };
        const el = renderClassTree(clone, () => {}); if (!el) throw Error(name); body.replaceChildren(el);
        const pick = el.querySelector('.class-tree-pick');
        if (stages.some(s => s[0] === name)) {
          if (!pick || pick.open) throw Error('Advanced progress must start folded');
          const summary = pick.querySelector('summary'); summary.click();
          if (!pick.open || summary.getBoundingClientRect().height < 44) throw Error('Unusable fold');
          const values = [...pick.querySelectorAll('[data-pick-requirement]')];
          if (values.length !== 4 || values.some(n => n.dataset.met !== 'false')) throw Error('Invented eligibility');
          if (!values[2].textContent.includes(`${tree.next_pick.completed}/${tree.next_pick.required_completed}`)) throw Error('Wrong personal delve progress');
          const preserved = renderClassTree(clone, () => {}, new Set(['pick'])); if (!preserved.querySelector('.class-tree-pick').open) throw Error('Fold lost');
        } else if (pick) throw Error('Unexpected advanced disclosure');
        const text = el.textContent;
        if ((name === 'legacy-early' || name === 'canonical-early') && !text.includes('Next pick L4')) throw Error('Early regression');
        if (['legacy-max','max','unspent'].includes(name) && text.includes('Next pick')) throw Error('Invented future level');
        if (tree.budget !== undefined && el.querySelector('[data-class-pick-budget]').textContent !== `${tree.spent}/${tree.budget} learned`) throw Error('Wrong canonical budget');
        const rect = el.getBoundingClientRect(); if (rect.width > innerWidth + 1) throw Error('Panel overflow');
        rows.push({ name, width: innerWidth, scale, text, foldedInitially: !!pick, requirements: pick ? [...pick.querySelectorAll('[data-pick-requirement]')].map(n => ({ key:n.dataset.pickRequirement, met:n.dataset.met, text:n.textContent })) : [] });
      }
      const base = { k:'class_interaction', t:10, src:1, skill:{id:'path:caster_shatter_ward',name:'Shatter ward'}, effect:'ward', amount:30, phase:'consumed' };
      const labels = [classInteractionText(base),classInteractionText({...base,effect:'damage',phase:'armed',amount:1,expires_t:20}),classInteractionText({...base,effect:'vanish_cooldown',phase:'applied',amount:20}),classInteractionText({...base,effect:'melee_block',phase:'applied',amount:2})];
      if (JSON.stringify(labels) !== JSON.stringify(['Ward −30t','Armed ×1 · 10t','Vanish −20t','Guard 2 hp'])) throw Error('Wrong phase/receipt unit');
      const routed = combatLogEvents([base,{...base,effect:'damage',phase:'armed',amount:1},{...base,effect:'damage',phase:'applied',amount:2}],1,new Map(),()=>true);
      if (routed.length !== 3 || combatLogEvents([{k:'class_stage',t:10,class:'caster',stage:'advanced',picks:7}],1,new Map()).length) throw Error('Wrong receipt/milestone combat routing');
      return rows;
    }, { scale }); result.rows.push(...rows);
    // Render a representative canonical advanced state for actual layout capture.
    await page.evaluate(async () => {
      const { renderClassTree } = await import('/src/ui/class-tree.ts'); const app = window.__idlever;
      const t = structuredClone(window.pickComponentBase); t.level=9;t.spent=6;t.points=0;t.budget=6;
      t.next_pick={stage:'advanced',level:9,required_level:9,depth:22,required_depth:23,completed:23,required_completed:24,scout:true,requires_scout:true};
      t.nodes.forEach(n=>n.owned=true);
      document.querySelector('main.game-window .sheet-body').replaceChildren(renderClassTree({...app,lineage:{...app.lineage,town:{...app.lineage.town,home:true},class_tree:t}},()=>{},new Set(['pick'])));
    });
    const fold = page.locator('.class-tree-pick');
    await fold.locator('summary').focus(); await page.keyboard.press('Enter');
    assert.equal(await fold.evaluate(n => n.open), false);
    await page.keyboard.press('Space'); assert.equal(await fold.evaluate(n => n.open), true);
    const path=`${out}/${width}-${scale}x.png`; await page.screenshot({ path });
    result.captures.push({path,viewport,scale,kind:'viewport',sha256:sha(readFileSync(path))});
  }
  result.notices = await page.evaluate(async () => {
    const { createClassStageNotice } = await import('/src/ui/class-stage-notice.ts');
    const app = window.__idlever;
    const fake = { ...app, lineage: structuredClone(app.lineage) };
    const owner = document.querySelector('main.game-window');
    fake.lineage.town.home = true; fake.lineage.class='fighter'; fake.lineage.class_tree.class='fighter';
    fake.lineage.seed=253001; fake.lineage.selected_bloodline=1;
    fake.lineage.class_tree.budget=10;fake.lineage.class_tree.earned_stage=null;
    localStorage.removeItem('idlever.class-stages');
    for (const p of document.querySelectorAll('.class-unlock')) p.remove();
    const notice=createClassStageNotice(fake,owner);const checks=[];
    const tick=()=>new Promise(r=>setTimeout(r,25));const count=()=>document.querySelectorAll('[data-class-stage]').length;
    notice.paint();await tick();if(count())throw Error('Eligibility read invented notice');checks.push('migrated eligible read silent');
    fake.lineage.class_tree.earned_stage={stage:'advanced',picks:7};
    for(let i=0;i<100;i++)notice.paint();await tick();
    if(count()!==1||!document.querySelector('[data-class-stage]').textContent.includes('7 total picks'))throw Error('Missing actual-transition display');checks.push('100 refreshes one selected-class plate');
    fake.lineage.selected_bloodline=2;notice.paint();await tick();if(count()!==1)throw Error('Resident leaked');checks.push('second resident isolated');
    fake.lineage.selected_bloodline=3;notice.paint();
    fake.lineage.class='rogue';fake.lineage.class_tree.class='rogue';fake.lineage.class_tree.earned_stage=null;notice.paint();await tick();
    if(count())throw Error('Stale queued owner announced');checks.push('queued owner/class cancellation');
    fake.lineage.class='fighter';fake.lineage.class_tree.class='fighter';fake.lineage.selected_bloodline=1;fake.lineage.class_tree.earned_stage={stage:'advanced',picks:7};
    notice.paint();await tick();if(count())throw Error('Repeat notice');checks.push('original resident stage not repeated');
    fake.lineage.class_tree.earned_stage={stage:'mastery',picks:10};notice.paint();await tick();
    if(count()!==1||document.querySelector('[data-class-stage]').dataset.classStage!=='mastery')throw Error('Missing highest stage');checks.push('highest recorded stage only');
    fake.lineage.class_tree.earned_stage={stage:'advanced',picks:7};notice.paint();await tick();if(count())throw Error('Restored old stage announced');checks.push('restored earlier stage suppressed');
    fake.lineage.selected_bloodline=4;notice.paint();notice.dispose();await tick();if(count())throw Error('Disposed notice announced');checks.push('dispose cancels pending display');
    return checks;
  });
  await Promise.all(pending);
  assert(result.servedWasm.length>0 && result.servedWasm.every(h=>h==='8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff'));
  assert.equal(result.rows.length, 36); assert.equal(result.errors.length,0);
  assert.equal(await page.evaluate(() => window.__idlever.engine.save()),before);
  for (const [p,h] of Object.entries(source)) assert.equal(sha(readFileSync(p)),h);
  result.status='PASS'; result.exactSave=true;
} catch(e) { result.status='FAIL';result.error=String(e.stack??e);throw e; }
finally { writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');await browser?.close();server.kill('SIGTERM'); }
