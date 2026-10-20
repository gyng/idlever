"""Lossless raw receipt archive; identical files use standard tar hard links."""
from pathlib import Path
import hashlib
import io
import json
import lzma
import tarfile
root=Path('target/cut287');out=Path('docs/evidence/cut287')
manifest={'files':[]};seen={};total=0;unique=0
with (out/'capture.tar.xz').open('xb') as dest,lzma.LZMAFile(dest,'wb',preset=6) as compressed,tarfile.open(fileobj=compressed,mode='w|') as tar:
    for p in sorted(root.rglob('*')):
        if not p.is_file() or p.suffix not in ['.json','.txt']:continue
        data=p.read_bytes();sha=hashlib.sha256(data).hexdigest();name=str(p.relative_to(root));total+=len(data)
        receipt={'path':name,'bytes':len(data),'sha256':sha};info=tarfile.TarInfo(name)
        if sha in seen:
            info.type=tarfile.LNKTYPE;info.linkname=seen[sha];receipt['same_bytes_as']=seen[sha];tar.addfile(info)
        else:
            seen[sha]=name;info.size=len(data);unique+=len(data);tar.addfile(info,io.BytesIO(data))
        manifest['files'].append(receipt)
manifest.update(raw_bytes=total,unique_raw_bytes=unique,archive_bytes=(out/'capture.tar.xz').stat().st_size,
                archive_sha256=hashlib.sha256((out/'capture.tar.xz').read_bytes()).hexdigest())
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k!='files'}),flush=True)
