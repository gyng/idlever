#!/usr/bin/env python3
"""Reconstruct archived identity and benchmark arithmetic; no file rehash/rebenchmark."""
import gzip
import hashlib
import json
from pathlib import Path
import statistics
r=Path('docs/evidence/cut303');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();load=lambda p:json.loads(p.read_text())
if (r/'identity.json').exists():
 for p,h in load(r/'identity.json')['files'].items():assert sha(Path(p))==h,p
for p,h in load(r/'implementation-identity.json').items():assert sha(Path(p))==h,p
b=load(r/'validation/matched-benchmark-final.json')
assert sha(r/'baseline-run-state.mjs')==b['baseline_source_sha256']
cache=json.loads(gzip.decompress((r/'benchmark-cache.json.gz').read_bytes()))
serialized=json.dumps(cache['entries'],ensure_ascii=False,separators=(',',':')).encode()
assert hashlib.sha256(serialized).hexdigest()==cache['checksum']
paths=gzip.decompress((r/'untracked-paths.zlist.gz').read_bytes()).decode().split('\0');paths=[p for p in paths if p]
assert len(paths)==len(set(paths))==b['coverage']['untracked_files']==19204
assert set(paths)==set(cache['entries'])
h=hashlib.sha256();h.update(b'idlever-client-identity-v2');h.update(gzip.decompress((r/'benchmark-tracked.diff.gz').read_bytes()))
count=0;bytesread=0;directorylinks=0
for p in sorted(paths,key=lambda s:s.encode('utf-16-be')):
 entry=cache['entries'][p];assert len(entry['digest'])==64
 h.update(('\0'+p+'\0').encode());h.update(entry['digest'].encode())
 pieces=entry['key'].split(':')
 if pieces[0]=='directory-link':directorylinks+=1;assert len(pieces)==7;bytesread+=int(pieces[4])
 else:assert len(pieces)==6;bytesread+=int(pieces[3])
 count+=1
assert h.hexdigest()==b['cold']['identity']['dirtyHash']
assert directorylinks==28
assert b['cold']['stats']['contentBytesRead']==bytesread
assert b['cold']['stats']['filesRead']==count and b['cold']['stats']['cacheHits']==0
assert all(x['identity']==b['legacy'][0]['identity']for x in b['legacy'])
for x in b['warm']:
 assert x['identity']==b['cold']['identity']
 assert x['stats']['untrackedFiles']==x['stats']['cacheHits']==count
 assert x['stats']['filesRead']==x['stats']['contentBytesRead']==0
 assert x['stats']['wasmBytesRead']==7111856
legacy=statistics.median(x['ms']for x in b['legacy']);warm=statistics.median(x['ms']for x in b['warm']);reduction=1-warm/legacy
assert legacy==b['median_legacy_ms']and warm==b['median_warm_ms']and abs(reduction-b['reduction'])<1e-12
assert reduction>=.75
for name,passed,failed in [('tests-accepted.log',13,0),('legacy-red.log',3,1)]:
 text=(r/'validation'/name).read_text();assert f'# pass {passed}\n'in text and f'# fail {failed}\n'in text
assert 'same-size large untracked edit refuses earlier runner passes'in(r/'validation/legacy-red.log').read_text()
assert 'not ok 3 - same-size large untracked edit refuses earlier runner passes'in(r/'validation/legacy-red.log').read_text()
print(json.dumps({'status':'PASS_ARCHIVED_IDENTITY_AND_BENCHMARK','covered_paths':count,'directory_links':directorylinks,'cold_untracked_bytes':bytesread,'legacy_median_ms':legacy,'warm_median_ms':warm,'warm_reduction':reduction,'current_tests_pass':13,'legacy_controls_pass':3,'legacy_expected_failures':1,'scope':'One checkout performance and runner correctness; no game acceptance'}))
