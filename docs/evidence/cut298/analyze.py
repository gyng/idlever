#!/usr/bin/env python3
"""Read and verify Cut298 fixed public-action receipts; never edit game state."""
import collections
import copy
import hashlib
import json
from pathlib import Path
import sys

base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('target/cut298')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
load = lambda p: json.loads(p.read_text())

def queen(row):
    return row.get('origin') == 'player' and row['verb'] == {'v':'read','a':'silence'} and {'k':'foe_tag','t':'brood'} in row['conds']

def expected(source, variant):
    result = copy.deepcopy(source)
    if variant in ('unchanged','unchanged-repeat'):
        return result
    lineage = result['lineage']
    for rows in (lineage['sets'][lineage['active_set']]['rows'], lineage['pkg']['pen']):
        found = [i for i, r in enumerate(rows) if queen(r)]
        assert len(found) == 1
        index = found[0]
        if variant == 'no-queen-pen':
            rows.pop(index)
        else:
            assert variant == 'contact-queen-pen'
            assert rows[index]['conds'] == [{'k':'foe_tag','t':'brood'},{'k':'hp>','n':45}]
            rows[index]['conds'] = [{'k':'foe_tag','t':'brood'},{'k':'adj>=','n':1}]
    return result

summary = {'scope':'Four historical camps from two regression seeds (two intervention parents plus two context parents); 10 fixed8h continuations, including repeats. No population, gate or adoption claim.', 'cases':[]}
total_runs = 0
for phase in ('capture','contact'):
    for camp in sorted((base / phase).iterdir()):
        canonical = load(camp / 'canonical.json')
        for branch in sorted(p for p in camp.iterdir() if p.is_dir()):
            prepared = load(branch / 'prepared.json')
            assert prepared == expected(canonical,branch.name), (camp.name,branch.name,'unexpected preparation mutation')
            result = load(branch / 'result.json')
            after = load(branch / 'after.json')
            assert result['requested_seconds'] == 28800
            assert after['lineage']['clock_s']-prepared['lineage']['clock_s'] == 28800
            assert after['lineage']['gold']+after['lineage']['town']['bank']==after['lineage']['tree']['ledger']
            reads = []
            expirations = []
            metrics = [0,0,0]
            runs = []
            for record in result['records']:
                rid = record['record']['id']
                raw = load(branch / f'run-{rid:06}.json')
                capsule = load(branch / f'send-{rid:06}.json')
                assert capsule['game']['run']['turn'] == 0
                assert not capsule['inputs']
                assert raw['public_events_exact']
                assert raw['record'] == record['record']
                assert raw['replay']['hash'] == record['replay_hash']
                assert raw['replay']['ticks'] == record['record']['turns']
                terminal = raw['terminal_run']
                assert terminal['turn'] == raw['record']['turns']
                assert terminal['depth'] == raw['record']['depth']
                for i,v in enumerate(raw['queen_ticks']): metrics[i]+=v
                current = None
                frame_t = -1
                for frame in raw['frames']:
                    before,p = frame['before'],frame['after']
                    assert p['t'] > frame_t
                    frame_t = p['t']
                    if before:
                        assert p['t'] == before['t']+1
                    if before and before['silence'] == 0 and p['silence'] > 0:
                        current = {'run_id':rid,'t':p['t'],'hero_hp_after_read':p['hero_hp'],
                            'hero_max_hp':p['hero_max_hp'],'queen_hp_at_read':p['queen_hp'],
                            'queen_chebyshev_after_read':max(abs(p['hero_pos'][k]-p['queen_pos'][k]) for k in ('x','y')),
                            'queen_min_hp_during_window':p['queen_hp'],'queen_max_hp':p['queen_max_hp'],
                            'max_brood_during_window':p['brood']}
                        reads.append(current)
                    if current:
                        current['queen_min_hp_during_window']=min(current['queen_min_hp_during_window'],p['queen_hp'])
                        current['max_brood_during_window']=max(current['max_brood_during_window'],p['brood'])
                    if before and before['silence'] > 0 and p['silence'] == 0:
                        if p['queen_hp'] > 0:
                            assert current is not None
                            expirations.append({**current,'expired_t':p['t'],'queen_hp_at_expiry':p['queen_hp'],
                                'queen_visible_at_expiry':p['queen_visible'],'brood_at_expiry':p['brood']})
                        current = None
                runs.append({'record':raw['record'],'replay_hash':raw['replay']['hash'],'queen_ticks':raw['queen_ticks']})
                total_runs += 1
            assert len(runs) == len(list(branch.glob('run-*.json'))) == len(list(branch.glob('send-*.json')))
            untouched = [e for e in expirations if e['queen_min_hp_during_window']==e['queen_max_hp'] and e['queen_hp_at_expiry']==e['queen_max_hp']]
            summary['cases'].append({'camp':camp.name,'variant':branch.name,'phase':phase,'runs':runs,'best':result['best'],
                'outcomes':dict(collections.Counter(r['record']['tier'] for r in runs)),
                'gold':result['gold'],'bank':result['bank'],'gold_delta':result['gold']-prepared['lineage']['gold'],
                'total_tick_delta':after['lineage']['total_turns']-prepared['lineage']['total_turns'],
                'finish_run_ticks_past_budget':max(0,after['lineage']['total_turns']-prepared['lineage']['total_turns']-288000),
                'queen_ticks':metrics,'packing':load(branch/'packing.json'),'reads':reads,'alive_expirations':expirations,
                'untouched_full_health_expirations':len(untouched),
                'queen_not_adjacent_after_read':sum(r['queen_chebyshev_after_read']>1 for r in reads),
                'post_read_hp_below_45pct':sum(r['hero_hp_after_read']*100<=45*r['hero_max_hp'] for r in reads),
                'prepared_sha256':sha(branch/'prepared.json'),'after_sha256':sha(branch/'after.json'),
                'report_sha256':sha(branch/'report.json')})
for camp in sorted((base/'capture').glob('TUNED*')):
    a,b=camp/'unchanged',camp/'unchanged-repeat'
    assert {p.name for p in a.iterdir()}=={p.name for p in b.iterdir()}
    for p in a.iterdir():
        assert p.read_bytes()==(b/p.name).read_bytes(), (camp.name,p.name,'repeat differs')
summary['actual_completed_runs'] = total_runs
summary['repeat_controls_byte_exact'] = 2
summary['game_default_changed'] = False
output = Path(sys.argv[2]) if len(sys.argv)>2 else Path('docs/evidence/cut298/summary.json')
output.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'cases':len(summary['cases']),'actual_completed_runs':total_runs,'repeat_controls':2,
    'outcomes':[{k:c[k] for k in ('camp','variant','best','outcomes','gold_delta','untouched_full_health_expirations','queen_not_adjacent_after_read')} for c in summary['cases']]},indent=2))
