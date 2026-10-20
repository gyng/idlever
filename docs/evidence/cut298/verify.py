#!/usr/bin/env python3
"""Verify the preserved diagnostic, not a fresh gameplay/population acceptance."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

root = Path('docs/evidence/cut298')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
identity = json.loads((root/'identity.json').read_text())
assert sha(root/'capture.tar.zst') == identity['archive_sha256']
for p,h in identity['files'].items():
    assert sha(Path(p)) == h, p
with tempfile.TemporaryDirectory(prefix='idlever-cut298-') as temp:
    dest = Path(temp)
    process = subprocess.Popen(['zstd','-dc',str(root/'capture.tar.zst')],stdout=subprocess.PIPE)
    with tarfile.open(fileobj=process.stdout,mode='r|') as archive:
        for entry in archive:
            assert not entry.name.startswith('/') and '..' not in Path(entry.name).parts
            assert not entry.issym() and not entry.islnk()
            path = dest/entry.name
            if entry.isdir():
                path.mkdir(parents=True,exist_ok=True)
            else:
                assert entry.isfile()
                path.parent.mkdir(parents=True,exist_ok=True)
                path.write_bytes(archive.extractfile(entry).read())
    assert process.wait() == 0
    manifest = json.loads((dest/'raw-manifest.json').read_text())
    for name,h in manifest.items():
        assert sha(dest/name) == h, name
    baseline = json.loads((root/'baseline-identity.json').read_text())
    contact = json.loads((root/'contact-identity.json').read_text())
    producer = 'crates/idlever-core/examples/queen_pen_probe.rs'
    assert sha(root/'baseline-producer.rs') == baseline['sources'][producer]
    assert sha(Path(producer)) == contact['sources'][producer]
    for path,h in baseline['sources'].items():
        if path != producer:
            assert h == contact['sources'][path] == sha(Path(path)),path
    for p,h in baseline['compressed_parents'].items():
        original = Path(p)
        assert sha(original) == h
        label = original.name.removesuffix('.json.gz')
        assert (dest/'capture'/label/'original.json').read_bytes() == gzip.decompress(original.read_bytes())
        raw = json.loads((dest/'capture'/label/'original.json').read_text())
        canonical = json.loads((dest/'capture'/label/'canonical.json').read_text())
        expected = {**raw,'bloodlines_v':1,'elapsed_remainder_ms':0,'next_id':2,'others':{},'selected':1}
        assert canonical == expected, 'only Session wrapper additions allowed at load'
        if label.startswith('TUNED'):
            assert (dest/'contact'/label/'original.json').read_bytes() == (dest/'capture'/label/'original.json').read_bytes()
    assert not list((dest/'adjacent').rglob('run-*.json'))
    assert not list((dest/'adjacent').rglob('result.json'))
    # Re-derive all ten cases and every per-run/window count from the raw archive.
    output = dest/'summary.json'
    subprocess.run(['python3',str(root/'analyze.py'),str(dest),str(output)],check=True,stdout=subprocess.PIPE)
    assert output.read_bytes() == (root/'summary.json').read_bytes()
    summary = json.loads(output.read_text())
    assert len(summary['cases']) == 10 and summary['actual_completed_runs'] == 130
    assert summary['repeat_controls_byte_exact'] == 2
    by = {(c['camp'],c['variant']):c for c in summary['cases']}
    assert by[('TUNED-s2-d2-c1','unchanged')]['best'] == 33
    assert by[('TUNED-s2-d2-c1','no-queen-pen')]['best'] == 28
    assert by[('TUNED-s2-d2-c1','unchanged')]['untouched_full_health_expirations'] == 5
    for seed in (1,2):
        assert by[(f'TUNED-s{seed}-d2-c1','contact-queen-pen')]['best'] == by[(f'TUNED-s{seed}-d2-c1','unchanged')]['best'] == 33
    earlier = json.loads(gzip.decompress((root/'earlier-TUNED-s1-d2-c0.json.gz').read_bytes()))
    assert not [f for f in earlier['lineage']['facts'] if 'lurker_queen' in f]
    fresh = dest/'fresh'
    fresh.mkdir()
    process = subprocess.Popen(['zstd','-dc',str(root/'fresh.tar.zst')],stdout=subprocess.PIPE)
    with tarfile.open(fileobj=process.stdout,mode='r|') as archive:
        for entry in archive:
            assert not entry.name.startswith('/') and '..' not in Path(entry.name).parts
            assert not entry.issym() and not entry.islnk()
            path = fresh/entry.name
            if entry.isdir(): path.mkdir(parents=True,exist_ok=True)
            else:
                assert entry.isfile()
                path.parent.mkdir(parents=True,exist_ok=True)
                path.write_bytes(archive.extractfile(entry).read())
    assert process.wait() == 0
    fresh_manifest = json.loads((fresh/'manifest.json').read_text())
    for p,h in fresh_manifest.items(): assert sha(fresh/p) == h,p
    fresh_output = dest/'fresh-summary.json'
    subprocess.run(['python3',str(root/'fresh.py'),str(fresh),str(fresh_output)],check=True,stdout=subprocess.PIPE)
    assert fresh_output.read_bytes() == (root/'fresh-summary.json').read_bytes()
    for p in baseline['compressed_parents']:
        original=Path(p)
        assert (fresh/'camps'/original.name.removesuffix('.gz')).read_bytes()==gzip.decompress(original.read_bytes())
    fresh_id=json.loads((root/'fresh-identity.json').read_text())
    for group in ('producer_sources','additional_parent_commit_modules'):
        for p,h in fresh_id[group].items(): assert sha(Path(p))==h,p
    result = {'status':'PASS_AT_DIAGNOSTIC_SCOPE','raw_files':len(manifest),'completed_actual_runs':130,
        'fixed_8h_continuations':10,'repeat_controls_byte_exact':2,'refused_candidate_simulations':0,
        'counter_contribution_seed2_depth':[33,28],'contact_candidate_d33_improvement':False,
        'native_reconstruction_public_event_equality':'asserted by pinned native producers during capture; archive verification does not rerun the game',
        'ordinary_current_trajectories':4,'fresh_camps':21,'fresh_median_paired_ratio':'11/10','conditional_late_queen_ceiling':'11/10',
        'default_adoption':False,'population_or_canonical_acceptance':False}
    print(json.dumps(result))
