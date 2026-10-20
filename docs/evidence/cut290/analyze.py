from pathlib import Path
import collections
import json
root=Path('target/cut290');results=[];groups=[]
for scene in ['gas','pack']:
    for weapon in ['sword','bow']:
        for fire in [1,3]:
            label=f'{scene}-{weapon}-fire{fire}';reference=None
            for policy in ['baseline','gas0','gas1']:
                case='trace-'+label+'-'+policy;p=root/case;sent=json.loads((p/'send.json').read_text());r=sent['run'];controlled={k:r.get(k) for k in ['hero','floor','monsters','rng','seed','id','route']}
                if reference is None:reference=controlled
                assert controlled==reference,case
                frames=json.loads((p/'frames.json').read_text());first=[f for f in frames if f['before'] and f['before']['depth']==9];es=[e for f in first for e in f['events']];damage=collections.Counter();quotes=[]
                for f in first:
                    monsters={m['id']:m['kind'] for m in f['before']['monsters']}
                    for e in f['events']:
                        if e['k']=='hurt' and e.get('id')==1:damage[e['cause']]+=e['dmg']
                        if len(quotes)<3 and (e['k']=='use' or (e['k']=='attack' and e.get('src')==1 and monsters.get(e.get('dst')) in ['bloat','bloat_mother'])):quotes.append({'event':e,'target_kind':monsters.get(e.get('dst')),'before_hero':f['before']['hero']})
                summary=json.loads((p/'summary.json').read_text());hurt=sum(damage.values());gas=damage.get('gas',0)
                results.append({'case':case,'scene':scene,'weapon':weapon,'fire_stock':fire,'policy':policy,'first_floor_hurt':hurt,'first_floor_gas_hurt':gas,'first_floor_damage_by_cause':dict(damage),
                    'last_initial_floor_event_tick':max(e['t'] for e in es),'initial_weapon':r['hero']['weapon']['kind'],'initial_supplies':[i['kind'] for i in r['hero']['inv']],
                    'first_floor_fire_use_count':sum(e['k']=='use' and 'fire' in e.get('item','') for e in es),'quotes':quotes,'total_run':summary['last_run'],
                    'cut289_damage_target_only':hurt<=9 and gas<=3})
            groups.append({'group':label,'matched_initial_scene_and_hero':True})
output={'scope':'24 fixed earned departures; eight matched groups; no AI change','groups':groups,'cases':results}
(root/'results.json').write_text(json.dumps(output,indent=2)+'\n')
for c in results:print(c['scene'],c['weapon'],c['fire_stock'],c['policy'],'hurt',c['first_floor_hurt'],'gas',c['first_floor_gas_hurt'],'t',c['last_initial_floor_event_tick'],'target',c['cut289_damage_target_only'])
