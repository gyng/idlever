"""Independent integrity and observation checks of archived current earned runs."""
import hashlib
import json
from pathlib import Path
import tarfile
import tempfile

root=Path('docs/evidence/cut286')
manifest=json.loads((root/'manifest.json').read_text())
assert hashlib.sha256((root/'capture.tar.xz').read_bytes()).hexdigest()==manifest['archive_sha256']
assert hashlib.sha256((root/'harness.rs').read_bytes()).hexdigest()==manifest['harness_sha256']
# One forward pass avoids repeatedly decompressing large history-bearing saves.
with tempfile.TemporaryDirectory(prefix='idlever-cut286-verify-') as scratch:
    scratch=Path(scratch)
    expected={f['path']:f for f in manifest['files']}
    seen=set()
    with tarfile.open(root/'capture.tar.xz','r|xz') as tar:
        for member in tar:
            assert member.isfile() and member.name in expected
            assert not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
            assert member.name not in seen
            seen.add(member.name)
            data=tar.extractfile(member).read()
            f=expected[member.name]
            assert len(data)==f['bytes']
            assert hashlib.sha256(data).hexdigest()==f['sha256'],member.name
            dest=scratch/member.name
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(data)
    assert seen==set(expected)
    def raw(name): return (scratch/name).read_bytes()
    def load(name): return json.loads(raw(name))
    inventory_differences=[]
    for seed in [1,2]:
        original=load(f'input-s{seed}.json')
        normalized=load(f'earn-s{seed}-d5/normalized-input.json')
        earned=load(f'earn-s{seed}-d5/after.json')
        assert original['lineage']['seed']==normalized['lineage']['seed']==earned['lineage']['seed']==seed
        assert 'pack_break' not in original['lineage']['pkg']['owned']
        assert 'pack_break' in earned['lineage']['pkg']['owned']
        assert earned['lineage']['clock_s']>normalized['lineage']['clock_s']
        for depth,cards in [(9,['baseline','gas_step','pack_break']),(14,['baseline','boss_focus','corridor_fighting']),(19,['baseline','reflect_read','corridor_fighting'])]:
            parent=load(f'prepare-s{seed}-d{depth}/after.json')
            baseline=load(f'trace-s{seed}-d{depth}-baseline/send.json')
            for card in cards:
                case=f'trace-s{seed}-d{depth}-{card}'
                assert load(case+'/normalized-input.json')==parent
                chosen=load(case+'/choice-parent.json')
                for key in ['gold','marks','clock_s','rng','bloodline','party','kennel','seed']:
                    assert parent['lineage'][key]==chosen['lineage'][key],(case,key)
                if card!='baseline':
                    assert chosen['lineage']['pkg']['tactics'][0]==card
                    assert load(case+'/summary.json')['levels'][card]>=3
                send=load(case+'/send.json')
                for key in ['floor','monsters','rng','seed','id','route']:
                    assert baseline['run'].get(key)==send['run'].get(key),(case,key)
                hero=send['run']['hero'].copy();basehero=baseline['run']['hero'].copy()
                inv=hero.pop('inv');baseinv=basehero.pop('inv')
                assert hero==basehero,(case,'equipment/stats')
                if inv!=baseinv:
                    assert len(inv)==len(baseinv)+1 and inv[:-1]==baseinv and inv[-1]['kind']=='fire'
                    inventory_differences.append(case)
                assert raw(case+'/after-fine.json')==raw(case+'/after-coarse.json')
                assert raw(case+'/after-fine.json')==raw(case+'/after.json')
                parity=load(case+'/observer-parity.json')
                assert parity['events'] and parity['save']
                events=load(case+'/events.json')
                assert parity['event_count']==len(events)
                frames=load(case+'/frames.json')
                assert [e for f in frames for e in f['events']]==events
                assert events[-1]['k']=='bones' or any(e['k']=='exit' for e in events)
                assert load(case+'/floors.json')[0]['floor']==send['run']['floor']
    assert len(inventory_differences)==4
print(json.dumps({'integrity':'PASS','archived_files':len(manifest['files']),
    'observer_parity_cases':18,'same_parent_initial_floor_rng_monsters_cases':18,
    'same_initial_hero_equipment_and_stats_cases':18,
    'unequal_fire_inventory_cases':inventory_differences,
    'six_controlled_scene_catalogue':'NOT_ESTABLISHED',
    'next8h_comparisons':'NOT_RUN',
    'positions':'tick boundaries; not exact intra-tick action positions'},indent=2))
