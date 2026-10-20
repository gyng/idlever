"""Independent raw archive/public preparation/observer/outcome reconstruction."""
from pathlib import Path
import hashlib
import json
import subprocess
import tarfile
import tempfile
r=Path('docs/evidence/cut293');m=json.loads((r/'manifest.json').read_text());identity=json.loads((r/'identity.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((r/'capture.tar.zst').read_bytes())==m['archive_sha256']
for name,digest in identity['files'].items():assert sha((r/name).read_bytes())==digest
with tempfile.TemporaryDirectory(prefix='idlever-cut293-verify-') as scratch:
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
    from collections import Counter
    selection=json.loads((r/'selection.json').read_text());results={x['case']:x for x in json.loads((r/'results.json').read_text())};quotes=json.loads((r/'actual-event-quotes.json').read_text())
    commands=json.loads((r/'command-results.json').read_text());retry=json.loads((r/'gunner-command-results.json').read_text())
    assert len(commands)==14 and sum(x['exit']==0 for x in commands)==12
    assert {x['case'] for x in commands if x['exit']}=={'gunner-long_gun-baseline','gunner-short_gun-baseline'}
    assert len(retry)==2 and all(x['exit']==0 for x in retry)
    for cls,info in selection['parents'].items():
        import gzip
        source=Path(info['path']).read_bytes();assert sha(source)==info['gzip_sha256']
        assert gzip.decompress(source)==raw(cls+'-input.json') and sha(raw(cls+'-input.json'))==info['raw_sha256']
    worlds={};parents={};observed={};n=0
    for cls,weapon,policy in selection['cases']:
        label='-'.join([cls,weapon,policy]);d=label+('-correct-api' if cls=='gunner' else '');f=lambda name:load(d+'/'+name+'.json')
        before=f('normalized-input');chosen=f('policy-parent');ready=f('ready-save');sent=f('sent');initial=f('initial-run');after=f('absence-after');report=f('absence-report');events=f('events');row=results[label]
        assert before.get('run') is None and before['lineage']['start']==1 and 'scout' in before['lineage']['tree']['paused']
        ignored={'lineage','stall'} if cls=='caster' and policy=='authored' else {'lineage'}
        assert {k:v for k,v in before.items() if k not in ignored}=={k:v for k,v in chosen.items() if k not in ignored}
        if 'stall' in ignored:assert chosen['stall']=={'runs':0,'depth':0,'exit_rows':{},'traces':{},'absent_rows':{}}
        a=before['lineage'];b=chosen['lineage'];changes={k for k in a.keys()|b.keys() if a.get(k)!=b.get(k)}
        actions=f('policy-actions')
        if policy=='baseline':assert not actions and raw(d+'/normalized-input.json')==raw(d+'/policy-parent.json')
        elif cls=='fighter':
            assert changes=={'class_paths','sets'}
            assert [x['id'] for x in actions]==['fighter_warden','fighter_recovery','fighter_reaver']
            assert set(b['class_paths']['fighter'])=={'fighter_warden','fighter_recovery','fighter_reaver'}
            for x in actions:
                offer=next(v for v in x['offers_before']['nodes'] if v['id']==x['id']);assert offer['available'] and not offer['owned']
                assert x['offers_before']['points']-x['offers_after']['points']==1 and x['offers_after']['spent']-x['offers_before']['spent']==1
        else:
            assert cls=='caster' and changes=={'sets','pkg','honours'} and a['pkg']['pen_open']
            assert {k:v for k,v in a['pkg'].items() if k!='pen'}=={k:v for k,v in b['pkg'].items() if k!='pen'}
            assert b['pkg']['pen']==actions[0]['added'] and [x['verb']['v'] for x in b['pkg']['pen']]==['ward','bolt']
            expected=dict(a['honours']);expected['earned']=dict(expected['earned'],pen_row=4);assert expected==b['honours']
        for key in ['gold','marks','clock_s','rng','class','classes','hero_legacy','tree','party','kit','starting_config']:
            assert a[key]==b[key],(label,key)
        changed={k for k in b.keys()|ready['lineage'].keys() if b.get(k)!=ready['lineage'].get(k)}
        if cls=='gunner':
            assert changed<= {'kit'}
            old=dict(b['kit']);new=dict(ready['lineage']['kit']);old.pop('gun_choice',None);new.pop('gun_choice',None);assert old==new and new['short_gun']==1
            assert f('loadout-action')['method']=='choose_firearm'
        else:
            assert changed=={'starting_config'}
            expected=dict(b['starting_config'],weapon=weapon);assert ready['lineage']['starting_config']==expected
            offer=next(o for o in f('gear-offers-before')['weapons'] if o['kind']==weapon);assert offer['available'] and offer['compatible']
        group=(cls,policy);parent=raw(d+'/policy-parent.json');world={k:initial[k] for k in ['floor','monsters','rng']}
        if group in parents:assert parent==parents[group] and world==worlds[group]
        parents[group]=parent;worlds[group]=world
        assert initial==sent['run'] and initial['turn']==0 and initial['hero']['class']==cls and initial['hero']['weapon']['kind']==weapon
        assert events==f('events-coarse') and raw(d+'/after-fine.json')==raw(d+'/after-coarse.json')
        assert report==f('absence-repeat-report') and raw(d+'/absence-after.json')==raw(d+'/absence-repeat-after.json')
        assert report['elapsed_s']==after['lineage']['clock_s']-sent['lineage']['clock_s']==28800
        gold=report['gold'];net=after['lineage']['gold']-sent['lineage']['gold'];assert net==gold['net']==gold['ledger']['net']==gold['ledger']['earned']-gold['ledger']['spent']
        last=f('after-fine')['lineage']['last_run'];assert (last['depth'],last['tier'],last['turns'],net,gold.get('lost',0))==(row['depth'],row['exit'],row['ticks'],row['net_gold'],row['gold_lost'])
        assert row['hurt']==sum(e['dmg'] for e in events if e['k']=='hurt' and e.get('id')==1)
        rule=Counter();attack=Counter()
        for e in events:
            if e['k']=='rule':rule[e['verb']['v']]+=1
            if e['k']=='attack' and e['src']==1:attack[e.get('verb','attack')]+=1
        assert dict(attack)==row['hero_attack_verbs']
        for k,v in row['class_rows_fired'].items():assert rule[k]==v
        if policy=='authored':
            required=['cleave','shield_bash','second_wind'] if cls=='fighter' else ['ward','bolt']
            assert all(rule[v]>0 for v in required)
        for q in quotes:
            if q['case']==label:assert q['actual_event'] in events
        replay=f('replay');re=[e for floor in replay['floors'] for e in floor['events']];i=next(i for i,e in enumerate(events) if e['k']=='exit');j=next(i for i,e in enumerate(re) if e['k']=='exit')
        assert i==j and events[:i]==re[:j] and replay['ticks']==last['turns']
        assert row['pre_exit_event_count']==i and row['pre_exit_events_exact'] and row['public_replay_events_match_watched']==(events==re)
        observed[label]=events;n+=1
    assert n==14 and len(parents)==7 and len(results)==14
    assert observed['caster-dagger-authored']==observed['caster-bow-authored']
    for weapon in ['long_gun','short_gun']:
        d='gunner-'+weapon+'-baseline';assert load(d+'/failure.json')=={'error':'gear not unlocked'} and not (scratch/d/'sent.json').exists()
    result={'status':'PASS','raw_receipts':len(seen),'completed_cases':14,'retained_failed_preparations':2,'matched_initial_world_pairs':7,'exact_full_event_and_terminal_save_observer_pairs':14,'exact_8h_report_and_save_repeat_pairs':14,'reconciled_gold_ledgers':14,'exact_public_replay_pre_exit_event_streams':14,'authored_class_action_branches':4,'full_replay_event_equality_claimed':False,'visual_acceptance_claimed':False}
    (r/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
