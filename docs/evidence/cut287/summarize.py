"""First-floor measurements remain separate from later total-run consequences."""
from pathlib import Path
import collections
import json
root=Path('target/cut287');selection=json.loads(Path('docs/evidence/cut287/frozen-selection.json').read_text());scenes=[]
for chosen in selection['selected']:
    start=chosen['start'];prefix=chosen['case'].removesuffix('-baseline');cases=[]
    for card in ['baseline',*{9:['gas_step','pack_break'],14:['boss_focus','corridor_fighting'],19:['reflect_read','corridor_fighting']}[start]]:
        name=prefix+'-'+card;p=root/name
        if not (p/'after.json').exists():raise RuntimeError('Incomplete case: '+name)
        frames=json.loads((p/'frames.json').read_text());first=[f for f in frames if f['before'] and f['before']['depth']==start]
        es=[e for f in first for e in f['events']];damage=collections.Counter();actions=collections.Counter();quotes=[]
        for f in first:
            kinds={m['id']:m['kind'] for m in f['before']['monsters']}
            tactic=[e for e in f['events'] if e.get('k')=='rule' and e.get('verb',{}).get('v')=='tactic']
            for e in f['events']:
                if e.get('k')=='hurt' and e.get('id')==1:damage[e.get('cause','unknown')]+=e.get('dmg',0)
                if e.get('k')=='rule':actions[e.get('verb',{}).get('v','?')+':'+e.get('verb',{}).get('a','')]+=1
                if tactic and e.get('k')=='attack' and e.get('src')==1 and len(quotes)<3:
                    quotes.append({'tactic_rule':tactic[0],'attack':e,'target_kind':kinds.get(e.get('dst')),'tick_boundary_hero_position':f['before']['hero']})
        summary=json.loads((p/'summary.json').read_text());exit_events=[e for e in json.loads((p/'events.json').read_text()) if e.get('k')=='exit']
        line=exit_events[-1]['line']
        cases.append({'case':name,'choice':card,'first_floor':{'last_event_tick':max(e['t'] for e in es),'hero_damage':dict(damage),
            'drain_max_hp_lost':-sum(e.get('delta',0) for e in es if e.get('k')=='max_hp' and e.get('cause')=='drain'),
            'reflection_attacks_at_hero':sum(e.get('k')=='attack' and e.get('verb')=='reflect' and e.get('dst')==1 for e in es),
            'support_armours_callouts':sum(e.get('k')=='callout' and e.get('text')=='armours' for e in es),
            'spectral_blade_spawns':sum(e.get('k')=='spawn' and e.get('e',{}).get('kind')=='spectral_blade' for e in es),
            'rule_counts':dict(actions),'action_quotes':quotes},
            'total_run':summary['last_run'],'total_run_exit':{k:line.get(k) for k in ['carried','kept','secured','lost','reached','reason','tier']}})
    scenes.append({'category':chosen['category'],'eligibility_quote':chosen['eligible'][chosen['category']],'cases':cases})
output={'scope':'5 starting-floor scenes; later run results are separate; reflection missing','scenes':scenes}
(root/'paired-summary.json').write_text(json.dumps(output,indent=2)+'\n')
for scene in scenes:
 print(scene['category'])
 for c in scene['cases']:
  f=c['first_floor'];print(c['choice'],'damage',sum(f['hero_damage'].values()),'gas',f['hero_damage'].get('gas',0),'drain',f['drain_max_hp_lost'],'summons',f['spectral_blade_spawns'],'support',f['support_armours_callouts'],'ticks',f['last_event_tick'])
