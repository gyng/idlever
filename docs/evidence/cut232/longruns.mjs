import fs from 'fs';
const lines = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n');
const by = {};
for (const l of lines) {
  const m = l.match(/^look seed (\d+) m ([\d.]+) best D(\d+) last (.*)$/);
  if (!m) continue;
  (by[m[1]] ??= []).push({ m: +m[2], best: +m[3], last: m[4] });
}
for (const [s, v] of Object.entries(by)) {
  for (let i = 1; i < v.length; i++) {
    const d = v[i].m - v[i - 1].m;
    if (d > 5.5 && v[i - 1].m < 30) console.log(`s${s} ${v[i - 1].m.toFixed(1)}→${v[i].m.toFixed(1)} (${d.toFixed(1)}m) best D${v[i - 1].best}→D${v[i].best} run ${v[i].last}`);
  }
}
