#!/usr/bin/env python3
"""Derive actual recovering time by intersecting scheduled intervals with horizon.

This is independent of the native ten-second slice accumulator. Archived raw
hashes and basic schedule validity are checked by verify.py.
"""
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

r = Path('docs/evidence/cut306')
load = lambda p: json.loads(p.read_text())
with tempfile.TemporaryDirectory(prefix='idlever-cut306-recovery-') as td:
    out = Path(td)
    proc = subprocess.Popen(['zstd', '-dc', str(r / 'capture.tar.zst')], stdout=subprocess.PIPE)
    with tarfile.open(fileobj=proc.stdout, mode='r|') as tar:
        for item in tar:
            assert not item.name.startswith('/') and '..' not in Path(item.name).parts
            assert item.isfile() or item.isdir()
            path = out / item.name
            if item.isdir():
                path.mkdir(parents=True, exist_ok=True)
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(tar.extractfile(item).read())
    assert proc.wait() == 0
    count = 0
    for p in sorted((out / 'prototype').glob('*/*/result.json')):
        result = load(p)
        initial = load(p.with_name('prepared.json'))['lineage']
        start, end = initial['total_turns'], initial['total_turns'] + result['horizon_ticks']
        until = initial['persistent']['recovery_until_tick']
        intervals = [(start, until)] if until > start else []
        intervals += [(d['until_tick'] - d['actual_ticks'], d['until_tick']) for d in result['deaths']]
        intervals.sort()
        assert all(intervals[i][1] <= intervals[i+1][0] for i in range(len(intervals)-1))
        exact = sum(max(0, min(b, end) - max(a, start)) for a, b in intervals)
        assert exact == result['recovery_spent_ticks'], (p, exact, result['recovery_spent_ticks'])
        count += 1
    assert count == 16
    print('Independent scheduled-interval intersections match all16 native recovery-time accumulators.')
    subprocess.run(['python3', str(r / 'economy.py'), str(out)], check=True)
