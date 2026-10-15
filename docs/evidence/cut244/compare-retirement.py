#!/usr/bin/env python3
"""Compare actual baseline/candidate files, allowing only typed retired fields.

Every permitted removal is recorded with an exact JSON path and original value.
Unexpected missing/added keys, values, list lengths and numerical changes fail.
"""
import gzip
import json
import sys
from pathlib import Path


def read(path):
    data = Path(path).read_bytes()
    if str(path).endswith('.gz'):
        data = gzip.decompress(data)
    return json.loads(data)


def compare(before, after):
    removals, failures = [], []

    def walk(old, new, path):
        if type(old) is not type(new):
            failures.append({'path': path, 'reason': 'type', 'before': old, 'after': new})
            return
        if isinstance(old, dict):
            allowed = {}
            if {'version', 'lineage', 'history', 'run'} <= old.keys():
                allowed.update(loadout=[], pending_exit=None)
            if {'lineage', 'loadout'} == old.keys():
                allowed['loadout'] = []  # SentState
            if {'seed', 'next_run_id', 'supplies', 'tree', 'vault'} <= old.keys():
                allowed.update(vault=[], insured=[], keep_pref='best_weapon')
            if path.endswith('/tree') and {'hired', 'done', 'chest'} <= old.keys():
                allowed.update(worn=[], sends=[0, 0])
            if path.endswith('/orders') and {'forge', 'insure'} <= old.keys():
                allowed['insure'] = True
            if {'runs', 'salvaged', 'gold_earned'} <= old.keys():
                allowed.update(found=[], shelved={})  # Batch; only empty retired metadata
            if {'elapsed_s', 'runs', 'exits'} <= old.keys():
                allowed.update(found=[], shelved=[])  # ReturnReport
            if {'tier', 'carried', 'keep_pct', 'kept', 'run_id'} <= old.keys():
                allowed['shelved'] = []  # ExitLine; numeric kept and all Gold stay exact
            if {'id', 'via', 'clock_s', 'depth', 'turns', 'gold'} <= old.keys():
                allowed['kept'] = []  # RunRec, never numeric ExitLine.kept
            if path.endswith('/stake') and {'loot', 'death_keep', 'kept'} <= old.keys():
                allowed['brought'] = []
            for key in sorted(old.keys() - new.keys()):
                if key not in allowed or old[key] != allowed[key]:
                    failures.append({'path': path + '/' + key, 'reason': 'undeclared or nonempty removal', 'before': old[key]})
                else:
                    removals.append({'path': path + '/' + key, 'before': old[key]})
            for key in sorted(new.keys() - old.keys()):
                failures.append({'path': path + '/' + key, 'reason': 'new key', 'after': new[key]})
            for key in sorted(old.keys() & new.keys()):
                walk(old[key], new[key], path + '/' + key)
        elif isinstance(old, list):
            if len(old) != len(new):
                failures.append({'path': path, 'reason': 'length', 'before': len(old), 'after': len(new)})
            else:
                for index, (a, b) in enumerate(zip(old, new)):
                    walk(a, b, path + '/' + str(index))
        elif old != new:
            failures.append({'path': path, 'reason': 'value', 'before': old, 'after': new})

    walk(before, after, '')
    return {'exactExceptDeclaredTypedRemovals': not failures, 'removals': removals, 'failures': failures}


if __name__ == '__main__':
    result = compare(read(sys.argv[1]), read(sys.argv[2]))
    Path(sys.argv[3]).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'removed': len(result['removals']), 'failures': len(result['failures'])}))
    sys.exit(bool(result['failures']))
