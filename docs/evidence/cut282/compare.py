"""Freeze and run the preregistered same-camp interventions once."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

out = Path('target/cut282')
identity_path = out / 'worker-identity.json'
assert not identity_path.exists(), 'existing comparison: inspect process/output before relaunch'
binary = Path('target/cut282-native/fast/examples/worker_absence')
inputs = [out / 'camps' / f'AWAY-s{seed}-d1-c0.json' for seed in [1, 2]]
hash_file = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
command = [str(binary), str(out / 'worker-comparison.json'), *map(str, inputs)]
identity = {
    'parent_diagnostic': json.loads((out / 'identity.json').read_text())['binary_sha256'],
    'binary_sha256': hash_file(binary),
    'example_sha256': hash_file('crates/idlever-core/examples/worker_absence.rs'),
    'contract_sha256': hash_file('docs/CUT282_BALANCE_DIAGNOSIS.md'),
    'inputs': {str(p): hash_file(p) for p in inputs},
    'command': command,
    'hours': 24,
    'variants': ['unchanged', 'pause-apprentice', 'pause-drillmaster', 'pause-both', 'start1', 'start5', 'forge-all', 'unchanged-repeat'],
    'policy': 'single legal intervention per case, no extra camp taps, grants or seed changes',
}
identity_path.write_text(json.dumps(identity, indent=2) + '\n')
started = time.monotonic()
with (out / 'worker-comparison.log').open('w') as log:
    result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
(out / 'worker-exit.json').write_text(json.dumps({'exit_code': result.returncode, 'elapsed_seconds': time.monotonic() - started}, indent=2) + '\n')
raise SystemExit(result.returncode)
