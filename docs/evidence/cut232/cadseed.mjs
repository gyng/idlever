import fs from 'fs';
const [file, bot = 'PICKED'] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file));
const EACH = new Set(['lit', 'plot', 'system']);
const unit = (k) => (EACH.has(k.split(':')[0]) ? k : k.split(':')[0]);
const COUPLED = [
  ['system:four delves', (k) => k === 'plot:blacksmith'],
  ['system:six delves', (k) => k === 'pkg'],
  ['system:first tame', (k) => k === 'plot:kennel'],
  ["system:a night's purse", (k) => k === 'plot:bank'],
  ['system:first gold home', (k) => k === 'chest'],
];
let okS = 0, okC = 0, n = 0;
const out = [];
for (const r of j.runs) {
  if (r.bot !== bot) continue;
  n++;
  const end = Math.min(30, Math.max(0, r.session_m));
  const ts = [...new Set(r.timeline.filter((b) => !b.minor && b.m >= 0 && b.m <= end).map((b) => b.m))].sort((a, b) => a - b);
  let gap = 0, last = 0, gapAt = '';
  for (const t of [...ts, end]) { if (t - last > gap) { gap = t - last; gapAt = `${last.toFixed(1)}→${t.toFixed(1)}`; } last = t; }
  let most = 0, coup = 0;
  const bad = [];
  for (const t of ts) {
    const u = new Set(r.timeline.filter((b) => b.d && !b.minor && b.m === t).map((b) => unit(b.k)));
    const c = new Set(u);
    for (const [s, own] of COUPLED) if (c.has(s)) for (const x of [...c]) if (own(x)) c.delete(x);
    most = Math.max(most, u.size); coup = Math.max(coup, c.size);
    if (u.size > 1) bad.push(`${t.toFixed(1)}[${[...u].join(',')}]${c.size > 1 ? '!' : ''}`);
  }
  const passS = gap <= 6 && most <= 1, passC = gap <= 6 && coup <= 1;
  okS += passS; okC += passC;
  out.push(`s${String(r.seed).padStart(2)} gap ${gap.toFixed(1)} (${gapAt}) dec ${most} coup ${coup} ${passS ? 'PASS' : passC ? 'pass-c' : 'FAIL'}  ${bad.join(' ')}`);
}
console.log(out.join('\n'));
console.log(`strict ${okS}/${n} · coupled ${okC}/${n}`);
