"""Bounded ordinary-policy worker diagnosis; run from the repository root."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

out = Path('target/cut282')
out.mkdir(exist_ok=True)
camps = out / 'camps'
camps.mkdir(exist_ok=True)
binary = Path('target/cut282-native/fast/examples/dayplayer')
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
identity = {
    'source': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'compiler': subprocess.check_output(['rustc', '--version', '-v'], text=True).strip(),
    'build': 'CARGO_INCREMENTAL=0 CARGO_TARGET_DIR=target/cut282-native cargo build -q --profile fast -p idlever-core --example dayplayer',
    'cargo_sha256': {p: digest(p) for p in ['Cargo.lock', 'Cargo.toml', 'crates/idlever-core/Cargo.toml']},
    'binary_sha256': digest(binary),
    'source_sha256': {str(p): digest(p) for p in sorted(Path('crates/idlever-core').rglob('*.rs'))},
    'command': [str(binary), '--routine', '--bots', 'away', '--seeds', '2', '--days', '4', '--threads', '4', '--no-share', '--verbose'],
    'diagnostic': True,
    'policy_overrides': [],
}
if (out / 'identity.json').exists():
    raise SystemExit('Refuse to overwrite an existing diagnostic; inspect its live process/results first')
(out / 'identity.json').write_text(json.dumps(identity, indent=2) + '\n')
env = {k: v for k, v in os.environ.items() if not k.startswith(('DP_', 'IDLEVER_'))}
env['DP_SAVE_DIR'] = str(camps.resolve())
env['DP_NODES'] = '1'
started = time.monotonic()
with (out / 'dayplayer.log').open('w') as log:
    result = subprocess.run(identity['command'], env=env, stdout=log, stderr=subprocess.STDOUT)
(out / 'exit.json').write_text(json.dumps({'exit_code': result.returncode, 'elapsed_seconds': time.monotonic() - started}, indent=2) + '\n')
raise SystemExit(result.returncode)
