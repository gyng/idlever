// Infrastructure only: persistent stdin relay to one existing local browser driver.
// No game internals, browser creation, save access, or source modification.
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';

const [portArg, directory] = process.argv.slice(2);
const port = Number(portArg);
if (![5380, 5381].includes(port) || !directory) throw new Error('usage: node public-relay.mjs 5380|5381 OWN_SCRATCHPAD');
const dir = path.resolve(directory);
const expected = path.resolve(`scratchpad/d34605e-blind-${port === 5380 ? 'a' : 'b'}`);
if (dir !== expected) throw new Error('directory must belong to selected existing driver');
fs.mkdirSync(path.join(dir, 'relay'), {recursive: true});
const allowed = new Set(['text', 'buttons', 'state', 'shot', 'click', 'tap', 'press', 'fill', 'act', 'watch', 'send_and_watch', 'sheets', 'goto']);
let busy = false, sequence = 0;
const lines = readline.createInterface({input: process.stdin, terminal: false});
console.log(JSON.stringify({relayReady: true, port, utc: new Date().toISOString(), instruction: 'One JSON public-control command per line; await response before next command.'}));
lines.on('line', async line => {
  if (!line.trim()) return;
  if (busy) { console.log(JSON.stringify({relayError: 'request pending; do not duplicate'})); return; }
  busy = true;
  const start = new Date().toISOString();
  let cmd;
  try {
    cmd = JSON.parse(line);
    if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd) || !allowed.has(cmd.op)) throw new Error('public-control operation required; eval/js/export/quit unavailable');
    if (cmd.op === 'goto') {
      const u = new URL(cmd.url);
      if (u.origin !== 'http://127.0.0.1:5269' || u.pathname !== '/' || u.searchParams.has('fresh') || u.searchParams.has('menu')) throw new Error('only existing frozen origin, no restart/fresh/menu');
    }
    if (cmd.op === 'watch' && (cmd.ms ?? 30000) > 60000) throw new Error('watch chunks must be <=60000ms');
    if (cmd.op === 'send_and_watch' && (cmd.max ?? 300000) > 60000) throw new Error('send_and_watch max must be <=60000ms');
    const n = ++sequence;
    const response = await fetch(`http://127.0.0.1:${port}/`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(cmd)});
    const raw = await response.text();
    const end = new Date().toISOString();
    let result;
    try { result = JSON.parse(raw); } catch { result = {unparsedResponse: raw}; }
    const record = {sequence: n, startUtc: start, endUtc: end, cmd, result};
    fs.writeFileSync(path.join(dir, 'relay', `${String(n).padStart(4, '0')}-${Date.parse(start)}.json`), JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify(record));
  } catch (error) {
    console.log(JSON.stringify({relayError: String(error.message ?? error), startUtc: start, endUtc: new Date().toISOString(), cmd}));
  } finally { busy = false; }
});
