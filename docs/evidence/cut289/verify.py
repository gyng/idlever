"""Reconstruct rejected candidate gates without importing the producer analysis."""
from pathlib import Path
import hashlib
import json
import tarfile
import tempfile
r=Path('docs/evidence/cut289');identity=json.loads((r/'identity.json').read_text());manifest=json.loads((r/'manifest.json').read_text());sha=lambda x:hashlib.sha256(x).hexdigest()
for name,key in [('ai-before.rs','before_ai_sha256'),('ai-candidate.rs','candidate_ai_sha256'),('harness.rs','harness_sha256'),('frozen-contract.md','contract_sha256')]:assert sha((r/name).read_bytes())==identity[key]
assert identity['restored_ai_sha256']==identity['before_ai_sha256']
assert sha((r/'capture.tar.xz').read_bytes())==manifest['archive_sha256']
prior_manifest_bytes=Path('docs/evidence/cut287/manifest.json').read_bytes()
assert sha(prior_manifest_bytes)==identity['prior_cut287_manifest_sha256']
prior={f['path']:f['sha256'] for f in json.loads(prior_manifest_bytes)['files']}
restored=json.loads((r/'restored-runtime-check.json').read_text())
assert restored['status']=='PASS' and restored['binary_sha256']==identity['restored_binary_sha256']
assert len(restored['cases'])==2
for case in restored['cases']:
    seed={'gas':1,'pack':2}[case['case']]
    for name,receipt in case['checks'].items():
        assert receipt['equals_original_cut287'] and receipt['sha256']==prior[f'trace-s{seed}-d9-a2-gas_step/'+name]
results=[]
with tempfile.TemporaryDirectory(prefix='idlever-cut289-verify-') as scratch:
    scratch=Path(scratch);expected={f['path']:f for f in manifest['files']};seen=set()
    with tarfile.open(r/'capture.tar.xz','r|xz') as tar:
        for m in tar:
            assert m.name in expected and m.name not in seen and not Path(m.name).is_absolute() and '..' not in Path(m.name).parts
            dest=scratch/m.name;dest.parent.mkdir(parents=True,exist_ok=True);f=expected[m.name]
            if m.islnk():
                assert m.linkname in seen and f['same_bytes_as']==m.linkname and expected[m.linkname]['sha256']==f['sha256'];dest.hardlink_to(scratch/m.linkname)
            else:
                assert m.isfile();data=tar.extractfile(m).read();assert len(data)==f['bytes'] and sha(data)==f['sha256'];dest.write_bytes(data)
            seen.add(m.name)
    assert seen==set(expected)
    load=lambda p:json.loads((scratch/p).read_bytes())
    for label in ['gas','pack']:
        prefix=label+'-candidate';assert sha((scratch/prefix/'normalized-input.json').read_bytes())==identity['parents'][label]['sha256']
        parity=load(prefix+'/observer-parity.json');events=load(prefix+'/events.json');frames=load(prefix+'/frames.json')
        assert parity=={'events':True,'save':True,'event_count':len(events)}
        assert (scratch/prefix/'after.json').read_bytes()==(scratch/prefix/'after-fine.json').read_bytes()==(scratch/prefix/'after-coarse.json').read_bytes()
        assert [e for f in frames for e in f['events']]==events
        first=[e for f in frames if f['before'] and f['before']['depth']==9 for e in f['events']]
        hurt=sum(e.get('dmg',0) for e in first if e['k']=='hurt' and e.get('id')==1)
        gas=sum(e.get('dmg',0) for e in first if e['k']=='hurt' and e.get('id')==1 and e.get('cause')=='gas')
        tick=max(e['t'] for e in first);claimed=load(label+'-candidate-metrics.json');assert (hurt,gas,tick)==(claimed['hurt'],claimed['gas_hurt'],claimed['last_initial_floor_event_tick'])
        bars={'hurt':hurt<=9,'gas_hurt':gas<=3,'tick':tick<=1730} if label=='gas' else {'hurt':hurt<=16,'gas_hurt':gas<=9}
        results.append({'case':label,'hurt':hurt,'gas_hurt':gas,'last_initial_floor_event_tick':tick,'bars':bars,'pass':all(bars.values())})
    assert results[0]['pass'] is False and results[1]['pass'] is True
print(json.dumps({'archive_integrity':'PASS','raw_files':len(manifest['files']),'observer_event_save_parity_cases':2,'candidate_verdict':'REJECTED','cases':results,
    'core_source_restored_byte_exact':True,'rebuilt_runtime_matches_original_full_event_and_save_pairs':2,'unit_test_plan':'NOT_RUN','remaining_catalogue_and_8h_checks':'NOT_RUN','wasm_or_deployment_change':'NONE'},indent=2))
