"""Prepare an asset snapshot only after complete client acceptance and a clean commit.
This is not QA, native acceptance, player isolation or score certification.
"""
import argparse,datetime,hashlib,json,pathlib,shutil,subprocess
ROOT=pathlib.Path('/home/g/p/riddle')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--accepted-dir',required=True,type=pathlib.Path);p.add_argument('--destination',required=True,type=pathlib.Path);a=p.parse_args()
 accepted=a.accepted_dir.resolve();dest=a.destination.resolve()
 if dest.exists():raise RuntimeError('Destination already exists; do not overwrite a cohort')
 report=json.loads((accepted/'candidate-results.json').read_text());files_guard=json.loads((accepted/'candidate-input-guard.json').read_text());guard={'files':files_guard,'shipping_wasm':{'sha256':'58f90774b8bc5531bb9463cd092c0d2a6e55a917b402a2118527a98563c8e24e'}}
 expected_suite=json.loads(subprocess.check_output(['node','tests/run.mjs','--full','--list'],cwd=ROOT/'web',text=True))
 if report['suite']!='full' or report['failed'] or report['selectedCount']!=len(expected_suite['names']) or report['fullCount']!=expected_suite['fullCount'] or report['exhaustiveCount']!=expected_suite['exhaustiveCount'] or [x['n'] for x in report['results']]!=expected_suite['names'] or any(x['code']!=0 for x in report['results']):raise RuntimeError('Complete current full acceptance is missing or scope differs')
 for f in guard['files']:
  if sha(ROOT/f['path'])!=f['sha256']:raise RuntimeError('Accepted source changed: '+f['path'])
 subprocess.run(['git','diff','--quiet','HEAD'],cwd=ROOT,check=True)
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip();short=head[:12]
 pkg=ROOT/'web/src/engine/pkg'
 if pkg.is_symlink() or not pkg.is_dir():raise RuntimeError('WASM package must be a real directory')
 expected=guard['shipping_wasm']['sha256'];wasm=pkg/'riddle_wasm_bg.wasm'
 if sha(wasm)!=expected:raise RuntimeError('Accepted WASM changed')
 dist=ROOT/'web/dist';files=[x for x in dist.rglob('*') if x.is_file()]
 if not files or not (dist/'index.html').is_file():raise RuntimeError('Production build missing')
 if any(x.is_symlink() for x in dist.rglob('*')):raise RuntimeError('Build must not link to mutable assets')
 js=[x.read_text() for x in files if x.suffix=='.js']
 if not any(short in x for x in js) or any(short+'-dirty' in x for x in js):raise RuntimeError('Frontend was not rebuilt with the clean committed identity')
 built_wasm=[x for x in files if x.suffix=='.wasm']
 if not built_wasm or any(sha(x)!=expected for x in built_wasm):raise RuntimeError('Served WASM differs from accepted WASM')
 for x in files:
  rel=x.relative_to(dist);target=dest/'assets'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(x,target)
 inventory=[{'path':str(x.relative_to(dest/'assets')),'bytes':x.stat().st_size,'sha256':sha(x)} for x in sorted((dest/'assets').rglob('*')) if x.is_file()]
 manifest={'scope':'Accepted-source asset snapshot; QA/bridge/GPU/blind horizons/scores still require separate evidence','createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':head,'acceptedDirectory':str(accepted),'shippingWasmSha256':expected,'clientAcceptance':{'suite':'full','groups':report['selectedCount'],'exhaustiveGroupsAvailable':report['exhaustiveCount'],'omitted':report['omitted']},'files':inventory}
 (dest/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 for x in (dest/'assets').rglob('*'):
  if x.is_file():x.chmod(0o444)
 for x in sorted((dest/'assets').rglob('*'),key=lambda x:len(x.parts),reverse=True):
  if x.is_dir():x.chmod(0o555)
 (dest/'assets').chmod(0o555)
 print(json.dumps({'destination':str(dest),'commit':head,'files':len(inventory),'manifestSha256':sha(dest/'asset-manifest.json'),'qaOrScoreCertified':False}))
if __name__=='__main__':main()
