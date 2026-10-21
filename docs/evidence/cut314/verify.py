#!/usr/bin/env python3
"""Independent deterministic accounting and transport audit; no population claim."""
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent

def sha(data):
    return hashlib.sha256(data).hexdigest()

def residents(s):
    return [s] + list(s['others'].values())

def audit(d):
    labels = set()
    for x in d['refusals']:
        assert x['before'] == x['after'] and x['error']
        labels.add(x['label'])
    assert labels == {'unknown','unbuilt','no-clerk','vat-unearned','depth','away','stale-price','gold-only','combined-poor','max-level'}
    payments = [p for seq in d['sequences'] for p in seq['purchases']] + [d['legacy_chest'],d['gold_only']]
    assert len(payments) == 10
    for p in payments:
        expected = copy.deepcopy(p['before'])
        l = expected['lineage']
        receipt = p['receipt']
        request = p['request']
        payer = expected['selected']
        ident = request['id']
        level = l['town'].get('levels',{}).get(ident, 2 if ident == 'bank' else 1) + 1
        price = 3400 if level == (3 if ident == 'bank' else 2) else 43200
        purse = l['gold'] - l['tree']['chest']
        needed = max(0, price - purse)
        assert price <= request['max_price']
        assert needed == 0 or request['use_savings']
        assert needed <= l['town']['bank']
        def move(delta, why, term):
            l['gold'] += delta
            l['gold_tally'][term] = l['gold_tally'].get(term,0) + delta
            if term != 'bank':
                l['tree']['ledger'] += delta
            line = {'t':l['total_turns'], 'delta':delta, 'why':why}
            if payer != 1:
                line['bloodline_id'] = payer
            ledger = l['gold_ledger']
            if ledger and ledger[-1]['t'] == line['t'] and ledger[-1]['why'] == why and ledger[-1].get('bloodline_id',1) == payer:
                ledger[-1]['delta'] += delta
            else:
                ledger.append(line)
            l['gold_ledger'] = ledger[-80:]
        if needed:
            l['town']['bank'] -= needed
            move(needed,'bank withdraw','bank')
        move(-price,f'upgrade {ident} {level}','town')
        l['town'].setdefault('levels',{})[ident] = level
        for g in expected['others'].values():
            other = g['lineage']
            for key in ['gold','gold_tally','gold_ledger']:
                other[key] = copy.deepcopy(l[key])
            for key in ['bank','levels']:
                other['town'][key] = copy.deepcopy(l['town'][key])
            other['tree']['ledger'] = l['tree']['ledger']
        assert expected == p['after'], f'whole payment delta {ident} {level}'
        assert receipt == dict(payer=payer,id=ident,level=level,price=price,withdrawal=needed,
                               gold_after=l['gold'],purse_after=l['gold']-l['tree']['chest'],savings_after=l['town']['bank'])
        for g in residents(expected):
            a = g['lineage']
            assert a['gold'] + a['town']['bank'] == a['tree']['ledger']
        for q in p['quotes']:
            assert q['purse'] == purse and q['savings'] == p['before']['lineage']['town']['bank']
            assert q['withdrawal'] == max(0,q['offer']['price']-purse)
    for seq in d['sequences']:
        assert seq['slots'] in [2,3]
        assert len(seq['before']['others']) == seq['slots']-1
        assert seq['before']['lineage']['best_depth'] == 0
        assert seq['before']['lineage']['persistent']['defeats'] == 0
        assert all(q['offer']['ready'] and q['home'] for q in seq['quotes'])
        assert [p['receipt']['price'] for p in seq['purchases']] == [3400,3400,43200,43200]
        end = seq['purchases'][-1]['after']
        for g in residents(end):
            assert g['lineage']['town']['levels'] == {'bank':4,'device':3}
            assert g['lineage']['persistent']['recovery_ticks'] == 12000
            assert g['lineage']['rest_left'] == 12000
    life = d['lifecycle']
    assert len(life['before']['others']) == 1 and len(life['after']['others']) == 2
    assert life['resident_price'] == 250
    assert life['before']['lineage']['gold'] + life['before']['lineage']['town']['bank'] == 106800
    for g in residents(life['after']):
        l = g['lineage']
        assert l['town']['levels'] == {'bank':4,'device':3}
        assert l['gold'] + l['town']['bank'] == 106550 == l['tree']['ledger']
    future = d['future_death']
    assert future['duration_ticks'] == 7800
    assert future['after']['lineage']['persistent']['recovery_ticks'] == 7800
    # Event representation is checked against the actual tagged enum below.
    assert any(e.get('k') == 'rest' and e.get('seconds') == 780 for e in future['events'])
    bg = d['paid_background']
    assert bg['seconds'] == 1300
    for g in residents(bg['after']):
        assert g['lineage']['town']['levels'] == {'bank':4,'device':3}
    assert d['legacy_chest']['receipt']['withdrawal'] == 3300
    assert d['legacy_chest']['after']['lineage']['tree']['chest'] == 900
    assert d['gold_only']['request']['use_savings'] is False
    assert d['gold_only']['receipt']['withdrawal'] == 0
    return {'refusals':len(labels),'whole_payment_audits':len(payments),'resident_scopes':[2,3]}

def main():
    manifest = json.loads((ROOT/'manifest.json').read_text())
    for name,digest in manifest['artifacts'].items():
        assert sha((ROOT/name).read_bytes()) == digest, name
    unpacked = {}
    for name in ['source.tar.zst','captures.tar.zst','test-fixtures.tar.zst']:
        raw = subprocess.check_output(['zstd','-q','-d','-c',str(ROOT/name)])
        with tarfile.open(fileobj=io.BytesIO(raw)) as t:
            files = {m.name:t.extractfile(m).read() for m in t.getmembers() if m.isfile()}
        expected = manifest['archives'][name]
        assert set(files) == set(expected)
        for path, data in files.items():
            assert sha(data) == expected[path], path
        unpacked[name] = files
    assert {n:sha(data) for n,data in unpacked['test-fixtures.tar.zst'].items()} == json.loads((ROOT/'test-fixtures.json').read_text())
    sources = unpacked['source.tar.zst']
    for label in ['base','derived']:
        identity = json.loads((ROOT/(label+'-source.json')).read_text())
        assert {p[len(label)+1:]:sha(data) for p,data in sources.items() if p.startswith(label+'/')} == identity
    changed = {p.removeprefix('derived/') for p,data in sources.items() if p.startswith('derived/') and sources.get('base/'+p.removeprefix('derived/')) != data}
    assert changed == {'crates/idlever-core/src/lib.rs','crates/idlever-core/src/town.rs',
                       'crates/idlever-core/src/persistent.rs','crates/idlever-core/src/engine.rs',
                       'crates/idlever-core/src/bloodlines.rs','crates/idlever-core/src/cut306_upgrades.rs',
                       'crates/idlever-core/examples/shared_upgrade_probe.rs','crates/idlever-core/examples/cut314-budget.json'}
    files = unpacked['captures.tar.zst']
    identity = json.loads((ROOT/'capture-identity.json').read_text())
    assert sha(files['input.json']) == identity['input']['sha256']
    assert sha((ROOT/'budget.json').read_bytes()) == identity['profile_sha256']
    assert sources['derived/crates/idlever-core/examples/cut314-budget.json'] == (ROOT/'budget.json').read_bytes()
    assert json.loads(files['mechanics.json'])['profile'] == json.loads((ROOT/'budget.json').read_text())
    for name in ['mechanics-final','shipping-replay','prototype-replay']:
        receipt = json.loads((ROOT/'validation'/(name+'-exit.json')).read_text())
        assert receipt['status'] == 0
    result = audit(json.loads(files['mechanics.json']))
    for name in ['game.json','before.json','read.json','after.json','report.json','replays.json']:
        assert files['shipping/'+name] == files['prototype/'+name], name
    assert json.loads(files['shipping/replays.json']), 'must contain held replay'
    print(json.dumps({'status':'PASS','scope':'controlled mechanics and earned no-level parity',**result,'byte_identical_parity_files':6},indent=2))

if __name__ == '__main__':
    main()
