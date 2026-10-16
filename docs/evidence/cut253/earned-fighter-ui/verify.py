"""Independent saved-evidence checks. No browser/native run or source mutation."""
import pathlib,json,hashlib,struct
p=pathlib.Path(__file__).resolve().parent
load=lambda x:json.loads(x.read_text())
sha=lambda x:hashlib.sha256(x.read_bytes()).hexdigest()
r=load(p/'attempt-3/results.json');s=load(p/'supplement-2/results.json')
assert (p/'attempt-3.exit').read_text().strip()=='0' and (p/'supplement-2.exit').read_text().strip()=='0'
assert r['status']=='PASS' and len(r['cases'])==4
assert r['sourceBefore']==r['sourceAfter'] and s['sourceBefore']==s['sourceAfter']
assert not r['errors'] and not s['errors']
assert all(x['sha256']==r['wasmSha256'] for x in r['servedWasm'])
origin=load(pathlib.Path(r['input']));learn_diffs=[]
for case in r['cases']:
 assert case['status']=='PASS' and case['canonical']['budget']==10 and len(case['canonical']['nodes'])==12
 assert case['learned']['spent']==4 and case['learned']['points']==6
 assert all(case[k] for k in ['cancelExact','learnRetention','layoutExact','resetCancelExact','resetRetention','awayReadOnlyExact'])
 assert len(case['full'])==12 and len(case['edges'])==10 and case['documentOverflow']==0
 assert min(t['w']for t in case['targets'])>=44 and min(t['h']for t in case['targets'])>=44
 assert all(t['insideWidth']and t['reachable']for t in case['current']+case['full'])
 assert case['sent']['mask']==1091 and case['sent']['class']=='fighter' and case['sent']['weapon']=='sword'
 assert all(case['awayRefusals']) and case['recoveryWait']['requestedMs']==526000
 q=p/'attempt-3'/f"learned-{case['viewport']['width']}-{case['scale']}x.session.json"
 learned=load(q);game=[k for k in origin.keys()|learned.keys() if origin.get(k)!=learned.get(k)]
 lin=sorted(k for k in origin['lineage'].keys()|learned['lineage'].keys()if origin['lineage'].get(k)!=learned['lineage'].get(k))
 assert game==['lineage'] and lin==['class_paths','sets']
 learn_diffs.append({'path':str(q.relative_to(p)),'only_changed_lineage_fields':lin})
 for mode in ['current','full']:
  q=p/'attempt-3'/f"{case['viewport']['width']}-{case['scale']}x-{mode}-leaf.png"
  dimensions=struct.unpack('>II',q.read_bytes()[16:24]);assert dimensions==(case['viewport']['width'],case['viewport']['height'])
assert r['fallback']['actualNetworkFailure']and r['fallback']['primitive']and r['fallback']['exactSave']
a=load(p/'supplement-2/before.session.json');b=load(p/'supplement-2/after-reset.session.json')
assert [k for k in a.keys()|b.keys()if a.get(k)!=b.get(k)]==['lineage']
reset_diffs=sorted(k for k in a['lineage'].keys()|b['lineage'].keys()if a['lineage'].get(k)!=b['lineage'].get(k))
assert reset_diffs==['class_paths','sets'] and s['fullHereditaryFamilyResetRetention']
assert s['fontScaling']['mapDescendantName']=={'normal':14,'double':14,'ratio':1}
assert s['fontScaling']['learnAction']=={'normal':16,'double':16,'ratio':1}
assert s['fontScaling']['reset']=={'normal':16,'double':16,'ratio':1}
o={'status':'PASS_SCOPED_GEOMETRY_INPUT_RETENTION_ARTIFACT_CHECKS','readable_200_percent_status':'FAIL:descendant names and Learn/Reset action fonts remain fixed while requirement/block text doubles','input_sha256':r['inputSha256'],'wasm_sha256':r['wasmSha256'],'cases':4,'learned_save_field_diffs':learn_diffs,'reset_save_only_changed_lineage_fields':reset_diffs,'served_wasm_responses':len(r['servedWasm']),'font_measurements':s['fontScaling'],'scope':'One genuine Fighter journey. Four other classes/multi-resident stale-owner controls, actual GPU visual/accessibility/recognition/fun acceptance not certified. Old failed attempts retained.'}
(p/'verification.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps({'cases':4,'whole_save_retention_except_paths_sets':True,'readable_200_percent':'FAIL retained','status':o['status']}))
