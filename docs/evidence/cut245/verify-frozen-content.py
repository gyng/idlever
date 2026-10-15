"""Independent saved artifact verification, no GPU or game simulation."""
import pathlib,json,gzip,hashlib,datetime,sys
from PIL import Image
p=pathlib.Path(sys.argv[1]);d=json.loads((p/'results.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
curated='--curated' in sys.argv
prior=json.loads((p.parent/'frozen-visual-content-verification-2026-10-16.json').read_text()) if curated else None
if prior:assert prior['inputSha256']==sha((p/'results.json').read_bytes())
def artifact(name):
 if not curated:return p/name
 entry=prior['files'][name];f=p/entry['equivalentRepresentative'];assert sha(f.read_bytes())==entry['sha256'];return f
assert d['status']=='PASS' and d['contentOnly'] and d['control'] and not d['errors'] and len(d['rows'])==18
expected={(i,w,r) for i in ['fens','crypt','foundry'] for w in [400,1440] for r in range(3)}
assert {(r['id'],r['width'],r['rep']) for r in d['rows']}==expected
for f,h in d['source'].items():assert sha(pathlib.Path(f).read_bytes())==h,f
for key,file in [('harnessSha256','cost-frozen-visual.mjs'),('instrumentationSha256','cost-frozen-visual-instrumentation.mjs'),('contentAuditSha256','cost-content-audit.mjs'),('prerequisiteHelperSha256','cost-pair-coverage.mjs')]:assert sha((p.parent/file).read_bytes())==d[key]
rows=[];unique_traces={};unique_png={};inventory={}
for r in d['rows']:
 assert r['contentValid'] and r['contentProof']['restored'] and not r['samples'] and not r['states']
 assert r['stats']['fx']=='high' and r['exactInput']
 frames=r['contentProof']['frames'];assert len(frames)==4 and [f['leg'] for f in frames]==['baseline','candidate','baseline','candidate']
 assert all(f['visualClock']==10000000 for f in frames)
 assert all(frames[i]['actualRaf']<frames[i+1]['actualRaf'] for i in range(3))
 ref_trace=None;ref_pixels=None;draws=None
 for f in frames:
  trace_file=artifact(f['traceFile']);encoded=trace_file.read_bytes();raw=gzip.decompress(encoded);assert sha(raw)==f['traceSha256']
  t=json.loads(raw);assert any(e['kind']=='draw' for e in t['events']);draws=sum(e['kind']=='draw' for e in t['events'])
  if ref_trace is None:ref_trace=raw
  else:assert raw==ref_trace
  unique_traces.setdefault(f['traceSha256'],f['traceFile'])
  png_file=artifact(f['framebufferFile']);png=png_file.read_bytes();digest=sha(png);unique_png.setdefault(digest,f['framebufferFile'])
  with Image.open(png_file) as im:
   im=im.convert('RGBA');assert im.size==tuple(r['stats']['device'])
   pixels=im.tobytes();assert sha(im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes())==f['pixelSha256'],'PNG must reproduce original GL RGBA bytes'
  if ref_pixels is None:ref_pixels=pixels
  else:assert pixels==ref_pixels
  inventory[f['traceFile']]={'sha256':sha(encoded),'decodedSha256':sha(raw),'bytes':len(encoded),'equivalentRepresentative':unique_traces[f['traceSha256']]}
  inventory[f['framebufferFile']]={'sha256':digest,'bytes':len(png),'equivalentRepresentative':unique_png[digest]}
 rows.append({'id':r['id'],'width':r['width'],'rep':r['rep'],'drawSubmissionsPerFrame':draws,'frames':4,'contentAndDecodedFramebufferExact':True,'actualRafRange':[frames[0]['actualRaf'],frames[-1]['actualRaf']],'visualClock':10000000})
assert not d['budgets']
report={'recordedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS independent artifact verification','scope':'Actual submitted traces and saved framebuffer bytes only; no new GPU/CPU/cold timing acceptance','input':str(p/'results.json'),'inputSha256':sha((p/'results.json').read_bytes()),'repetitions':18,'frames':72,'nontrivialComparisons':54,'rows':rows,'uniqueFullTraces':len(unique_traces),'uniqueFramebufferPngs':len(unique_png),'sourceAndMethodStillExact':True,'pngDecodedReproducesActualGlReadback':True,'representatives':list(unique_traces.values())+list(unique_png.values()),'files':inventory}
out=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 and not sys.argv[2].startswith('--') else p.parent/'frozen-visual-content-verification-2026-10-16.json'
report['verificationScriptSha256']=sha(pathlib.Path(__file__).read_bytes());report['curatedAliasMode']=curated
out.write_text(json.dumps(report,indent=2)+'\n')
print(f"PASS:18reps/72fulltraces+decodedPNGactualRGBA,54nontrivialexactcomparisons; unique{len(unique_traces)}traces/{len(unique_png)}PNGs; source/method exact")
