#!/usr/bin/env python3
"""Audit the published receipt and preserved bounded evidence; no simulations."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import tarfile
r=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest=json.loads((r/'manifest.json').read_text())
for name,digest in manifest.items():assert sha((r/name).read_bytes())==digest,name
receipt=json.loads((r/'deployment.json').read_text());commit=receipt['source']
assert commit=='510bd647c137447ca19c7ffcb9664c1dd340aeec'
assert receipt['pages']['conclusion']=='success'
for site in ['live-cf','live-pages']:
 s=json.loads((r/site/'smoke.json').read_text())
 assert s['pass'] and s['metadata']['commit']==commit
 assert not s['errors'] and not s['failedRequests'] and not s['httpErrors']
 assert s['engine']['kind']=='wasm'
 assert sha((r/site/'new-town.session.json').read_bytes())==s['saveSha256']
 assert s['metadataHeaders']['access-control-allow-origin']=='*'
assert json.loads((r/'live-pages/smoke.json').read_text())['metadata']['version']==receipt['tag']
for label in ['cf','pages']:
 producer=json.loads((r/('cf-artifact-manifest.json' if label=='cf' else 'pages-artifact-manifest.json')).read_text())
 entries=json.loads((r/f'live-{label}-files.json').read_text())
 for e in entries:assert producer[e['path']]==e['sha256'],e['path']
raw=subprocess.check_output(['zstd','-q','-d','-c',str(r/'wish-current-parity.tar.zst')])
with tarfile.open(fileobj=io.BytesIO(raw)) as t:
 captures={m.name:t.extractfile(m).read() for m in t.getmembers() if m.isfile()}
assert {n:sha(b) for n,b in captures.items()}==json.loads((r/'wish-capture-manifest.json').read_text())
cf=json.loads((r/'wish-parity-result.json').read_text());pages=json.loads((r/'wish-pages-parity-result.json').read_text())
assert cf['pass'] and pages['pass'] and cf['records']==pages['records']
assert len(cf['records'])==6
for record in cf['records']:assert record['sha256']==sha(captures['wish-current-parity/'+record['id']+'.json'])
client=json.loads((r/'client-final-summary.json').read_text())
assert (client['completed'],client['passing'],client['failing'])==(175,144,31)
print('PASS published source/tag, both live artifact+browser receipts, six native/WASM captures; client audit remains144/175pass,31fail')
