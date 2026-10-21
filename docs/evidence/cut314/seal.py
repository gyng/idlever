#!/usr/bin/env python3
"""Archive exact source/captures and hash every review artifact after checks finish."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import tarfile

r = Path('docs/evidence/cut314')
src = Path(Path('target/cut314/source-path.txt').read_text().strip())
def sha(data):
    return hashlib.sha256(data).hexdigest()
def archive(name, files):
    output = r/name
    assert not output.exists(), output
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw,mode='w') as t:
        for name,data in sorted(files.items()):
            item = tarfile.TarInfo(name)
            item.size = len(data)
            item.mode = 0o644
            item.mtime = 0
            t.addfile(item,io.BytesIO(data))
    output.write_bytes(subprocess.check_output(['zstd','-q','-c','-10'],input=raw.getvalue()))
    return {name:sha(data) for name,data in files.items()}
files = {}
for label,manifest,root in [('base','base-source.json',Path('.')),('derived','derived-source.json',src)]:
    for name,digest in json.loads((r/manifest).read_text()).items():
        data = (root/name).read_bytes()
        assert sha(data) == digest, name
        files[label+'/'+name] = data
archives = {'source.tar.zst':archive('source.tar.zst',files)}
fixtures = {name:Path(name).read_bytes() for name in json.loads((r/'test-fixtures.json').read_text())}
archives['test-fixtures.tar.zst'] = archive('test-fixtures.tar.zst', fixtures)
files = {'mechanics.json':Path('target/cut314/mechanics-final.json').read_bytes(),
         'input.json':Path('target/cut299/parent.json').read_bytes()}
for label,directory in [('shipping','shipping-replay'),('prototype','prototype-replay')]:
    for p in Path('target/cut314',directory).iterdir():
        assert p.is_file()
        files[label+'/'+p.name] = p.read_bytes()
for name in ['game.json','before.json','read.json','after.json','report.json','replays.json']:
    assert files['shipping/'+name] == files['prototype/'+name], name
archives['captures.tar.zst'] = archive('captures.tar.zst',files)
manifest = {'schema':1,'archives':archives,'artifacts':{}}
for p in r.rglob('*'):
    if p.is_file() and p.name not in ['manifest.json','archive-verification.log'] and '__pycache__' not in p.parts:
        manifest['artifacts'][str(p.relative_to(r))] = sha(p.read_bytes())
(r/'manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
print('Sealed', len(manifest['artifacts']), 'artifacts')
