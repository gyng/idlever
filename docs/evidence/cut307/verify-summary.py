#!/usr/bin/env python3
"""Audit remaining descriptive summaries against hash-checked local raw files.

verify.py proves the archive and full legal mutations. This smaller check avoids
repeating that full corpus audit while finalizing metadata and descriptions.
"""
import hashlib
import json
from pathlib import Path

r=Path('docs/evidence/cut307');root=Path('target/cut307')
load=lambda p:json.loads(p.read_text())
manifest=load(r/'raw-manifest.json');summary=load(r/'summary.json')
def raw(p):
    p=Path(p);data=(root/p).read_bytes();assert hashlib.sha256(data).hexdigest()==manifest[str(p)],p
    return json.loads(data)
def difference(a,b):
    return {'wealth':a['gold']+a['town']['bank']-b['gold']-b['town']['bank'],
            'available_legacy':a['bloodline']['points']-b['bloodline']['points'],
            'rations':a['feats'].get('rations',0)-b['feats'].get('rations',0),
            'tithes':a['feats'].get('tithed',0)-b['feats'].get('tithed',0),
            'best':a['best_depth']-b['best_depth']}
for case in summary['earliest']:
    parent=Path('earliest')/case['label'];role=case['role']
    a,b=[raw(parent/p/'after.json')['lineage']for p in(role,'unchanged')]
    assert case['endpoint_difference']==difference(a,b)
    for key,name in [('baseline','unchanged'),('treatment',role)]:
        initial=raw(parent/name/'canonical.json')['lineage'];result=raw(parent/name/'result.json')
        for depth in (28,33):
            hits=[q['clock_s']-initial['clock_s']for q in result['runs']if q['depth']>=depth]
            observed=0 if initial['best_depth']>=depth else min(hits)if hits else None
            assert case['milestone_seconds_after_camp'][key][str(depth)]==observed
for case in summary['saving']:
    parent=Path('saving')/case['label']
    a,b=[raw(parent/p/'after.json')['lineage']for p in('town-first','unchanged')]
    assert case['endpoint_difference']==difference(a,b)
    assert case['king_slain']==('mirror_king'in a['kills'])and case['baseline_king_slain']==('mirror_king'in b['kills'])
    receipt=raw(parent/'town-first/result.json')
    assert [tuple(p[k]for k in('id','level','price','checkin','clock_s','town_day'))for p in case['purchases']]==[
        (p['id'],p['offer']['level'],p['offer']['price'],p['checkin'],p['clock_s'],p['town_day'])for p in receipt['purchases']]
checks=load(r/'profile-checks.json')
assert len(checks)==8 and all(x['status']!=0 and x['no_output']for x in checks[:6])
for x in checks[6:]:
    assert x['status']==0 and x['receipt']['profile']==load(r/(x['case']+'.json'))
    assert x['receipt']['failed_parse_untouched']and x['receipt']['reconfiguration_rejected']
old=load(Path('docs/evidence/cut306/raw-manifest.json'))
for c in load(r/'camps.json')['camps']:assert c['sha256']==old[str(Path(c['input']).relative_to('target/cut306'))]
print('Hash-checked summaries, actual milestone/wallet/Legacy/King tradeoffs, profiles and old input bindings agree.')
