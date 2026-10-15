#!/usr/bin/env python3
"""Build lossless small records and the exact scoped commit inventory; preserve all originals."""
import gzip, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
base=root/'docs/evidence/cut240'
raw_records=[
 'before/view2d.ts','before/town.ts','after/results.json','after/prepared-gl.session.json',
 'diagnostics/results.json','edge-events/results.json','camera-events/results.json',
 'candidate-first/results.json','candidate-first/view2d.ts',
 'diagnostics-first/results.json','diagnostics-partial-events/results.json','camera-events-first/results.json']
for name in raw_records:
 p=base/name
 with open(str(p)+'.gz','wb') as f:
  f.write(gzip.compress(p.read_bytes(),compresslevel=9,mtime=0))
curated=['web/src/render/view2d.ts','docs/CUT240_CANVAS_LIGHTING.md']
names=['README.md','summary.json','analyze.mjs','review.mjs','diagnostics.mjs','edge-events.mjs','camera-events.mjs','probe.js','curate.py',
 'gzip-reader-check.log','review.log','diagnostics.log','edge-events.log','camera-events.log','client-final-clock-ctxloss.log','tsc-final.log','format-final.log','lint-final.log',
 'diagnostics-first/diagnostics.log','camera-events-first/camera-events.log',
 'after/matched-night-400.jpg','after/matched-night-1440.jpg','after/canvas-review-sheet.jpg','camera-events/review-sheet.jpg','diagnostics/preferences-review.jpg']
names += [p+'.gz' for p in raw_records]
for width in [400,1440]:
 names += [f'after/{backend}-{width}-night.png' for backend in ['gl','canvas']]
 names += [f'after/canvas-{width}-night-same-frame-{mode}.png' for mode in ['before','after','unlit','ambient']]
for backend in ['gl','canvas']:
 names += [f'diagnostics/{backend}-material-{mode}.png' for mode in ['before','after','source']]
 names += [f'diagnostics/{backend}-diagnostic-walk-in-{i}.png' for i in [0,8]]
 names += [f'camera-events/{backend}-camera-{state}.png' for state in ['visible','clipped','outside']]
curated += [f'docs/evidence/cut240/{n}' for n in names]
curated += ['docs/evidence/cut240/commit-inventory.json']
assert len(curated)==len(set(curated))
for p in curated:
 if p.endswith('commit-inventory.json'):continue
 assert (root/p).is_file(),p
sha=lambda b:hashlib.sha256(b).hexdigest()
inventory=[]
for p in sorted(base.rglob('*')):
 if not p.is_file() or p.name=='commit-inventory.json':continue
 rel=str(p.relative_to(root));data=p.read_bytes()
 row={'path':rel,'bytes':len(data),'sha256':sha(data),'in_scoped_commit':rel in curated}
 if p.suffix=='.gz':
  decoded=gzip.decompress(data);row['uncompressed_bytes']=len(decoded);row['uncompressed_sha256']=sha(decoded)
 if not row['in_scoped_commit']:
  row['retained_local_scope']='Original/duplicate screenshot, uncompressed record, server transform/log or superseded candidate; preserved locally, deliberately outside scoped commit.'
 inventory.append(row)
for p in curated[:2]:
 data=(root/p).read_bytes();inventory.append({'path':p,'bytes':len(data),'sha256':sha(data),'in_scoped_commit':True})
out={'version':1,'scope':'Canvas town lighting repair only; no other cuts, HANDOFF/ledger root edits, tooling or art staged.',
 'committed_paths':sorted(curated),'committed_payload_bytes_excluding_manifest':sum(x['bytes'] for x in inventory if x['in_scoped_commit']),
 'retained_local_payload_bytes':sum(x['bytes'] for x in inventory if not x['in_scoped_commit']),
 'self_note':'This manifest excludes its own digest; git records its exact bytes. All other local Cut240 files present at curation are inventoried.',
 'records':'Lossless gzip copies preserve exact raw bytes; readers accept plain path or .gz sibling. Original uncompressed files remain local.',
 'image_scope':'Original matched Canvas night before/after/unlit/ambient buffers at400/1440 and GL reference scenes are committed. Other phase/candidate/server-image duplicates remain local with SHA inventory; raw numeric metrics for all16phase comparisons are committed.',
 'files':sorted(inventory,key=lambda x:x['path'])}
(base/'commit-inventory.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'paths':len(curated),'curated_bytes':out['committed_payload_bytes_excluding_manifest'],'retained_local_bytes':out['retained_local_payload_bytes']}))
