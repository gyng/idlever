"""Independent raw archive/public preparation/observer/outcome reconstruction."""
from pathlib import Path
import hashlib
import json
import subprocess
import tarfile
import tempfile
r=Path('docs/evidence/cut291');m=json.loads((r/'manifest.json').read_text());identity=json.loads((r/'identity.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((r/'capture.tar.zst').read_bytes())==m['archive_sha256']
for file,key in [('harness.rs','harness_sha256'),('frozen-contract.md','contract_sha256')]:assert sha((r/file).read_bytes())==identity[key]
with tempfile.TemporaryDirectory(prefix='idlever-cut291-verify-') as scratch:
    scratch=Path(scratch);expected={f['path']:f for f in m['files']};seen=set()
    process=subprocess.Popen(['zstd','-q','-dc','--long=27',str(r/'capture.tar.zst')],stdout=subprocess.PIPE)
    try:
        with tarfile.open(fileobj=process.stdout,mode='r|') as tar:
            for member in tar:
                assert member.name in expected and member.name not in seen and not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
                dest=scratch/member.name;dest.parent.mkdir(parents=True,exist_ok=True);f=expected[member.name]
                if member.islnk():
                    assert member.linkname in seen and f['same_bytes_as']==member.linkname and expected[member.linkname]['sha256']==f['sha256'];dest.hardlink_to(scratch/member.linkname)
                else:
                    assert member.isfile();data=tar.extractfile(member).read();assert len(data)==f['bytes'] and sha(data)==f['sha256'];dest.write_bytes(data)
                seen.add(member.name)
    finally:process.stdout.close();code=process.wait()
    assert code==0 and seen==set(expected)
    def raw(name):return (scratch/name).read_bytes()
    def load(name):return json.loads(raw(name))
    import gzip
    for path,digest in identity['sources'].items():assert sha(raw(path))==digest
    def restore(x):
        if isinstance(x,str):return x.replace('not learned','no line').replace('learn Throw first','no clear throw').replace('learn ability first','shot blocked')
        if isinstance(x,list):return [restore(v) for v in x]
        if isinstance(x,dict):return {restore(k):restore(v) for k,v in x.items()}
        return x
    report=json.loads((r/'wasm/report.json').read_text());assert report==identity['wasm']
    assert '2 passed; 3 failed' in raw('red-tests.txt').decode()
    assert '5 passed; 0 failed' in raw('green-tests.txt').decode()
    for case in report['cases']:
        name=case['scene']+'-'+case['permission'];before='before-'+name;after='after-'+name
        assert sha(raw(before+'/normalized-input.json'))==sha(raw(after+'/normalized-input.json'))==identity['parents'][name]['sha256']
        assert load(before+'/after.json')==restore(load(after+'/after.json'))
        assert load(before+'/events.json')==restore(load(after+'/events.json'))
        if case['permission']=='learned':
            assert raw(before+'/after.json')==raw(after+'/after.json')
            assert raw(before+'/events.json')==raw(after+'/events.json')
        reasons=[w['why'] for t in load(after+'/trace.json') for w in t.get('rows',[])]
        assert reasons.count('not learned')==case['learningReasons']==(5 if name=='gas-locked' else 0)
        old_reasons=[w['why'] for t in load(before+'/trace.json') for w in t.get('rows',[])]
        if name=='gas-locked':assert old_reasons.count('no line')==5
        wasm_input=gzip.decompress((r/'wasm'/f'{name}-input.json.gz').read_bytes())
        wasm_after=gzip.decompress((r/'wasm'/f'{name}-after.json.gz').read_bytes())
        assert sha(wasm_input)==case['inputSha256']==identity['parents'][name]['sha256']
        assert sha(wasm_after)==case['afterSha256'] and wasm_after==raw(after+'/after.json')
        assert json.loads((r/'wasm'/f'{name}-events.json').read_text())==load(after+'/events.json')
    settlement=json.loads((r/'settlements-inputs-fb23.json').read_text())
    original=json.loads(Path('docs/evidence/cut284/settlements-inputs-1f92.json').read_text())
    assert settlement['wasm']=={'bytes':report['wasmBytes'],'sha256':report['wasmSha256']}
    for old,new in zip(original['entries'],settlement['entries']):
        assert old['id']==new['id'] and old['expected']==new['expected']
        gz=Path(new['afterHome']).read_bytes();data=gzip.decompress(gz)
        assert sha(gz)==new['afterHomeSha256'] and sha(data)==new['afterRawSha256']
        a=json.loads(gzip.decompress(Path(old['afterHome']).read_bytes()));b=json.loads(data)
        if new['id']=='multihero-absence':
            blocked=b['lineage']['row_stats'][8][1]['blocked']
            assert blocked.pop('not learned')==90 and blocked['no line']==273
            blocked['no line']=363
        assert a==b
    result={'status':'PASS','raw_receipts':len(seen),'complete_reason_only_comparisons':4,'learned_byte_exact_controls':2,'native_wasm_complete_save_and_event_pairs':4,'gas_locked_new_reasons':5}
    (r/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
