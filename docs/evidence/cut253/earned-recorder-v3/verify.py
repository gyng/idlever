import pathlib,json,hashlib,collections,datetime
p=pathlib.Path(__file__).resolve().parent
load=lambda q:json.loads(q.read_text())
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
run=p/'fighter5-continuation';d=run/'campaign';t=load(run/'terminal.json');r=load(d/'result.json');s=load(d/'state.json');parent=p.parent/'earned-cohorts-v2/fighter-seed5/campaign';ps=load(parent/'state.json');source=parent/ps['save'];g=load(source)
assert t['exit_code']==0 and t['source_identity_unchanged'] and t['parent_session_unchanged']
assert (d/'original.session.json').read_bytes()==source.read_bytes() and(d/'campaign-0000.session.json').read_bytes()==source.read_bytes()
assert sha(source)==t['parent_session_sha256'] and ps['requested_s']+r['requested_s']==336*3600
assert r==s and r['fresh_origin']is False and r['status']=='ALL_STAGES_OBSERVED' and not r['zero_defeat_all_stages']
assert r['requested_s']==86280 and r['steps']==3 and r['paired'] and r['observed']['deaths']==475>=ps['observed']['deaths']==456
assert r['observed']['hero']==ps['observed']['hero']=='Corin Ash' and r['observed']['owner']==ps['observed']['owner']==1 and r['observed']['class']=='fighter'
waits=[a for c in r['checks']for a in c['actions']if a['method']=='advance_ended_recovery'];assert len(waits)==1
w=waits[0]['detail'];assert w['remaining_ticks_before']==449 and w['elapsed_ms']==44900 and w['total_ticks_after']-w['total_ticks_before']==449 and w['remaining_ticks_after']==0 and w['requested_absence_s_charged']==0
assert waits[0]['gold_before']==waits[0]['gold_after']==2850
assert r['checks'][0]['actions'][0]['method']=='advance_ended_recovery' and r['checks'][0]['actions'][1]['method']=='begin_descent'
assert r['checks'][-1]['requested_s']==28680 and r['checks'][-1]['shortened_final_sample']
assert r['observed']['clock_s']==1209644 and r['observed']['clock_s']-ps['observed']['clock_s']==86280+44
frozen=load(p.parent/'earned-cohorts-v2/terminal.json')['source_identity']['files'];changes=[q for q,h in frozen.items()if sha(pathlib.Path(q))!=h];assert sorted(changes)==['crates/idlever-core/examples/advanced_campaign.rs','docs/evidence/cut253/earned-preparation/protocol.md']
for q,h in t['identity']['files'].items():assert sha(pathlib.Path(q))==h
for c in r['checks']:assert not load(d/f"campaign-{c['step']:04}.report.json")['sampled']
branches=[];counter_anomalies=[];name='fighter-seed5-continuation';cls='fighter';seed=5
frontier=load(d/'paired-frontier.session.json');fid=max(x['id']for x in frontier['lineage']['run_log'])
for label in ['no-selection','parent-only','selected']:
 b=d/'pair'/label;r=load(b/'result.json');report=load(b/'report.json');sent=load(b/'departures.json');reasons=load(b/'branch-row-reasons.json');records=r['actual_runs'];ids=[x['id']for x in records]
 assert ids==list(range(fid+1,fid+1+len(ids))) and [x['run_id']for x in sent]==ids
 assert report['elapsed_s']==28800 and not report['sampled'] and len(records)==report['runs']
 start=load(b/'prepared.session.json');end=load(b/'after.session.json');assert end['lineage']['clock_s']-start['lineage']['clock_s']==28800
 actions=load(b/'actions.json');expected_chain=[]if label=='no-selection'else r['chain'][:-1]if label=='parent-only'else r['chain']
 assert [x['detail']['id']for x in actions]==expected_chain
 assert load(b/'first-actual-departure.capsule.json')==load(b/sent[0]['capsule'])
 expected={};events=0;weapons=set();masks=set()
 for item,rec in zip(sent,records):
  cap=load(b/item['capsule']);game=cap['game'];run=game['run'];hero=run['hero'];weapons.add(hero['weapon']['kind']);masks.add(hero.get('class_skills',0))
  assert cap['id']==rec['id']==run['id'] and run['turn']==0 and not cap['inputs']
  assert game['lineage']['seed']==seed and game['lineage']['bloodline_id']==item['owner']==1 and hero['class']==cls
  assert item['observed_after_requested_s']%60==0 and 60<=item['observed_after_requested_s']<=28800
  diag=load(b/f"run-{rec['id']:06}.reconstruction.json");assert diag['owner']==1 and diag['run_id']==rec['id'] and diag['actual_record']==rec
  tr=diag['terminal_run'];assert tr['turn']==rec['turns'] and tr['depth']==rec['depth'] and tr['start']==rec['start'] and tr['over']==rec['tier']
  assert diag['public_replay_events_exact'];events+=len(diag['events'])
  for index,(rule,tally)in enumerate(diag['rows']):
   if index<len(diag['raw_row_tally']):assert tally==diag['raw_row_tally'][index]
   key=json.dumps([1,rule],sort_keys=True,separators=(',',':'))
   v=expected.setdefault(key,{'owner':1,'row':rule,'evaluated_run_ids':set(),'evaluations':0,'fired':0,'matched':0,'blocked_reasons':collections.Counter(),'unmet_conditions':collections.Counter(),'fired_on':collections.Counter()})
   if not tally['actions']:continue
   assert 0<=tally['fired']<=tally['actions'] and 0<=tally['matched']<=tally['actions']
   if tally['fired']>tally['matched']:counter_anomalies.append({'case':name,'branch':label,'run_id':rec['id'],'row_index':index,'row':rule,'raw_tally':tally})
   v['evaluated_run_ids'].add(rec['id']);v['evaluations']+=tally['actions'];v['fired']+=tally['fired'];v['matched']+=tally['matched']
   for a,z in [('blocked','blocked_reasons'),('unmet','unmet_conditions'),('fired_on','fired_on')]:v[z].update(tally.get(a,{}))
 actual={json.dumps([x['owner'],x['row']],sort_keys=True,separators=(',',':')):x for x in reasons['rows']};assert expected.keys()==actual.keys()
 for key,v in expected.items():
  v['evaluated_run_ids']=sorted(v['evaluated_run_ids'])
  for k in ['blocked_reasons','unmet_conditions','fired_on']:v[k]=dict(v[k])
  assert v==actual[key]
 for cap in end.get('live_capsule',{}).get('kills',[]):
  if cap['id']>fid:assert cap==load(b/f"send-{cap['id']:06}.capsule.json")
  else:assert cap in start.get('live_capsule',{}).get('kills',[]),'preexisting retained capsule changed'
 branches.append({'case':name,'branch':label,'actual_run_ids':ids,'actual_class':cls,'actual_weapons':sorted(weapons),'class_skill_masks':sorted(masks),'events':events,'raw_owner_run_row_sums_exact':True,'complete_event_vector_equals_public_replay_native_assertion':True,'first_departure_observed_after_s':sent[0]['observed_after_requested_s'],'requested_s':28800,'gold_before':r['before']['gold'],'gold_after':r['after']['gold'],'runs':len(records),'deaths':sum(x['n']for x in report['deaths']),'max_actual_depth':max(x['depth']for x in records),'actual_record_gold_sum':sum(x['gold']for x in records),'remaining_points':r['after']['class_tree']['points']if 'class_tree'in r['after']else None})
o={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_LAWFUL_LINKED_CONTINUATION','actual_parent_checkpoint_bytes_exact':True,'local_fresh_origin':False,'parent_fresh_origin':ps['fresh_origin'],'parent_lifetime_defeats':456,'final_lifetime_defeats':475,'original_total_requested_s':ps['requested_s']+s['requested_s'],'continuation_requested_s':86280,'final_shortened_sample_s':28680,'actual_recovery':waits,'final_clock_s':1209644,'only_changed_scope':changes,'branches':branches,'raw_counter_anomalies':counter_anomalies,'limits':'One lawful continuation; zero-defeat remains false. Parent original refusal preserved. Raw slot labels/groupings are not independently proven immutable per-rule identity; no spentwaste claim.'}
(p/'verification.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps({'status':o['status'],'branches':len(branches),'runs':sum(x['runs']for x in branches),'events':sum(x['events']for x in branches)}))
