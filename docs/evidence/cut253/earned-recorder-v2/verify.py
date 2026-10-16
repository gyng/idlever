"""Read-only recorder oracle: exact old/current actual bytes and independent raw row sums."""
import pathlib,json,hashlib,collections
p=pathlib.Path(__file__).resolve().parent
old=pathlib.Path('docs/evidence/cut253/earned-pilot-seed1-fighter/campaign');new=p/'pilot/campaign'
load=lambda q:json.loads(q.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
terminal=load(p/'pilot/terminal.json');assert terminal['exit_code']==0
assert terminal['binary_sha256']==terminal['binary_sha256_after'] and terminal['example_sha256']==terminal['example_sha256_after']
actual_equal=[]
for q in sorted(old.rglob('*.json')):
 if q.name in ['state.json','result.json']or q.name=='first-slice-with-send-capsule.session.json':continue
 target=new/q.relative_to(old)
 assert target.exists(),str(target)
 assert q.read_bytes()==target.read_bytes(),'actual artifact bytes changed: '+str(q)
 actual_equal.append({'path':str(q.relative_to(old)),'sha256':sha(q.read_bytes()),'bytes':q.stat().st_size})
checkpoints=[x for x in actual_equal if x['path'].startswith('campaign-')and x['path'].endswith('.session.json')]
assert len(checkpoints)==31
reports=[x for x in actual_equal if x['path'].startswith('campaign-')and x['path'].endswith('.report.json')];assert len(reports)==30
before=load(old/'result.json');after=load(new/'result.json')
assert before['steps']==after['steps']==30 and before['requested_s']==after['requested_s']==806520
assert before['stages']==after['stages'] and before['observed']==after['observed']
assert after['observed']['deaths']==171 and after['status']=='ALL_STAGES_OBSERVED' and not after['zero_defeat_all_stages']
oldsrc=before['config']['identity']['sources'];newsrc=after['config']['identity']['sources'];assert oldsrc.keys()==newsrc.keys()
source_changes=sorted(k for k in oldsrc if oldsrc[k]!=newsrc[k]);assert source_changes==['crates/idlever-core/examples/advanced_campaign.rs']
for path,h in newsrc.items():assert sha(pathlib.Path(path).read_bytes())==h,path
frontier=load(new/'paired-frontier.session.json');frontier_id=max(x['id']for x in frontier['lineage']['run_log']);assert frontier_id==304
rows=[]
for branch,mask in [('no-selection',0),('parent-only',67),('selected',1091)]:
 d=new/'pair'/branch;r=load(d/'result.json');report=load(d/'report.json');sent=load(d/'departures.json');reasons=load(d/'branch-row-reasons.json');records=r['actual_runs'];ids=[x['id']for x in records]
 assert ids==list(range(305,305+len(ids))) and [x['run_id']for x in sent]==ids
 assert report['elapsed_s']==28800 and len(records)==report['runs'] and not report['sampled']
 end=load(d/'after.session.json');start=load(d/'prepared.session.json');assert end['lineage']['clock_s']-start['lineage']['clock_s']==28800
 assert start['lineage']['clock_s']==806520 and end['lineage']['clock_s']==835320
 first=load(d/'first-actual-departure.capsule.json');assert first==load(d/sent[0]['capsule']) and first['id']==ids[0]
 assert sent[0]['observed_after_requested_s']>60,'first minute is genuine recovery, not departure'
 expected={};events=0;row_records=0
 for item,rec in zip(sent,records):
  cap=load(d/item['capsule']);g=cap['game'];run=g['run'];assert cap['id']==rec['id']==run['id']
  assert run['turn']==0 and g['lineage']['bloodline_id']==item['owner']==1 and g['lineage']['seed']==1
  assert run['hero']['class']=='fighter' and run['hero']['weapon']['kind']=='sword' and run['hero'].get('class_skills',0)==mask
  assert not cap['inputs']
  assert item['observed_after_requested_s']%60==0 and 60<=item['observed_after_requested_s']<=28800
  diag=load(d/f"run-{rec['id']:06}.reconstruction.json");assert diag['owner']==1 and diag['run_id']==rec['id'] and diag['actual_record']==rec
  terminal_run=diag['terminal_run'];assert terminal_run['turn']==rec['turns'] and terminal_run['depth']==rec['depth'] and terminal_run['start']==rec['start'] and terminal_run['over']==rec['tier']
  assert diag['public_replay_events_exact'];events+=len(diag['events'])
  for index,(row,tally) in enumerate(diag['rows']):
   row_records+=1
   if index<len(diag['raw_row_tally']):assert tally==diag['raw_row_tally'][index]
   key=json.dumps([1,row],sort_keys=True,separators=(',',':'))
   v=expected.setdefault(key,{'owner':1,'row':row,'evaluated_run_ids':set(),'evaluations':0,'fired':0,'matched':0,'blocked_reasons':collections.Counter(),'unmet_conditions':collections.Counter(),'fired_on':collections.Counter()})
   if not tally['actions']:continue
   assert 0<=tally['fired']<=tally['matched']<=tally['actions']
   v['evaluated_run_ids'].add(rec['id']);v['evaluations']+=tally['actions'];v['fired']+=tally['fired'];v['matched']+=tally['matched']
   for src,dst in [('blocked','blocked_reasons'),('unmet','unmet_conditions'),('fired_on','fired_on')]:v[dst].update(tally.get(src,{}))
 actual={json.dumps([x['owner'],x['row']],sort_keys=True,separators=(',',':')):x for x in reasons['rows']}
 assert expected.keys()==actual.keys()
 for key,v in expected.items():
  v['evaluated_run_ids']=sorted(v['evaluated_run_ids'])
  for k in ['blocked_reasons','unmet_conditions','fired_on']:v[k]=dict(v[k])
  assert v==actual[key],key
  assert set(v['evaluated_run_ids'])<=set(ids)
 for cap in end['live_capsule']['kills']:assert cap==load(d/f"send-{cap['id']:06}.capsule.json"),'retained real capsule differs from archive'
 rows.append({'branch':branch,'actual_run_ids':ids,'actual_runs':len(ids),'deaths':sum(x['n']for x in report['deaths']),'clock_start':806520,'clock_end':835320,'first_actual_departure':sent[0],'complete_event_count':events,'per_run_row_records':row_records,'aggregate_row_keys':len(actual),'raw_row_sums_exact':True,'retained_actual_capsules_exact':True,'spent_waste':'Not measured; no aggregate invented.'})
o={'status':'PASS_EXACT_RECORDER_ONLY_EQUIVALENCE','all_existing_actual_artifacts_byte_equal':actual_equal,'campaign_checkpoint_sessions_equal':31,'campaign_reports_equal':30,'actual_sidecars_not_normalized':True,'only_source_identity_change':source_changes,'actual_stage_clocks_equal':after['stages'],'actual_171_defeats_preserved':True,'branches':rows,'proof_limits':'Actual old/new saves/reports byte equality and native complete-vector equality to public replay; per-run reason reconstruction is labelled. Not direct watched/raw-RNG capture or a spent-waste metric. One seed/class only, zero-defeat gate still fails.'};(p/'verification.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps({'status':o['status'],'actual_artifacts_exact':len(actual_equal),'checkpoint_sessions':31,'campaign_reports':30,'actual_run_reconstructions':sum(x['actual_runs']for x in rows),'events':sum(x['complete_event_count']for x in rows)}))
