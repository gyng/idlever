"""Reconstruct outcome/action tables from actual receipts, not summary flags."""
from pathlib import Path
from collections import Counter
import json
root=Path('target/cut293');out=Path('docs/evidence/cut293');selection=json.loads((out/'selection.json').read_text());rows=[];quotes=[]
for cls,weapon,policy in selection['cases']:
 label='-'.join([cls,weapon,policy]);dirname=label+('-correct-api' if cls=='gunner' else '');r=root/dirname
 load=lambda n:json.loads((r/(n+'.json')).read_bytes())
 ev=load('events');assert ev==load('events-coarse');assert (r/'after-fine.json').read_bytes()==(r/'after-coarse.json').read_bytes()
 assert load('absence-report')==load('absence-repeat-report');assert (r/'absence-after.json').read_bytes()==(r/'absence-repeat-after.json').read_bytes()
 sent=load('sent');after=load('absence-after');report=load('absence-report');last=load('after-fine')['lineage']['last_run']
 assert after['lineage']['clock_s']-sent['lineage']['clock_s']==report['elapsed_s']==28800
 gold=report['gold'];assert after['lineage']['gold']-sent['lineage']['gold']==gold['net']==gold['ledger']['net']==gold['ledger']['earned']-gold['ledger']['spent']
 rule=Counter(e['verb']['v'] for e in ev if e['k']=='rule');attack=Counter(e.get('verb','attack') for e in ev if e['k']=='attack' and e['src']==1)
 class_verbs={'fighter':{'cleave','shield_bash','second_wind'},'rogue':{'vanish','throw','backstab','smoke','ambush'},'ranger':{'shoot','volley','kite','mark'},'caster':{'bolt','ward','blink','slow','nova','drain'},'gunner':{'fire','reload'}}[cls]
 actual={k:rule[k] for k in sorted(class_verbs) if rule[k]};aq={k:attack[k] for k in sorted(class_verbs) if attack[k]}
 replay=load('replay');replay_events=[e for f in replay['floors'] for e in f['events']]
 exit_at=next(i for i,e in enumerate(ev) if e['k']=='exit'); replay_exit=next(i for i,e in enumerate(replay_events) if e['k']=='exit');assert exit_at==replay_exit and ev[:exit_at]==replay_events[:replay_exit]
 row={'case':label,'dir':dirname,'class_level':load('initial-run')['hero']['level'],'class_rows_fired':actual,'hero_attack_verbs':dict(attack),'class_attack_verbs':aq,'exit':last['tier'],'cause':last.get('cause'),'depth':last['depth'],'ticks':last['turns'],'hurt':sum(e['dmg'] for e in ev if e['k']=='hurt' and e.get('id')==1),'away_deepest':report['deepest'],'net_gold':gold['net'],'gold_lost':gold.get('lost',0),'gold_spent_by_workers':gold.get('spent_by_workers',0),'actual_runs':report['runs'],'class_ladder_verb_observed':bool(actual or aq),'replay_ticks':replay['ticks'],'public_replay_events_match_watched':ev==replay_events,'pre_exit_events_exact':True,'pre_exit_event_count':exit_at,'events':len(ev)}
 rows.append(row)
 for verb in sorted(set(attack)|set(actual)):
  event=next((e for e in ev if e['k']=='attack' and e.get('src')==1 and e.get('verb','attack')==verb),None)
  if event is None:event=next(e for e in ev if e['k']=='rule' and e['verb']['v']==verb)
  quotes.append({'case':label,'verb':verb,'actual_event':event})
(out/'results.json').write_text(json.dumps(rows,indent=2)+'\n');(out/'actual-event-quotes.json').write_text(json.dumps(quotes,indent=2)+'\n')
header='| Case | Level | Ladder rows / attacks | Exit/depth | Ticks | Hurt | 8h net Gold | Lost |\n|---|---:|---|---|---:|---:|---:|---:|\n'
text=header+'\n'.join('| '+r['case']+' | '+str(r['class_level'])+' | '+(', '.join(k+':'+str(v) for k,v in r['class_rows_fired'].items()) or 'none')+' / '+(', '.join(k+':'+str(v) for k,v in r['class_attack_verbs'].items()) or 'none')+' | '+r['exit']+'/D'+str(r['depth'])+' | '+str(r['ticks'])+' | '+str(r['hurt'])+' | '+str(r['net_gold'])+' | '+str(r['gold_lost'])+' |' for r in rows)+'\n'
(out/'results.md').write_text(text);print(text)
