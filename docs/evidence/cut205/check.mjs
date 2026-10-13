import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {launchBrowser} from '../../tools/browser.mjs';
const source=readFileSync('crates/idlever-core/src/class_tree.rs','utf8');
const nodes=[];
for(const group of source.matchAll(/Class::(Fighter|Rogue|Ranger|Caster|Gunner) => \[([\s\S]*?)(?=\n        Class::|\n    };)/g))
 for(const row of group[2].matchAll(/\(\s*"([a-z_]+)",\s*"([^"]+)",/g))nodes.push({id:`${group[1].toLowerCase()}_${row[1]}`,name:row[2],cls:group[1]});
assert.equal(nodes.length,30);assert.equal(new Set(nodes.map(x=>x.id)).size,30);
const b=await launchBrowser({gpu:true});const errors=[];
try{const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5210/?dev=1&fresh=1&runs=0&seed=205');await p.waitForFunction(()=>window.__idlever?.booted);
 const checks=await p.evaluate(async nodes=>{const {classSkillIcon,SKILL_ICON_IDS}=await import('/src/ui/skill-icons.ts');
 const inventories=[...SKILL_ICON_IDS].sort(),wanted=nodes.map(x=>x.id).sort();if(JSON.stringify(inventories)!==JSON.stringify(wanted))throw Error('Core icon inventory mismatch');
 window.__idlever.runnerOn=false;
 const root=document.createElement('main');root.className='skill-board';root.innerHTML='<h1>Class skill insignias</h1><p>24 · 32 · 48px / Locked · Available · Learned</p>';
 const style=document.createElement('style');style.textContent='.skill-board{position:absolute;inset:0;min-height:100vh;padding:24px;background:#0d0c14;color:#eadfc5;box-sizing:border-box;overflow:visible;font-family:var(--sans)}.skill-board h1{font-family:var(--display);font-size:28px;margin:0 0 8px}.skill-board p{margin:0 0 18px}.skill-board h2{font-family:var(--display);font-size:24px;margin:18px 0 8px}.skill-board-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.skill-board-card{padding:10px;background:#1c1b2b;border:1px solid #55647f}.skill-board-card b{display:block;margin-bottom:10px;font-size:16px}.skill-board-row{display:flex;justify-content:space-between;align-items:center;margin:8px 0;gap:8px}.skill-board-row>small{width:20px;flex-shrink:0}.skill-board-row .skill-icon{margin-right:4px}@media(max-width:700px){.skill-board{padding:16px}.skill-board-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.append(style);
 let cells=0;const unique=new Set();
 for(const cls of [...new Set(nodes.map(x=>x.cls))]){const title=document.createElement('h2');title.textContent=cls;root.append(title);const grid=document.createElement('div');grid.className='skill-board-grid';root.append(grid);
 for(const node of nodes.filter(x=>x.cls===cls)){const card=document.createElement('section');card.className='skill-board-card';const label=document.createElement('b');label.textContent=node.name;card.append(label);
 for(const size of[24,32,48]){const row=document.createElement('div');row.className='skill-board-row';const at=document.createElement('small');at.textContent=size;row.append(at);
 for(const state of['locked','available','learned']){const icon=classSkillIcon({...node,owned:state==='learned',available:state==='available'},{size});if(icon.getAttribute('aria-label')!==node.name||icon.getAttribute('role')!=='img')throw Error('Wrong accessible name');if(icon.dataset.state!==state)throw Error('Wrong state');if(icon.dataset.fallback)throw Error('Mapped icon fell back');row.append(icon);cells++;if(size===32&&state==='available')unique.add(icon.querySelector('svg').innerHTML);}
 card.append(row);}grid.append(card);}}
 const fallback=classSkillIcon({id:'future_unknown',name:'Actual future name'}),again=classSkillIcon({id:'future_unknown',name:'Actual future name'});if(fallback.outerHTML!==again.outerHTML||fallback.dataset.fallback!=='true')throw Error('Nondeterministic fallback');
 const decorated=classSkillIcon(nodes[0],{decorative:true});if(decorated.getAttribute('aria-hidden')!=='true'||decorated.hasAttribute('role')||decorated.hasAttribute('aria-label'))throw Error('Decorative semantics');
 document.body.replaceChildren(root);document.body.style.overflow='auto';document.documentElement.style.overflow='auto';document.body.style.height='auto';document.documentElement.style.height='auto';
 for(const el of root.querySelectorAll('.skill-icon')){const r=el.getBoundingClientRect(),size=Number(el.dataset.size);if(Math.abs(r.width-size)>0.1||Math.abs(r.height-size)>0.1)throw Error('Incorrect size');const svg=el.querySelector('svg');if(!svg||!svg.querySelector('path')||svg.getBoundingClientRect().width<=0)throw Error('Missing silhouette');}
 return{cells,unique:unique.size,ids:inventories,fallback:fallback.outerHTML};},nodes);
 assert.equal(checks.cells,270);assert.equal(checks.unique,30);assert.equal(errors.length,0);await p.screenshot({path:'docs/evidence/cut205/1440-skill-board.png',fullPage:true});await p.setViewportSize({width:400,height:900});await p.screenshot({path:'docs/evidence/cut205/400-skill-board.png',fullPage:true});writeFileSync('docs/evidence/cut205/checks.json',JSON.stringify({checks,nodes,errors},null,2));console.log(JSON.stringify({cells:checks.cells,unique:checks.unique,errors}));
}finally{await b.close();}
