"""Independent learned-counter intervention checks over original archived bytes."""
from pathlib import Path
import collections
import copy
import hashlib
import json
import tarfile
import tempfile
root=Path('docs/evidence/cut288');identity=json.loads((root/'identity.json').read_text());manifest=json.loads((root/'manifest.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((root/'capture.tar.xz').read_bytes())==manifest['archive_sha256']
for name,key in [('harness.rs','harness_sha256'),('frozen-contract.md','contract_sha256'),('followup-contract.md','followup_contract_sha256')]:assert sha((root/name).read_bytes())==identity[key]
assert sha(Path('docs/evidence/cut287/capture.tar.xz').read_bytes())==identity['prior_cut287_archive_sha256']
with tempfile.TemporaryDirectory(prefix='idlever-cut288-verify-') as scratch:
    scratch=Path(scratch);expected={f['path']:f for f in manifest['files']};seen=set()
    with tarfile.open(root/'capture.tar.xz','r|xz') as tar:
        for m in tar:
            assert m.name in expected and m.name not in seen and not Path(m.name).is_absolute() and '..' not in Path(m.name).parts
            f=expected[m.name];dest=scratch/m.name;dest.parent.mkdir(parents=True,exist_ok=True)
            if m.islnk():
                assert m.linkname in seen and f['same_bytes_as']==m.linkname and expected[m.linkname]['sha256']==f['sha256']
                dest.hardlink_to(scratch/m.linkname)
            else:
                assert m.isfile();data=tar.extractfile(m).read();assert len(data)==f['bytes'] and sha(data)==f['sha256'];dest.write_bytes(data)
            seen.add(m.name)
    assert seen==set(expected)
    def raw(name):return (scratch/name).read_bytes()
    def load(name):return json.loads(raw(name))
    measured={};all_quotes={}
    for scene,depth,boss,special in [('summoner',14,'lich','boss_focus'),('reflection',19,'foundry_master','reflect_read')]:
        enabled=load(f'prepare-{scene}-enabled/after.json');revoked=load(f'prepare-{scene}-revoked/after.json')
        assert raw(f'prepare-{scene}-enabled/normalized-input.json')==raw(f'prepare-{scene}-revoked/normalized-input.json')
        assert sha(raw(f'prepare-{scene}-enabled/normalized-input.json'))==identity['parents'][scene]['sha256']
        predicted=copy.deepcopy(enabled)
        for d in predicted['lineage']['pkg']['drills']:
            if d['boss']==boss:assert not d['revoked'];d['revoked']=True
        predicted['lineage']['sets'][0]['rows']=[r for r in predicted['lineage']['sets'][0]['rows'] if r.get('origin')!='drill:'+boss]
        assert predicted==revoked,'Public revoke changed more than drill flag and generated rows'
        actions=load(f'prepare-{scene}-revoked/actions.json');assert {'command':'revoke_drill','boss':boss,'revoked':True} in actions
        assert not any(a['command']=='revoke_drill' for a in load(f'prepare-{scene}-enabled/actions.json'))
        arms=['enabled-baseline','revoked-baseline','revoked-'+special,'revoked-corridor_fighting']
        if scene=='reflection':arms+=['enabled-reflect_read','enabled-corridor_fighting']
        initial=None
        for arm in arms:
            case=f'trace-{scene}-{arm}';state='revoked' if arm.startswith('revoked-') else 'enabled';parent=revoked if state=='revoked' else enabled
            assert load(case+'/normalized-input.json')==parent
            chosen=load(case+'/choice-parent.json');sent=load(case+'/send.json');run=sent['run']
            for key in ['gold','marks','clock_s','rng','bloodline','party','kennel','seed']:assert chosen['lineage'][key]==parent['lineage'][key]
            current={k:run.get(k) for k in ['hero','floor','monsters','rng','seed','id','route']}
            if initial is None:initial=current
            assert initial==current
            assert raw(case+'/after-fine.json')==raw(case+'/after-coarse.json')==raw(case+'/after.json')
            parity=load(case+'/observer-parity.json');events=load(case+'/events.json');frames=load(case+'/frames.json')
            assert parity=={'events':True,'save':True,'event_count':len(events)}
            assert [e for f in frames for e in f['events']]==events
            assert next(d for d in load(case+'/after.json')['lineage']['pkg']['drills'] if d['boss']==boss)['revoked']==(state=='revoked')
            first=[e for f in frames if f['before'] and f['before']['depth']==depth for e in f['events']]
            damage=sum(e['dmg'] for e in first if e['k']=='hurt' and e['id']==1)
            reflections=sum(e['k']=='attack' and e.get('dst')==1 and e.get('verb')=='reflect' for e in first)
            combat=[e for e in first if e['k'] in ['move','attack','hurt','heal','max_hp','spawn','die','overlay','projectile','use']]
            combat_hash=sha(json.dumps(combat,sort_keys=True,separators=(',',':')).encode())
            measured[(scene,arm)]={'hurt':damage,'reflections':reflections,'combat_hash':combat_hash}
            report=next(r for r in load('results.json') if r['scene']==scene and r['arm']==arm)['first_floor']
            assert report['total_hurt_damage']==damage and report['reflection_hits_at_hero']==reflections and report['combat_event_sha256']==combat_hash
            rows=chosen['lineage']['sets'][0]['rows'];quotes=[]
            for e in first:
                if e['k']=='rule' and e.get('verb',{}).get('a') in ['tag:summoned','reflect_read']:
                    assert 0<=e['row']<len(rows)
                    quotes.append({'event':e,'origin':rows[e['row']].get('origin')})
            all_quotes[scene+'/'+arm]=quotes[:4]
    assert len(measured)==10
    assert measured['reflection','enabled-baseline']['reflections']==0
    assert measured['reflection','revoked-baseline']['reflections']==7
    assert measured['reflection','revoked-reflect_read']['reflections']==0
    assert measured['reflection','revoked-corridor_fighting']['reflections']==22
    assert all(measured['reflection',a]['hurt']==26 for a in ['enabled-baseline','revoked-baseline','revoked-reflect_read'])
    assert len({measured['summoner',a]['combat_hash'] for a in ['enabled-baseline','revoked-baseline','revoked-boss_focus']})==1
    assert all_quotes['summoner/enabled-baseline'][0]['origin']=='drill:lich'
    assert all_quotes['summoner/revoked-boss_focus'][0]['origin']=='tactic:boss_focus'
    assert all_quotes['reflection/enabled-baseline'][0]['origin']=='drill:foundry_master'
    assert all_quotes['reflection/revoked-reflect_read'][0]['origin']=='tactic:reflect_read'
    common=None
    for card in ['baseline','reflect_read','corridor_fighting']:
        case='absence-reflection-enabled-'+card
        assert load(case+'/normalized-input.json')==load('prepare-reflection-enabled/after.json')
        current=load(case+'/common-away-parent.json')
        if common is None:common=current
        assert common==current
        after=load(case+'/after.json');report=load(case+'/report.json')
        assert report['elapsed_s']==after['lineage']['clock_s']-common['lineage']['clock_s']==28800
        assert after['lineage']['gold']-common['lineage']['gold']==report['gold']['net']==report['gold']['ledger']['net']
        assert report['gold']['ledger']['earned']-report['gold']['ledger']['spent']==report['gold']['net']
        assert load(case+'/actions.json')==[{'command':'set_worker','id':'scout','on':True}]
    catalogue=json.loads((root/'catalogue-six-scenes.json').read_text())
    assert len(catalogue['scenes'])==6 and sum(len(s['cases']) for s in catalogue['scenes'])==18
    assert sum(len(s['next8h_cases']) for s in catalogue['scenes'])==18
print(json.dumps({'integrity':'PASS','raw_files':len(manifest['files']),'exact_observer_pairs':10,'exact_initial_scene_inventory_pairs':10,
    'public_revoke_changes_only_flag_and_compiled_rows':True,'revocation_persists':True,'reflection_attacks_enabled_revoked_mirror':[0,7,0],
    'summoner_three_arms_same_combat_stream':True,'fired_row_origins':all_quotes,'actual8h_gold_accounting_checks':3,
    'ordinary_catalogue_with_cut287':'6 scenes /18 matched cases /18 next8h outcomes; two original seed identities',
    'six_counter_superiorities':'NOT_ESTABLISHED'},indent=2))
