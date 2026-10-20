"""Controlled route-packing matrix with frozen source/native identity."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'target/cut284')
out.mkdir(parents=True, exist_ok=True)
assert not (out/'identity.json').exists(), 'inspect existing run before relaunch'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
binary = Path('target/cut282-native/fast/examples/route_counter_probe')
identity = {
    'head': subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'native_sha256': sha(binary),
    'example_sha256': sha('crates/idlever-core/examples/route_counter_probe.rs'),
    'contract_sha256': sha('docs/CUT284_ROUTE_COUNTER_PACKING.md'),
    'core_sources': {str(p):sha(p) for p in sorted(Path('crates/idlever-core/src').rglob('*.rs'))},
    'scope':'controlled identified-item reach/skip fixtures, not earned play or pacing acceptance',
}
(out/'identity.json').write_text(json.dumps(identity,indent=2)+'\n')
env = {k:v for k,v in os.environ.items() if not k.startswith(('DP_','IDLEVER_'))}
started = time.monotonic()
with (out/'run.log').open('w') as log:
    result = subprocess.run([str(binary),str(out/'routes.json')],env=env,stdout=log,stderr=subprocess.STDOUT)
(out/'exit.json').write_text(json.dumps({'exit_code':result.returncode,'seconds':time.monotonic()-started},indent=2)+'\n')
raise SystemExit(result.returncode)
