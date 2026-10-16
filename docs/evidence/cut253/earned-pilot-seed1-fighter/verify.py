"""Independent read-only artifact checks; no native execution or save mutation."""
import collections, hashlib, json, pathlib
p=pathlib.Path(__file__).resolve().parent
load=lambda q:json.loads(q.read_text())
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
s=load(p/'campaign/result.json');terminal=load(p/'terminal.json')
assert terminal['exit_code']==0
assert terminal['binary_sha256']==terminal['binary_sha256_after']
assert terminal['example_sha256']==terminal['example_sha256_after']
assert s['status']=='ALL_STAGES_OBSERVED' and s['fresh_origin'] and not s['zero_defeat_all_stages']
assert s['requested_s']<=336*3600
assert s['requested_s']==sum(x['requested_s'] for x in s['checks'])
assert all(x['requested_s']<=x['nominal_quantum_s'] and x['shortened_final_sample']==(x['requested_s']<x['nominal_quantum_s']) for x in s['checks'])
source_checks=0
for name,digest in s['config']['identity']['sources'].items():
 assert sha(pathlib.Path(name))==digest,name
 source_checks+=1
stages=[]
for receipt,(level,depth,done) in zip(s['stages'],[(9,23,24),(10,28,32),(10,29,48),(10,33,64)]):
 d=load(p/'campaign'/receipt['save']);l=d['lineage']
 assert l['classes']['fighter']['level']>=level and l['best_depth']>=depth
 assert sum(l[k] for k in ['runs_banked','runs_returned','runs_died'])>=done
 assert any(x[0]=='scout' for x in l['tree']['hired'])
 assert l['runs_died']==receipt['lifetime_deaths']
 stages.append({**receipt,'level':l['classes']['fighter']['level'],'depth':l['best_depth'],'completed':sum(l[k]for k in ['runs_banked','runs_returned','runs_died'])})
rows=[]
for branch,mask in [('no-selection',0),('parent-only',67),('selected',1091)]:
 d=p/'campaign/pair'/branch
 before=load(d/'prepared.session.json');after=load(d/'after.session.json');report=load(d/'report.json');result=load(d/'result.json');receipts=load(d/'receipts.json')
 deaths=sum(x['n']for x in report['deaths'])
 assert not report['sampled'] and report['runs']==len(result['actual_runs'])==len(receipts)
 assert deaths==after['lineage']['runs_died']-before['lineage']['runs_died']
 assert len({x['run']['id']for x in receipts})==len(receipts)
 assert all(x['run']['turns']==x['replay_ticks'] and x['run'].get('sampled') is None for x in receipts)
 events=[e for x in receipts for e in x['interactions']]
 counts=collections.Counter((e['skill']['id'],e['phase'],e['effect'])for e in events)
 capsules=[]
 for cap in after['live_capsule']['kills']:
  h=cap['game']['run']['hero'];assert h['class']=='fighter' and h['weapon']['kind']=='sword'
  assert h.get('class_skills',0)==mask
  capsules.append({'id':cap['id'],'class':h['class'],'weapon':h['weapon']['kind'],'class_skills':h.get('class_skills',0),'turn':cap['game']['run']['turn']})
 assert capsules
 assert all(x['gold_before']==x['gold_after'] for x in load(d/'actions.json'))
 if branch=='selected':
  assert counts[('path:fighter_rally','applied','bash_cooldown')]>0
  assert counts[('path:fighter_holdfast','applied','melee_block')]>0
 if branch=='no-selection':assert not events
 assert all(e['amount']>0 for e in events if e['phase']=='applied')
 rows.append({'branch':branch,'runs':report['runs'],'depth':report['deepest'],'deaths':deaths,'banked':report['banked'],'returned':report['returned'],'actions':report['meters']['actions'],'seconds':report['meters']['seconds'],'gold':report['gold'],'receipt_counts':[{'skill':a,'phase':b,'effect':c,'n':n}for(a,b,c),n in sorted(counts.items())],'holdfast_actual_damage_prevented':sum(e['amount']for e in events if e['skill']['id']=='path:fighter_holdfast' and e['phase']=='applied'),'actual_retained_send_capsules':capsules,'row_why_scope':'cumulative; not a branch-only wasted-action measure'})
ref=load(p/'campaign/pair/parent-only/prepared.session.json')['lineage']['class_paths']['fighter']
sel=load(p/'campaign/pair/selected/prepared.session.json')['lineage']['class_paths']['fighter']
assert set(sel)-set(ref)=={'fighter_holdfast'} and set(ref)<=set(sel)
o={'status':'PASS_SCOPED_ARTIFACT_CHECKS','scope':'Independent JSON/hash arithmetic only; no native/browser rerun; not full Cut253 acceptance.','source_files_verified':source_checks,'stages':stages,'requested_horizon_s':336*3600,'actual_requested_s':s['requested_s'],'campaign_status':s['status'],'zero_defeat_gate':'FAIL:171 genuine lifetime defeats','paired':rows,'limitations':['All4 stages first observed at sampled check-ins; stages2/3/4 share a check-in, not separate exact crossing times.','Only seed1 Fighter ran; other4 classes, seeds3/5, zero-defeat survivor remain required.','first-slice-with-send-capsule files precede new departure due rest; their name overstates capture. Actual successor capsules above come from after-saves.','Named interaction events are reconstructed with exact actual-run tick checks, not independently captured watched events/full RNG equality.','row_why is cumulative, so branch wasted-action totals have not been isolated.','336h is a maximum; progression stops at all4 observed stages after224.0333h. No cap-extension/retry.']}
(p/'verification.json').write_text(json.dumps(o,indent=2)+'\n')
print(json.dumps({'status':o['status'],'source_files_verified':source_checks,'stages':len(stages),'pair_branches':len(rows),'zero_defeat_gate':o['zero_defeat_gate']}))
