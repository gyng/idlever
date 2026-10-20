"""Frozen first-floor eligibility; no alternative outcomes are read."""
from pathlib import Path
import hashlib
import json

root=Path('target/cut287')
candidates=[]
for depth,categories in [(9,['gas','pack']),(14,['drain','summoner']),(19,['reflection','support'])]:
    for attempt in range(1,4):
        for seed in [1,2]:
            case=root/f'trace-s{seed}-d{depth}-a{attempt}-baseline'
            if not (case/'after.json').exists():raise RuntimeError('Incomplete bounded discovery: '+str(case))
            frames=json.loads((case/'frames.json').read_text())
            quotes={}
            floor_gas_foe=any(m['kind'] in ['bloat','bloat_mother'] and not m['ally'] and not m['neutral'] for f in frames if f['before'] and f['before']['depth']==depth for m in f['before']['monsters'])
            for f in frames:
                b=f['before']
                if not b or b['depth']!=depth:continue
                foes=[m for m in b['monsters'] if m['hp']>0 and not m['ally'] and not m['neutral']]
                gas_foe=any(m['kind'] in ['bloat','bloat_mother'] for m in foes)
                conjurer=any(m['kind']=='goblin_conjurer' for m in foes)
                smith=any(m['kind']=='smith' for m in foes)
                pack=[m for m in foes if m['kind'] in ['jackal','ghoul'] and max(abs(m['pos']['x']-b['hero']['x']),abs(m['pos']['y']-b['hero']['y']))<=6]
                for e in f['events']:
                    checks={
                        'gas':(e.get('k')=='overlay' and e.get('ov')=='gas' and gas_foe) or (e.get('k')=='hurt' and e.get('id')==1 and e.get('cause')=='gas' and e.get('dmg',0)>0 and floor_gas_foe),
                        'pack':len(pack)>=2 and e.get('k')=='attack' and e.get('src') in [m['id'] for m in pack],
                        'drain':e.get('k')=='max_hp' and e.get('cause')=='drain' and e.get('delta',0)<0,
                        'summoner':conjurer and e.get('k')=='spawn' and e.get('e',{}).get('kind')=='spectral_blade',
                        'reflection':e.get('k')=='attack' and e.get('verb')=='reflect' and e.get('dst')==1,
                        'support':smith and e.get('k')=='callout' and e.get('text')=='armours'}
                    for category in categories:
                        if checks[category]:quotes.setdefault(category,{'turn':e.get('t'),'event':e})
            candidates.append({'seed':seed,'start':depth,'attempt':attempt,'case':case.name,'eligible':quotes})
selected=[];missing=[]
for depth,categories in [(9,['gas','pack']),(14,['drain','summoner']),(19,['reflection','support'])]:
    used=set()
    for category in categories:
        eligible=[c for c in candidates if c['start']==depth and category in c['eligible'] and c['case'] not in used]
        if eligible:
            c=eligible[0];used.add(c['case']);selected.append({'category':category,**c,'parent_sha256':hashlib.sha256((root/c['case']/'normalized-input.json').read_bytes()).hexdigest()})
        else:missing.append(category)
output={'candidates':candidates,'selected':selected,'missing':missing,'selection_reads':'18 baseline traces only; no alternate results','counts':{category:sum(category in c['eligible'] for c in candidates if c['start']==depth) for depth,categories in [(9,['gas','pack']),(14,['drain','summoner']),(19,['reflection','support'])] for category in categories}}
path=root/'selection.json'
with path.open('x') as f:json.dump(output,f,indent=2);f.write('\n')
print(json.dumps({'counts':output['counts'],'selected':[(c['category'],c['case']) for c in selected],'missing':missing},indent=2))
