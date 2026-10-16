"""Evidence-only independent batch accounting and per-run recorder verification."""
import pathlib,json,hashlib,collections,datetime
p=pathlib.Path(__file__).resolve().parent
load=lambda q:json.loads(q.read_text())
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
terminal=load(p/'terminal.json');assert terminal['exit_code']==1 and terminal['source_identity_unchanged']
for path,h in terminal['source_identity']['files'].items():assert sha(pathlib.Path(path))==h,path
assert sha(pathlib.Path('target/fast/examples/advanced_campaign'))==terminal['source_identity']['binary_sha256']
rows=[];branches=[];counter_anomalies=[]
for name,t in terminal['cases'].items():
 d=p/name/'campaign';s=load(d/'state.json');g=load(d/s['save']);o=s['observed'];cls=t['class'];seed=t['seed']
 assert t['source_identity_unchanged'] and s['fresh_origin'] and s['requested_s']<=336*3600
 assert g['lineage']['seed']==seed and g['lineage']['class']==cls and g['selected']==1 and not g['others']
 assert s['requested_s']==sum(x['requested_s']for x in s['checks'])
 assert s['steps']==len(s['checks'])
 assert len(list(d.glob('campaign-*.session.json')))==s['steps']+1
 assert len(list(d.glob('campaign-*.report.json')))==s['steps']
 for c in s['checks']:
  assert c['requested_s']<=c['nominal_quantum_s'] and c['shortened_final_sample']==(c['requested_s']<c['nominal_quantum_s'])
  rep=load(d/f"campaign-{c['step']:04}.report.json");assert not rep['sampled']
 row={'case':name,'exit_code':t['exit_code'],'requested_s':s['requested_s'],'clock_s':o['clock_s'],'steps':s['steps'],'stages':s['stages'],'last_observed':{k:o[k]for k in ['class','level','best','completed','deaths','gold','kit','persistent']},'actual_last_session_sha256':sha(d/s['save']),'paired':s['paired']}
 if t['exit_code']:
  assert not(d/'result.json').exists() and not s['paired']
  assert (p/name/'campaign.log').read_text().splitlines()[-1]=='Error: "Finish recovery"'
  assert g['lineage']['ended'] and g['run']is None
  remaining=o['persistent']['recovery_until_tick']-o['ticks'];assert remaining>0
  row.update({'status':'EXECUTION_REFUSED_INCOMPLETE_NOT_HORIZON_CENSOR','error':'Finish recovery','remaining_recovery_ticks_at_last_checkpoint':remaining,'precondition':'ended at home with positive actual persistent recovery; prepare calls public begin_descent before recovery wait'})
 else:
  r=load(d/'result.json');assert r==s and r['status']=='ALL_STAGES_OBSERVED' and len(r['stages'])==4 and not r['zero_defeat_all_stages']
  assert o['deaths']>0 and r['paired'];row['status']=r['status']
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
   for cap in end.get('live_capsule',{}).get('kills',[]):assert cap==load(b/f"send-{cap['id']:06}.capsule.json")
   branches.append({'case':name,'branch':label,'actual_run_ids':ids,'actual_class':cls,'actual_weapons':sorted(weapons),'class_skill_masks':sorted(masks),'events':events,'raw_owner_run_row_sums_exact':True,'complete_event_vector_equals_public_replay_native_assertion':True,'first_departure_observed_after_s':sent[0]['observed_after_requested_s'],'requested_s':28800,'gold_before':r['before']['gold'],'gold_after':r['after']['gold'],'runs':len(records),'deaths':sum(x['n']for x in report['deaths']),'max_actual_depth':max(x['depth']for x in records),'actual_record_gold_sum':sum(x['gold']for x in records),'remaining_points':r['after']['class_tree']['points']if 'class_tree'in r['after']else None})
 rows.append(row)
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_VERIFICATION_OF_RETAINED_MIXED_OUTCOMES_NOT_ACCEPTANCE','cases':rows,'branches':branches,'all_cases':len(rows),'all_stages':sum(x['exit_code']==0 for x in rows),'execution_refusals':sum(x['exit_code']!=0 for x in rows),'horizon_censored':0,'zero_lifetime_defeat_all_stages':0,'source_unchanged':True,'raw_fired_above_matched_anomalies':counter_anomalies,'limits':'No retry; seven public recovery refusals are incomplete, not336h censoring. Raw reasons are per-run reconstruction, not directly measured spent waste. No watched RNG comparison, all5 UI, recognition, fun or fullcontract acceptance.'}
(p/'verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k]for k in ['status','all_cases','all_stages','execution_refusals','horizon_censored','zero_lifetime_defeat_all_stages']}));print('reconstructions',sum(x['runs']for x in branches),'events',sum(x['events']for x in branches))
