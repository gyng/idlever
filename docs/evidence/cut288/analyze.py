from pathlib import Path
import collections
import hashlib
import json
root=Path('target/cut288');results=[]
for scene,start in [('summoner',14),('reflection',19)]:
    reference=None
    arms=['enabled-baseline','revoked-baseline',('revoked-boss_focus' if scene=='summoner' else 'revoked-reflect_read'),'revoked-corridor_fighting']
    if scene=='reflection':arms+=['enabled-reflect_read','enabled-corridor_fighting']
    for arm in arms:
        p=root/f'trace-{scene}-{arm}';send=json.loads((p/'send.json').read_text());r=send['run']
        controlled={k:r.get(k) for k in ['hero','floor','monsters','rng','seed','id','route']}
        if reference is None:reference=controlled
        assert reference==controlled,p
        fs=json.loads((p/'frames.json').read_text());es=[e for f in fs if f['before'] and f['before']['depth']==start for e in f['events']]
        damage=collections.Counter();rules=collections.Counter();quotes=[]
        for e in es:
            if e['k']=='hurt' and e['id']==1:damage[e['cause']]+=e['dmg']
            if e['k']=='rule':rules[e['text']]+=1
            if (e['k']=='rule' and (e.get('verb',{}).get('a') in ['tag:summoned','reflect_read'])) or (e['k']=='attack' and e.get('verb')=='reflect' and e.get('dst')==1):
                if len(quotes)<6:quotes.append(e)
        summoned_ids={e['e']['id'] for e in es if e['k']=='spawn' and e.get('e',{}).get('kind')=='spectral_blade'}
        physical=[e for e in es if e['k']!='rule']
        combat=[e for e in es if e['k'] in ['move','attack','hurt','heal','max_hp','spawn','die','overlay','projectile','use']]
        results.append({'scene':scene,'arm':arm,'same_initial_scene_and_hero':True,'first_floor':{
            'hurt_damage':dict(damage),'total_hurt_damage':sum(damage.values()),'last_event_tick':max(e['t'] for e in es),
            'reflection_hits_at_hero':sum(e['k']=='attack' and e.get('verb')=='reflect' and e.get('dst')==1 for e in es),
            'summoned_attacks':sum(e['k']=='attack' and e.get('dst')==1 and e.get('src') in summoned_ids for e in es) if scene=='summoner' else None,
            'non_rule_event_sha256':hashlib.sha256(json.dumps(physical,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
            'combat_event_sha256':hashlib.sha256(json.dumps(combat,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
            'send_purse_gold':send['lineage']['gold'],
            'rule_counts':dict(rules),'quotes':quotes},'total_run':json.loads((p/'summary.json').read_text())['last_run']})
(root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:
 f=r['first_floor'];print(r['scene'],r['arm'],'hurt',f['total_hurt_damage'],'reflect',f['reflection_hits_at_hero'],'ticks',f['last_event_tick'],'physical',f['combat_event_sha256'][:12])
