"""Independent failed A/A result/artifact audit; never runs a renderer or game."""
import pathlib,json,gzip,hashlib,datetime,sys,math
from PIL import Image
p=pathlib.Path(sys.argv[1]);base=p.parent;curated='--curated' in sys.argv
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=gzip.decompress((base/(p.name+'-raw.json.gz')).read_bytes()) if curated or not (p/'results.json').exists() else (p/'results.json').read_bytes()
d=json.loads(raw);assert d['status']=='FAIL' and d['control'] and not d['contentOnly'] and not d['errors'] and len(d['rows'])==18
expected={(i,w,r) for i in ['fens','crypt','foundry'] for w in [400,1440] for r in range(3)}
assert {(r['id'],r['width'],r['rep']) for r in d['rows']}==expected
for f,h in d['source'].items():assert sha(pathlib.Path(f).read_bytes())==h
for key,file in [('harnessSha256','cost-frozen-visual.mjs'),('instrumentationSha256','cost-frozen-visual-instrumentation.mjs'),('contentAuditSha256','cost-content-audit.mjs'),('prerequisiteHelperSha256','cost-pair-coverage.mjs')]:assert sha((base/file).read_bytes())==d[key]
prior=json.loads((base/'frozen-visual-content-verification-2026-10-16.json').read_text());proofdir=base/'frozen-visual-content-2026-10-16'
trace_by_sha={v['decodedSha256']:v['equivalentRepresentative'] for v in prior['files'].values() if 'decodedSha256' in v}
png_by_sha={v['sha256']:v['equivalentRepresentative'] for k,v in prior['files'].items() if k.endswith('.png')}
tracecache={};pngcache={};aliases={};outrows=[];querytotal=0
for r in d['rows']:
 assert r['contentValid'] and r['contentProof']['restored'] and r['exactInput'] and r['stats']['fx']=='high'
 frames=r['contentProof']['frames'];assert len(frames)==4 and [f['leg'] for f in frames]==['baseline','candidate','baseline','candidate']
 assert all(f['visualClock']==10000000 for f in frames) and all(frames[i]['actualRaf']<frames[i+1]['actualRaf'] for i in range(3))
 for f in frames:
  name=f['traceFile'];canonical=proofdir/trace_by_sha[f['traceSha256']];encoded=canonical.read_bytes();digest=sha(encoded)
  if not curated:assert sha((p/name).read_bytes())==digest
  if f['traceSha256'] not in tracecache:assert sha(gzip.decompress(encoded))==f['traceSha256'];tracecache[f['traceSha256']]=True
  aliases[name]={'sha256':digest,'decodedSha256':f['traceSha256'],'canonical':str(canonical),'bytes':len(encoded)}
  name=f['framebufferFile']
  if not curated:png=(p/name).read_bytes();pngdigest=sha(png)
  else:
   # Raw pixel SHA identifies the unique already-verified source scene.
   matches=[x for x in json.loads((proofdir/'results.json').read_text())['rows'] for x in x['contentProof']['frames'] if x['pixelSha256']==f['pixelSha256']];assert matches
   pngdigest=prior['files'][matches[0]['framebufferFile']]['sha256']
  canonical=proofdir/png_by_sha[pngdigest];png=canonical.read_bytes();assert sha(png)==pngdigest
  if pngdigest not in pngcache:
   with Image.open(canonical) as im:
    im=im.convert('RGBA');pngcache[pngdigest]={'size':list(im.size),'glSha256':sha(im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes())}
  assert pngcache[pngdigest]['size']==r['stats']['device'] and pngcache[pngdigest]['glSha256']==f['pixelSha256']
  aliases[name]={'sha256':pngdigest,'canonical':str(canonical),'bytes':len(png)}
 assert len({f['traceSha256'] for f in frames})==1 and len({f['pixelSha256'] for f in frames})==1
 issues={x['frame']:x['leg'] for x in r['issued']};states={s['frame']:s for s in r['states']};assert len({s['tag']['frame'] for s in r['samples']})==len(r['samples'])
 for s in r['samples']:
  tag=s['tag'];state=states[tag['frame']];assert tag['frame']>=r['startFrame'] and tag['leg']==issues[tag['frame']]==state['leg']
  assert tag['actualRaf']==state['clocks']['actualRaf'] and math.isfinite(tag['actualRaf']) and tag['visualClock']==state['clocks']['visualClock']==10000000
  assert s['disjoint']==0 and math.isfinite(s['ms']) and s['ms']>=0
 for state in r['states']:
  g=state['geometry'];assert g==r['states'][0]['geometry'] and g['viewport']==[r['width'],640 if r['width']==400 else 800] and g['fx']=='high' and g['gpuTimer'] and not g['glLost'] and g['tick']==r['target']
  assert state['landmarks']==0 and state['allPainted'] and g['projection']['frame']=='map' and g['dpr']==1.5
 values={leg:sorted(s['ms'] for s in r['samples'] if s['tag']['leg']==leg) for leg in ['baseline','candidate']};assert all(len(v)>=240 for v in values.values())
 p95={leg:v[math.floor(len(v)*.95)] for leg,v in values.items()};assert p95==r['p95'];querytotal+=len(r['samples'])
 for path in ['/art/atlas.png','/art/atlas.json']:
  responses=[x for x in r['atlasResponses'] if x['path']==path];assert responses and all(x['status']==200 and x['sha256']==d['source']['web/public'+path] for x in responses)
 outrows.append({'id':r['id'],'width':r['width'],'rep':r['rep'],'queryCounts':{k:len(v) for k,v in values.items()},'p95':p95,'delta':p95['candidate']-p95['baseline'],'p50':{k:v[len(v)//2] for k,v in values.items()},'allIssueTagsClockGeometryAndContentValid':True})
budgets=[]
for width in [400,1440]:
 for id in ['fens','crypt','foundry']:
  rows=[r for r in outrows if r['id']==id and r['width']==width];assert len(rows)==3
  med={leg:sorted(r['p95'][leg] for r in rows)[1] for leg in ['baseline','candidate']};delta=med['candidate']-med['baseline'];budget={'width':width,'id':id,'medians':med,'delta':delta,'limitMs':.20,'withinBudget':abs(delta)<=.20};budgets.append(budget)
assert budgets==d['budgets'];fails=[b for b in budgets if not b['withinBudget']];assert len(fails)==1 and fails[0]['id']=='crypt' and fails[0]['width']==1440 and abs(fails[0]['delta']-.292864)<1e-10
report={'recordedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS independent verification of FAILED controls','controlStatus':'FAIL','inputSha256':sha(raw),'verificationScriptSha256':sha(pathlib.Path(__file__).read_bytes()),'curatedAliasMode':curated,'repetitions':18,'resolvedQuerySamples':querytotal,'budgets':budgets,'rows':outrows,'sourceMethodAndAtlasExact':True,'clockAndIssueTagsValid':True,'captureFilesByteIdenticalToCommittedContentProof':True,'captureAliases':aliases,'noOffEquivalenceCandidateOrRetry':True,'scope':'Failed method variance control, not feature cost. Sparse process samples establish no host/Windows-wide quiet or failure cause.'}
out=pathlib.Path(sys.argv[2]);out.write_text(json.dumps(report,indent=2)+'\n');print(f'PASS independent audit:18reps/{querytotal}queries,all144capturefiles exact to committed proof,5/6controlsPASS,Crypt1440FAIL+.292864ms>.20')
