import pathlib,json,hashlib,datetime
p=pathlib.Path(__file__).resolve().parent;load=lambda q:json.loads(q.read_text());sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest();s=load(p/'status.json');rows=[]
for cls in ['rogue','ranger','caster','gunner']:
 d=p/cls/'attempt-1';r=load(d/'results.json');assert r['status']=='PASS' and s['cases'][cls]['exit_code']==0 and len(r['cases'])==4
 assert r['sourceBefore']==r['sourceAfter'] and r['servedWasm'] and all(x['sha256']==r['wasmSha256']for x in r['servedWasm']) and not r['errors']
 original=load(pathlib.Path(r['input']));assert sha(pathlib.Path(r['input']))==r['inputSha256'];assert original['lineage']['class']==cls and original['selected']==1 and not original['others']
 saves=[]
 for c in r['cases']:
  assert c['status']=='PASS' and c['canonical']['nodes']and len(c['canonical']['nodes'])==12 and c['canonical']['budget']==10
  assert c['parentRefusal'] and c['cancelExact']and c['resetCancelExact'] and c['resetWholeSaveExact']and c['awayReadOnlyExact']
  assert c['learned']['spent']==len(r['chain']) and c['learned']['points']==10-len(r['chain'])
  assert c['documentOverflow']<=1 and all(t['h']>=44 and t['w']>=44 for t in c['targets'])
  assert c['edges']==sorted([[n['parent'],n['id']]for n in c['canonical']['nodes']if n['parent']is not None])
  if c['scale']==2:assert all(x>=1.95 for x in c['fontRatios'].values())
  assert c['sent']['class']==cls and c['sent']['mask']==r['expectedMask'] and all(c['awayRefusals'])
  for kind in ['learned','reset']:
   q=d/f"{kind}-{c['viewport']['width']}-{c['scale']}x.session.json";g=load(q)
   if kind=='reset':assert g==original
   else:
    original_copy=json.loads(json.dumps(original));g_copy=json.loads(json.dumps(g))
    for key in ['class_paths','sets']:original_copy['lineage'].pop(key,None);g_copy['lineage'].pop(key,None)
    assert g_copy==original_copy
   saves.append({'kind':kind,'path':str(q.relative_to(p)),'bytes':q.stat().st_size,'sha256':sha(q),'whole_reset_exact_original':kind=='reset'})
 assert r['fallback']['actualNetworkFailure']and r['fallback']['blockedRequests']>0 and r['fallback']['primitive']and r['fallback']['exactSave']
 rows.append({'class':cls,'input':r['input'],'inputSha256':r['inputSha256'],'chain':r['chain'],'mask':r['expectedMask'],'layouts':4,'all8saved_learned_reset_checks_exact':True,'saves':saves,'servedWasmResponses':len(r['servedWasm']),'actual_sent_weapons':sorted({c['sent']['weapon']for c in r['cases']}),'defeats_at_input':original['lineage']['runs_died'],'owner':original['selected'],'sourceBefore_equalsAfter':True})
o={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_FOUR_GENUINE_CLASS_UI_JOURNEYS','classes':rows,'layouts':16,'whole_reset_saves_exact_original':16,'learned_save_allowed_fields_only':16,'limits':'One genuine seed1owner perclass; four original journeys+separateFighter. Native effectpayoffs/fun/playerfeedback/Safari/GPUcost/contrast are not certified. Actual sent weapon retained, not forced.'};(p/'verification.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps({k:o[k]for k in ['status','layouts','whole_reset_saves_exact_original','learned_save_allowed_fields_only']}))
