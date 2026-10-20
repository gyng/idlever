#!/usr/bin/env python3
"""Descriptive resource tradeoffs, added after utility results; no new inference."""
import json
from pathlib import Path
import sys

evidence = Path('docs/evidence/cut306')
root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('target/cut306')
load = lambda p: json.loads(p.read_text())
rows = []
for ctx in load(evidence / 'spec.json')['contexts']:
    label = ctx['label']
    values = {}
    terms = {}
    for role in ('unchanged', 'bank-first', 'vat-first'):
        branch = root / 'prototype' / label / role
        before = load(branch / 'canonical.json')['lineage']
        after = load(branch / 'after.json')['lineage']
        term = {k: after['gold_tally'].get(k, 0) - before['gold_tally'].get(k, 0)
                for k in set(after['gold_tally']) | set(before['gold_tally'])}
        interest = after['town']['interest'] - before['town']['interest']
        wealth = after['gold'] + after['town']['bank'] - before['gold'] - before['town']['bank']
        assert wealth == interest + sum(v for k, v in term.items() if k != 'bank')
        values[role] = {'wealth': wealth, 'interest': interest,
                        'completed': after['persistent']['completed'] - before['persistent']['completed'],
                        'tithes': after['feats'].get('tithed', 0) - before['feats'].get('tithed', 0),
                        'rations': after['feats'].get('rations', 0) - before['feats'].get('rations', 0),
                        'available_legacy': after['bloodline']['points'] - before['bloodline']['points'],
                        'spent_legacy': after['bloodline']['spent'] - before['bloodline']['spent'],
                        'ended': after['ended']}
        terms[role] = term
    for role in ('bank-first', 'vat-first'):
        diff = {k: values[role][k] - values['unchanged'][k] for k in values[role] if k != 'ended'}
        termdiff = {k: terms[role].get(k, 0) - terms['unchanged'].get(k, 0)
                    for k in set(terms[role]) | set(terms['unchanged'])}
        termdiff = {k: v for k, v in sorted(termdiff.items()) if v}
        rows.append({'context': label, 'role': role, 'difference_from_unchanged': diff,
                     'gold_term_differences': termdiff, 'baseline_ended': values['unchanged']['ended'],
                     'treatment_ended': values[role]['ended']})
result = {'scope': 'post-result descriptive accounting; no equivalence/superiority or monetary Legacy valuation',
          'rows': rows}
if len(sys.argv) > 1:
    assert result == load(evidence / 'economy.json')
    print('Archived descriptive economy accounting matches, including all wallet/Legacy/tithe tradeoffs.')
else:
    (evidence / 'economy.json').write_text(json.dumps(result, indent=2) + '\n')
    for row in rows:
        print(row['context'], row['role'], row['difference_from_unchanged'], row['gold_term_differences'])
