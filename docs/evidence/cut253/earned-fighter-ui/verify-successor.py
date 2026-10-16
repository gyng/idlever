"""Independent successor artifact checks; no browser/native execution."""
import pathlib,json,struct,hashlib
p=pathlib.Path(__file__).resolve().parent;d=p/'successor-1';load=lambda x:json.loads(x.read_text());r=load(d/'results.json');origin=load(pathlib.Path(r['input']))
assert (p/'successor-1.exit').read_text().strip()=='0' and r['status']=='PASS' and len(r['cases'])==4
assert not r['errors'] and r['sourceBefore']==r['sourceAfter']
assert r['servedWasm'] and all(x['sha256']==r['wasmSha256'] for x in r['servedWasm'])
rows=[]
for c in r['cases']:
 assert c['status']=='PASS' and len(c['canonical']['nodes'])==12 and c['canonical']['budget']==10
 assert c['learned']['spent']==4 and c['learned']['points']==6
 assert all(c[k]for k in ['cancelExact','learnRetention','layoutExact','resetCancelExact','resetRetention','awayReadOnlyExact'])
 assert len(c['full'])==12 and len(c['edges'])==10 and c['documentOverflow']==0
 assert all(x['insideWidth'] and x['reachable']for x in c['current']+c['full'])
 assert all(x['w']>=44 and x['h']>=44 for x in c['targets'])
 assert c['sent']['mask']==1091 and c['sent']['class']=='fighter' and c['sent']['weapon']=='sword' and all(c['awayRefusals'])
 v=c['viewport'];tag=f"{v['width']}-{c['scale']}x";a=load(d/f'learned-{tag}.session.json');b=load(d/f'reset-{tag}.session.json')
 assert [k for k in origin.keys()|a.keys()if origin.get(k)!=a.get(k)]==['lineage']
 changes=sorted(k for k in origin['lineage'].keys()|a['lineage'].keys()if origin['lineage'].get(k)!=a['lineage'].get(k));assert changes==['class_paths','sets']
 assert b==origin,'whole reset JSON must equal genuine original frontier'
 if c['scale']==1:assert c['fontMeasurements']=={'descendantName':14,'learnAction':16,'resetAction':16}
 else:assert c['fontMeasurements']=={'descendantName':28,'learnAction':32,'resetAction':32} and all(x>=1.95 for x in c['fontRatios'].values())
 for mode in ['current','full']:
  assert struct.unpack('>II',(d/f'{tag}-{mode}-leaf.png').read_bytes()[16:24])==(v['width'],v['height'])
 rows.append({'viewport':v,'scale':c['scale'],'minimum_target_width':min(x['w']for x in c['targets']),'minimum_target_height':min(x['h']for x in c['targets']),'font_sizes':c['fontMeasurements'],'font_ratios':c.get('fontRatios'),'learned_only_changed_fields':changes,'reset_whole_json_equal_original':True})
assert r['fallback']['actualNetworkFailure']and r['fallback']['primitive']and r['fallback']['exactSave']
o={'status':'PASS_SCOPED_EARNED_FIGHTER_SUCCESSOR','input_sha256':r['inputSha256'],'wasm_sha256':r['wasmSha256'],'served_wasm_responses':len(r['servedWasm']),'cases':rows,'missing_holdfast_fallback':r['fallback'],'limits':'One of five required earned class journeys; one resident. Headless functional geometry and measured text scaling, not GPU/final art/contrast/recognition/fun acceptance. Original failures/readability measurements retained.'};(p/'verification-successor.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps({'status':o['status'],'cases':len(rows),'all_reset_saves_equal_genuine_original':True,'both_200_percent_ratios':2.0}))
