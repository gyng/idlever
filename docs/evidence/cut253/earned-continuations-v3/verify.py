import pathlib,json,hashlib,collections,datetime
p=pathlib.Path(__file__).resolve().parent
load=lambda q:json.loads(q.read_text())
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
t=load(p/'terminal.json');assert t['source_identity_unchanged']
for q,h in t['source_identity']['files'].items():assert sha(pathlib.Path(q))==h
assert sha(pathlib.Path('target/fast/examples/advanced_campaign'))==t['source_identity']['binary_sha256']
rows=[];branches=[];counter_anomalies=[]
for name,z in t['cases'].items():
 d=p/name/'campaign';s=load(d/'state.json');pr=load(p/name/'parent-provenance.json');ps=load(pathlib.Path(pr['parent_session']).parent/'state.json');source=pathlib.Path(pr['parent_session']);original=load(source);o=s['observed'];cls=z['class'];seed=z['seed']
 assert z['source_identity_unchanged'] and z['parent_session_unchanged'] and sha(source)==pr['parent_session_sha256']
 assert(d/'original.session.json').read_bytes()==source.read_bytes() and(d/'campaign-0000.session.json').read_bytes()==source.read_bytes()
 assert s['fresh_origin']is False and pr['parent_fresh_origin']is True
 assert s['requested_s']<=pr['remaining_requested_s']==336*3600-ps['requested_s']
 assert s['requested_s']==sum(c['requested_s']for c in s['checks'])
 assert o['class']==cls and o['owner']==ps['observed']['owner']==1 and o['hero']==ps['observed']['hero'] and o['seed']==seed and o['deaths']>=ps['observed']['deaths']
 waits=[a for c in s['checks']for a in c['actions']if a['method']=='advance_ended_recovery'];assert waits
 for a in waits:
  w=a['detail'];assert w['elapsed_ms']==w['remaining_ticks_before']*100 and w['total_ticks_after']-w['total_ticks_before']==w['remaining_ticks_before'] and w['remaining_ticks_after']==0 and w['requested_absence_s_charged']==0
  assert a['gold_before']==a['gold_after']
 assert all(not load(d/f"campaign-{c['step']:04}.report.json")['sampled']for c in s['checks'])
 row={'case':name,'exit_code':z['exit_code'],'parent_requested_s':ps['requested_s'],'continuation_requested_s':s['requested_s'],'total_requested_s':ps['requested_s']+s['requested_s'],'remaining_requested_s':pr['remaining_requested_s'],'actual_start_clock_s':ps['observed']['clock_s'],'actual_final_clock_s':o['clock_s'],'actual_recovery_actions':waits,'local_fresh_origin':False,'parent_fresh_origin':True,'parent_defeats':ps['observed']['deaths'],'final_defeats':o['deaths'],'actual_final':{k:o[k]for k in ['class','owner','hero','level','best','completed','kit','gold']},'stages_local_observed':s['stages'],'parent_stages':ps['stages'],'paired':s['paired']}
 if z['exit_code']==0:
  r=load(d/'result.json');assert r==s and not r['zero_defeat_all_stages'];row['status']=r['status']
  if r['status']=='CENSORED':assert s['requested_s']==pr['remaining_requested_s']
 else:row['status']='EXECUTION_REFUSAL_INCOMPLETE';row['error']=(p/name/'campaign.log').read_text().splitlines()[-1]
 if s['paired']:
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
 rows.append(row)
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_VERIFICATION_OF_ACTUAL_LINKED_OUTCOMES','source_unchanged':True,'cases':rows,'branches':branches,'raw_fired_above_matched':counter_anomalies,'limits':'Requested horizons retain original336h cap; actual public recovery time is additional. No strictactualclock acceptance. Raw slot tallies grouped by capsule-start labels, not guaranteed immutable rules or spentwaste. Original refusal histories unchanged; all genuine past defeats retained; no newfresh/zero-defeat/wholecontract claim.'}
(p/'verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':out['status'],'cases':len(rows),'branches':len(branches),'runs':sum(b['runs']for b in branches),'events':sum(b['events']for b in branches)}))
