#!/usr/bin/env python3
"""Summarize immutable advanced_campaign outputs; no gameplay edits."""
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path('target/cut296')
OUT = Path('docs/evidence/cut296')

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def load(p):
    return json.loads(p.read_text())

summary = {'scope': 'One genuine historical seed-1 Caster camp, replayed on current baseline and bounded policy trial; no population claim', 'input': {}, 'studies': {}}
source = Path('docs/evidence/cut257/earned/caster-seed1/campaign/paired-frontier.session.json')
summary['input'] = {'path': str(source), 'sha256': sha(source)}
for name in ('baseline', 'candidate'):
    root = ROOT / name
    if not (root / 'state.json').exists():
        continue
    state = load(root / 'state.json')
    assert state['paired'] and state['status'] == 'ALL_STAGES_OBSERVED'
    original = root / 'original.session.json'
    assert original.read_bytes() == source.read_bytes()
    study = {'config': state['config'], 'branches': {}}
    for label in ('no-selection', 'parent-only', 'selected'):
        branch = root / 'pair' / label
        result = load(branch / 'result.json')
        receipts = load(branch / 'receipts.json')
        assert result['requested_seconds'] == 28800
        assert result['no_selection_source_unchanged']
        assert [r['run'] for r in receipts] == result['actual_runs']
        counts = collections.Counter()
        for r in receipts:
            reconstruction = load(branch / f"run-{r['run']['id']:06}.reconstruction.json")
            assert reconstruction['public_replay_events_exact']
            assert reconstruction['public_replay_hash'] == r['replay_hash']
            assert reconstruction['actual_record'] == r['run']
            for it in r['interactions']:
                counts[f"{it['skill']['id']}|{it['phase']}|{it['effect']}|{it['amount']}"] += 1
        rows = load(branch / 'branch-row-reasons.json')['rows']
        relevant = [x for x in rows if 'caster_conduct' in (x['row'].get('origin') or '') or x['row']['verb']['v'] == 'slow']
        study['branches'][label] = {
            'requested_seconds': 28800, 'runs': len(receipts),
            'outcomes': dict(collections.Counter(r['run']['tier'] for r in receipts)),
            'depths': [r['run']['depth'] for r in receipts],
            'before': result['before'], 'after': result['after'],
            'actions': load(branch / 'actions.json'),
            'interactions': dict(sorted(counts.items())), 'slow_and_conduct_rows': relevant,
            'receipts_sha256': sha(branch / 'receipts.json'),
            'result_sha256': sha(branch / 'result.json'),
        }
    summary['studies'][name] = study
if len(summary['studies']) == 2:
    comparisons = {}
    for label in ('no-selection', 'parent-only'):
        a, b = [ROOT / n / 'pair' / label for n in ('baseline', 'candidate')]
        comparisons[label] = {f: (a / f).read_bytes() == (b / f).read_bytes() for f in ('receipts.json', 'after.session.json', 'departures.json', 'branch-row-reasons.json')}
        assert all(comparisons[label].values()), comparisons
    summary['unchanged_control_branches'] = comparisons
    interactions = summary['studies']['candidate']['branches']['selected']['interactions']
    summary['candidate_nonzero_conduct_payoffs'] = sum(v for k, v in interactions.items() if k.startswith('path:caster_conduct|applied|slow|') and int(k.split('|')[-1]) > 0)
(OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({'branches': {n: {k: {'runs': v['runs'], 'outcomes': v['outcomes'], 'interactions': v['interactions']} for k,v in s['branches'].items()} for n,s in summary['studies'].items()}, 'candidate_nonzero_conduct_payoffs': summary.get('candidate_nonzero_conduct_payoffs')}, indent=2))
