#!/usr/bin/env python3
"""Verify transport bytes, then rerun both frozen analyses; never run native games."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

root = Path(__file__).resolve().parent
repo = root.parents[2]
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
if (root/'final-identity.json').exists():
    for name, digest in load(root/'final-identity.json')['files'].items():
        assert sha(root/name) == digest, name
with tempfile.TemporaryDirectory(prefix='idlever-cut312-archive-') as td:
    dest = Path(td)
    proc = subprocess.Popen(['zstd', '-dc', str(root/'study.tar.zst')], stdout=subprocess.PIPE)
    with tarfile.open(fileobj=proc.stdout, mode='r|') as archive:
        for entry in archive:
            assert not entry.name.startswith('/') and '..' not in Path(entry.name).parts
            assert entry.isfile() or entry.isdir()
            p = dest/entry.name
            if entry.isdir():
                p.mkdir(parents=True, exist_ok=True)
            else:
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(archive.extractfile(entry).read())
    assert proc.wait() == 0
    actual = {str(p.relative_to(dest)): sha(p) for p in dest.rglob('*') if p.is_file()}
    assert actual == load(root/'raw-manifest.json')
    subprocess.run(['node', str(root/'analyze.mjs'), str(root/'spec.json'), str(dest), '32'], cwd=repo, check=True)
    subprocess.run(['python3', str(root/'verify.py'), str(dest)], cwd=repo, check=True)
    subprocess.run(['python3', str(root/'describe.py'), str(dest)], cwd=repo, check=True)
    print(json.dumps({'archive_transport':'PASS', 'files':len(actual), 'native_replays':0}))
