"""Reconstruct all fixture expectations independently and preserve the failed setup."""
import hashlib
import json
from pathlib import Path

archive = Path('docs/evidence/cut284')
raw = Path('target/cut284/v2')
identity = json.loads((raw/'identity.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha('crates/idlever-core/examples/route_counter_probe.rs') == identity['example_sha256']
assert sha('target/cut284/v2/probe-before') == identity['native_sha256']
assert sha(archive/'frozen-contract.md') == identity['contract_sha256']
assert json.loads((raw/'exit.json').read_text())['exit_code'] == 0
packet = json.loads((raw/'routes.json').read_text())
assert len(packet['cells']) == 198 and len({c['route'] for c in packet['cells']}) == 13
routes = [r for r in range(32) if not (r & (r >> 1))]
depths = [8,13,18,23,28,33]
base_order = ['goblin_warlord','bloat_mother','lich','foundry_master','lurker_queen','mirror_king']
expected_keys = set()
for route in routes:
    order = base_order.copy()
    for i in range(5):
        if route & (1 << i): order[i],order[i+1] = order[i+1],order[i]
    for boss in ['bloat_mother','lurker_queen']:
        depth = depths[order.index(boss)]
        labels = ['not-in-reach','in-reach','crossing'] + (['skipping'] if depth < 29 else [])
        for label in labels:
            for pen in [False,True]: expected_keys.add((route,boss,label,pen))
assert {(c['route'],c['boss'],c['case'],c['pen']) for c in packet['cells']} == expected_keys
for cell in packet['cells']:
    order = base_order.copy()
    for i in range(5):
        if cell['route'] & (1 << i): order[i],order[i+1] = order[i+1],order[i]
    assert cell['bossDepth'] == depths[order.index(cell['boss'])]
    assert cell['forks'] == [f for i,f in enumerate([5,9,14,19,24]) if cell['route'] & (1 << i)]
    expected = cell['best']+2 >= cell['bossDepth'] and cell['start'] <= cell['bossDepth']
    assert cell['expected'] == expected
    assert cell['matches'] == (cell['packed'] == expected)
    if cell['pen'] or cell['route'] == 0:
        assert cell['matches']
bad = [c for c in packet['cells'] if not c['matches']]
assert len(bad) == packet['mismatches'] == 32
assert sum(c['expected'] for c in bad) == 16
assert sum(not c['expected'] for c in bad) == 16
for name in ['identity.json','routes.json','exit.json']:
    (archive/name).write_bytes((raw/name).read_bytes())
(archive/'run.txt').write_bytes((raw/'run.log').read_bytes())
initial = archive/'failed-fixture-setup'
initial.mkdir(exist_ok=True)
for name in ['identity.json','exit.json']:
    (initial/name).write_bytes((Path('target/cut284')/name).read_bytes())
(initial/'run.txt').write_bytes(Path('target/cut284/run.log').read_bytes())
assert sha('target/cut284/probe-initial') == json.loads((initial/'identity.json').read_text())['native_sha256']
assert sha(archive/'initial-probe.rs.txt') == json.loads((initial/'identity.json').read_text())['example_sha256']
(archive/'clippy.txt').write_bytes(Path('target/cut284-probe-clippy.log').read_bytes())
print('PASS: 198 cells/13 routes independently reconstructed; 16 missing and16 spurious drilled packs; every pen/base-route control passes; exact source/native/contract and failed-fixture identities preserved')
