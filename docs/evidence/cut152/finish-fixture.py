import hashlib
import json
import pathlib
import subprocess
import time

root = pathlib.Path('/home/g/p/riddle')
pid = 2524539
stat = pathlib.Path(f'/proc/{pid}/stat')
def identity():
    try:
        data = stat.read_text()
        return data.rsplit(')', 1)[1].split()[19]
    except FileNotFoundError:
        return None

started = identity()
if started is None:
    raise SystemExit('Expected live progression process is missing; inspect before proceeding')
print(f'Waiting for existing progression pid {pid}, start ticks {started}', flush=True)
while identity() == started:
    time.sleep(2)

source = root / 'crates/riddle-core/examples/dayplayer.rs'
evidence = root / 'docs/evidence/cut152'
expected = json.loads((evidence / 'target16-running-artifact.json').read_text())['artifacts'][str(source.relative_to(root))]
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('Frozen source identity changed; refusing automatic fixture edit')
needle = '''        g.lineage.last_night_net = 100;
        g.build_town("bank").unwrap();
        let original = g.clone();'''
replacement = '''        g.lineage.last_night_net = 100;
        g.build_town("bank").unwrap();
        // Isolate Savings from manual forge purchases in both configurations (unit fixture only).
        g.lineage.orders.forge = "all".into();
        riddle_core::tree::grant(&mut g.lineage, &["apprentice"]);
        let original = g.clone();'''
body = source.read_text()
if body.count(needle) != 1:
    raise SystemExit('Savings fixture anchor is not unique; refusing edit')
(evidence / 'target16-terminal.log').write_bytes(pathlib.Path('/tmp/riddle-cut152-target16-accepted.log').read_bytes())
source.write_text(body.replace(needle, replacement))
print('Progression process ended; changed only the isolated Savings test fixture', flush=True)
results = {}
for label, selector in [('session-tests-final', 'session_chore_tests'), ('resume-parity', 'resume_preserves_complete_bot_outputs_and_game')]:
    command = ['cargo', 'test', '-q', '--profile', 'fast', '-p', 'riddle-core', '--example', 'dayplayer', selector]
    log = evidence / f'{label}.log'
    with log.open('w') as stream:
        result = subprocess.run(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT)
    results[label] = {'command':command, 'exit_status':result.returncode, 'log':str(log.relative_to(root))}
    print(f'{label}: terminal {result.returncode}', flush=True)
    if result.returncode:
        break
(evidence / 'fixture-verification.json').write_text(json.dumps({'target_source_sha256':expected, 'final_source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'fixture_only_edit':True, 'results':results, 'full_acceptance':'pending'}, indent=2)+'\n')
raise SystemExit(0 if all(r['exit_status'] == 0 for r in results.values()) and len(results) == 2 else 1)
