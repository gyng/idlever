#!/usr/bin/env python3
"""Reproduce the isolated profile refactor from exact archived source."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

r = Path('docs/evidence/cut307')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for p, digest in json.loads(Path('docs/evidence/cut306/ordinary-identity.json').read_text())['core_sources'].items():
    assert sha(Path(p)) == digest, p
archive = Path('docs/evidence/cut306/source.tar.zst')
assert sha(archive) == json.loads((r / 'base.json').read_text())['source_archive_sha256']
dest = Path(tempfile.mkdtemp(prefix='idlever-cut307-core-'))
proc = subprocess.Popen(['zstd', '-dc', str(archive)], stdout=subprocess.PIPE)
tar = subprocess.run(['tar', '-C', str(dest), '-xf', '-'], stdin=proc.stdout)
proc.stdout.close()
assert proc.wait() == tar.returncode == 0
for old, new in [
    (r / 'upgrades.rs', 'src/cut306_upgrades.rs'),
    (r / 'producer.rs', 'examples/upgrade_utility_probe.rs'),
    (r / 'profile-probe.rs', 'examples/upgrade_profile_probe.rs'),
    (r / 'profile-tests.rs', 'examples/upgrade_profile_tests.rs'),
    (Path('docs/evidence/cut306/validation-source/mechanics.rs'), 'examples/upgrade_mechanics.rs'),
]:
    shutil.copy2(old, dest / 'crates/idlever-core' / new)
Path('target/cut307/source-path.txt').write_text(str(dest) + '\n')
print(dest)
