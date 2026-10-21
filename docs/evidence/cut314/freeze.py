#!/usr/bin/env python3
"""Freeze the current isolated source and exact runtimes before parity captures."""
from pathlib import Path
import difflib
import hashlib
import json
import shutil
import subprocess

r = Path('docs/evidence/cut314')
src = Path(Path('target/cut314/source-path.txt').read_text().strip())
def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()
base = json.loads((r/'base-source.json').read_text())
name = 'crates/idlever-core/examples/shared_upgrade_baseline.rs'
base[name] = sha(name)
assert all(sha(p) == h for p,h in base.items())
(r/'base-source.json').write_text(json.dumps(base,indent=2,sort_keys=True)+'\n')
derived = {str(p.relative_to(src)):sha(p) for p in src.rglob('*') if p.is_file() and (str(p.relative_to(src)) in base or p.suffix in ('.rs','.toml','.json'))}
(r/'derived-source.json').write_text(json.dumps(derived,indent=2,sort_keys=True)+'\n')
patch = []
for name in sorted(derived):
    old = Path(name).read_text().splitlines(True) if name in base else []
    new = (src/name).read_text().splitlines(True)
    if old != new:
        patch.extend(difflib.unified_diff(old,new,fromfile='a/'+name,tofile='b/'+name))
(r/'prototype.patch').write_text(''.join(patch))
for source,dest in [('target/fast/examples/shared_upgrade_baseline','target/cut314/runtime-shipping-replay'),('target/cut314-native/fast/examples/shared_upgrade_baseline','target/cut314/runtime-prototype-replay')]:
    assert not Path(dest).exists()
    shutil.copy2(source,dest)
runtimes = ['target/cut314/runtime-shipping-replay','target/cut314/runtime-prototype-replay','target/cut314/runtime-mechanics-final']
identity = {'source':str(src),'base_head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'runtimes':{n:sha(n) for n in runtimes},'input':{'path':'target/cut299/parent.json','sha256':sha('target/cut299/parent.json')},'profile_sha256':sha(r/'budget.json'),'wasm_sha256':sha('web/src/engine/pkg/idlever_wasm_bg.wasm'),'scope':'fixed controlled mechanics and same earned camp, no independent population tuning','correction':'first strict replay-presence check failed because bot input lacks capsules; add one bounded combat witness from same unchanged camp'}
(r/'capture-identity.json').write_text(json.dumps(identity,indent=2)+'\n')
