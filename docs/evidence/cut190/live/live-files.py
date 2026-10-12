from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re
root=Path('scratchpad/cut190/release-site')
base='https://gyng.github.io/idlever/'
html=(root/'index.html').read_text()
paths=['index.html','sw.js','manifest.webmanifest','favicon.svg','art/idlever-wordmark-v1.webp']
paths += re.findall(r'(?:src|href)="/idlever/([^"?#]+)"',html)
paths += [str(p.relative_to(root)) for p in (root/'assets').glob('*') if p.suffix in ['.js','.wasm']]
paths=list(dict.fromkeys(p for p in paths if (root/p).is_file()))
def check(path):
 local=(root/path).read_bytes()
 with urlopen(Request(base+path,headers={'User-Agent':'Idlever-release-check'}),timeout=60) as r:
  raw=r.read(); status=r.status
 assert raw==local,path
 return {'path':path,'status':status,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
with ThreadPoolExecutor(max_workers=8) as pool: result=list(pool.map(check,paths))
assert any(p['path'].endswith('.wasm') for p in result)
proof={'sourceCommit':'79032ef5501567e30dd4ffe092b87692c82028e8','release':'v0.1.0-alpha.2','workflow':38278721510,'url':base,'files':result,'pass':True}
out=Path('scratchpad/cut190/live');out.mkdir(parents=True,exist_ok=True)
(out/'files.json').write_text(json.dumps(proof,indent=2)+'\n')
print(f'{len(result)} live files match the release artifact')
