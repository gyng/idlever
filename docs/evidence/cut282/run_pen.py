"""Ordinary two-day PICKED/TUNED trace of the existing regression seeds."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

out = Path('target/cut282/pen')
out.mkdir(exist_ok=True)
camps = out / 'camps'
camps.mkdir(exist_ok=True)
assert not (out / 'identity.json').exists(), 'inspect the existing trace before relaunching'
binary = Path('target/cut282-native/fast/examples/dayplayer')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
command = [str(binary), '--routine', '--bots', 'picked,tuned', '--seeds', '2', '--days', '2', '--threads', '4', '--no-share', '--verbose']
identity = {
    'source': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'binary_sha256': sha(binary),
    'gameplay_source': json.loads(Path('target/cut282/identity.json').read_text())['source_sha256'],
    'contract_sha256': sha('docs/CUT282_BALANCE_DIAGNOSIS.md'),
    'command': command, 'policy_overrides': [], 'diagnostic': True,
}
for file, expected in identity['gameplay_source'].items():
    assert sha(file) == expected
(out / 'identity.json').write_text(json.dumps(identity, indent=2) + '\n')
env = {k: v for k, v in os.environ.items() if not k.startswith(('DP_', 'IDLEVER_'))}
env['DP_SAVE_DIR'] = str(camps.resolve())
started = time.monotonic()
with (out / 'dayplayer.log').open('w') as log:
    result = subprocess.run(command, env=env, stdout=log, stderr=subprocess.STDOUT)
(out / 'exit.json').write_text(json.dumps({'exit_code': result.returncode, 'seconds': time.monotonic()-started}, indent=2) + '\n')
raise SystemExit(result.returncode)
