"""Exact cross-schema comparison: inventory only added Run.last_visible state.

This never participates in current whole/sliced/reloaded equality checks, which
must remain byte-exact. It does not remove or normalize provenance or reports.
"""
import argparse
import datetime
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('before')
parser.add_argument('after')
parser.add_argument('out')
args = parser.parse_args()

def read(path):
    data = Path(path).read_bytes()
    return gzip.decompress(data) if path.endswith('.gz') else data

before_bytes, after_bytes = read(args.before), read(args.after)
before, after = json.loads(before_bytes), json.loads(after_bytes)
additions = []

def compare(a, b, path=''):
    assert type(a) is type(b), f'type changed at {path}'
    if isinstance(a, dict):
        assert a.keys() <= b.keys(), f'removed keys at {path}: {a.keys() - b.keys()}'
        extra = b.keys() - a.keys()
        if extra:
            assert extra == {'last_visible'}, f'unexpected added keys at {path}: {extra}'
            assert {'hero', 'monsters', 'turn', 'depth', 'floor'} <= a.keys(), f'not a Run at {path}'
            ids = b['last_visible']
            assert isinstance(ids, list) and ids, f'expected nonempty ordered IDs at {path}'
            assert all(type(i) is int and 0 <= i <= 4294967295 for i in ids), f'invalid IDs at {path}'
            additions.append({'path': path + '/last_visible', 'ids': ids})
        for k, v in a.items():
            compare(v, b[k], path + '/' + k)
    elif isinstance(a, list):
        assert len(a) == len(b), f'length changed at {path}'
        for i, (x, y) in enumerate(zip(a, b)):
            compare(x, y, f'{path}/{i}')
    else:
        assert a == b, f'value changed at {path}: {a!r} != {b!r}'

compare(before, after)
out = Path(args.out)
assert not out.exists(), 'Preserve earlier comparisons'
out.parent.mkdir(parents=True, exist_ok=True)
result = {
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'status': 'PASS',
    'scope': 'Cross-schema source-boundary inventory only. Every pre-existing value, including full provenance/report/Gold, is exact. Current continuation equality must be checked independently without normalization.',
    'before': {'path': args.before, 'rawSha256': hashlib.sha256(before_bytes).hexdigest()},
    'after': {'path': args.after, 'rawSha256': hashlib.sha256(after_bytes).hexdigest()},
    'onlyChange': 'Added nonempty ordered u32 Run.last_visible vectors',
    'additions': additions,
}
out.write_text(json.dumps(result, indent=2) + '\n')
print(f'PASS: {len(additions)} newly persisted visibility vectors, all existing values exact')
