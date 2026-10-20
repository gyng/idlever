"""Check exact before/after cell coverage, fixed native identities and WASM receipts."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path('docs/evidence/cut284')
raw = Path('target/cut284/after')
after = json.loads((raw/'routes.json').read_text())
before = json.loads((root/'routes.json').read_text())
identity = json.loads((raw/'identity.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(root/'fixed/frozen-contract.md') == identity['contract_sha256']
assert sha('target/cut284/after/probe-fixed') == identity['native_sha256']
assert sha('crates/idlever-core/examples/route_counter_probe.rs') == identity['example_sha256']
assert identity['example_sha256'] == json.loads((root/'identity.json').read_text())['example_sha256']
for path, digest in identity['core_sources'].items(): assert sha(path) == digest, path
assert json.loads((raw/'exit.json').read_text())['exit_code'] == 0
key = lambda c: (c['route'],c['boss'],c['case'],c['pen'])
old = {key(c):c for c in before['cells']}
new = {key(c):c for c in after['cells']}
assert len(new) == 198 and new.keys() == old.keys()
changed = []
for k, cell in new.items():
    assert cell['matches'] and cell['packed'] == cell['expected']
    if old[k] != cell:
        assert not old[k]['matches'] and not cell['pen'] and cell['route'] != 0
        assert {field for field in cell if old[k][field] != cell[field]} == {'packed','matches'}
        changed.append(k)
assert after['mismatches'] == 0 and len(changed) == 32
dest = root/'fixed'
dest.mkdir(exist_ok=True)
for file in ['routes.json','identity.json','exit.json']:
    (dest/file).write_bytes((raw/file).read_bytes())
(dest/'run.txt').write_bytes((raw/'run.log').read_bytes())
wasm = json.loads((root/'wasm-bridge/report.json').read_text())
assert wasm['wasm']['sha256'] == sha('web/src/engine/pkg/idlever_wasm_bg.wasm')
assert wasm['bridgeSha256'] == sha('web/src/engine/pkg/idlever_wasm.js')
assert wasm['scriptSha256'] == sha(root/'wasm_route_check.mjs')
assert len(wasm['rows']) == 6
for row in wasm['rows']:
    input_bytes = gzip.decompress((root/'wasm-bridge'/f"{row['id']}.input.json.gz").read_bytes())
    after_bytes = gzip.decompress((root/'wasm-bridge'/f"{row['id']}.after.json.gz").read_bytes())
    assert hashlib.sha256(input_bytes).hexdigest() == row['inputSha256']
    assert hashlib.sha256(after_bytes).hexdigest() == row['afterSha256']
    saved = json.loads(after_bytes)
    kinds = [item['kind'] for item in saved['run']['hero']['inv']]
    assert kinds == row['inventory'] and row['item'] in kinds and kinds.count('heal') >= 2
    assert saved['run'].get('route',0) == row['route'] and saved['run']['start'] == row['start']
    assert saved['lineage']['gold'] + saved['lineage']['town']['bank'] == saved['lineage']['tree']['ledger']
print('PASS: identical198-cell coverage; exactly32 drilled errors corrected;166 other cells unchanged; all fixed native/source and six public-WASM save/inventory receipts match')
