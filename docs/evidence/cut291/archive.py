"""Lossless long-window zstd receipt archive, with tar links for exact duplicates."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import tarfile
import time
root=Path('target/cut291');out=Path('docs/evidence/cut291');manifest={'files':[]};seen={};total=0;unique=0;start=time.monotonic()
argv=['zstd','-q','-T4','-10','--long=27','-c']
with (out/'capture.tar.zst').open('xb') as dest:
    process=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=dest)
    try:
        with tarfile.open(fileobj=process.stdin,mode='w|') as tar:
            for p in sorted(root.rglob('*')):
                if not p.is_file() or p.suffix not in ['.json','.txt','.rs'] or p.name.startswith('archive') or p.name in ['workspace-tests.txt','repin.txt','clippy.txt']:continue
                data=p.read_bytes();sha=hashlib.sha256(data).hexdigest();name=str(p.relative_to(root));total+=len(data);record={'path':name,'bytes':len(data),'sha256':sha};info=tarfile.TarInfo(name)
                if sha in seen:info.type=tarfile.LNKTYPE;info.linkname=seen[sha];record['same_bytes_as']=seen[sha];tar.addfile(info)
                else:seen[sha]=name;info.size=len(data);unique+=len(data);tar.addfile(info,io.BytesIO(data))
                manifest['files'].append(record)
    finally:process.stdin.close()
    assert process.wait()==0
manifest.update(raw_bytes=total,unique_raw_bytes=unique,archive_bytes=(out/'capture.tar.zst').stat().st_size,archive_sha256=hashlib.sha256((out/'capture.tar.zst').read_bytes()).hexdigest(),compression_argv=argv,archive_wall_seconds=time.monotonic()-start)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({k:v for k,v in manifest.items() if k!='files'}),flush=True)
