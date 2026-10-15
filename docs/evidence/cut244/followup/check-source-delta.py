#!/usr/bin/env python3
"""Bind the small production delta separately from prior97e8 gate evidence."""
import difflib
import gzip
import hashlib
import json
import re
from pathlib import Path

root = Path('crates/idlever-core/src')
out = Path('docs/evidence/cut244/followup')
files = ['meta.rs', 'engine.rs', 'wire.rs', 'forecast.rs', 'trace.rs', 'provenance.rs', 'offline.rs']

def code(text):
    return '\n'.join(line for line in text.splitlines() if line.strip() and not line.lstrip().startswith('//'))

results = []
for name in files:
    manifest = json.loads((out / 'source-before.json').read_text())
    before = gzip.decompress(Path(manifest[str(root / name)]['archive']).read_bytes()).decode()
    after = (root / name).read_text()
    expected = before
    if name == 'meta.rs':
        for line in ['        "quartermaster" => auto("keeps best weapon+armour"),\n', '        "auto_supply" => auto("rebuys last supplies"),\n', '        "auto_insure" => auto("insures brought items"),\n']:
            assert expected.count(line) == 1
            expected = expected.replace(line, '')
    if name == 'engine.rs':
        for old, new in [('"forge ", "insure ", "hatch"', '"forge ", "hatch"'), ('"refund ", "insure ", "repeat "', '"refund ", "repeat "'), ('Some("converted" | "sheet" | "shelved" | "bones")', 'Some("converted" | "bones")')]:
            assert expected.count(old) == 1
            expected = expected.replace(old, new)
    if name == 'meta.rs':
        expected = expected.split('#[cfg(test)]')[0]
        after_code = after.split('#[cfg(test)]')[0]
    else:
        after_code = after
    expected_code = code(expected)
    removals = []
    if name == 'engine.rs':
        removals = [
            '    #[serde(default)]\n    pub shelved: BTreeMap<String, (u32, i32)>,\n',
            '        let shelved: Vec<String> = Vec::new();\n',
            '        for k in &shelved {\n            let kind = self.lineage.wire_name(k).replace(\'_\', " ");\n            match line.shelved.iter_mut().find(|c| c.kind == kind) {\n                Some(c) => c.n += 1,\n                None => line.shelved.push(crate::wire::KindCount { kind, n: 1 }),\n            }\n        }\n',
        ]
        assert expected_code.count('purse_full: false, shelved: Vec::new(), toll:') == 1
        expected_code = expected_code.replace('purse_full: false, shelved: Vec::new(), toll:', 'purse_full: false, toll:')
    if name == 'wire.rs':
        removals = ['    #[serde(default, skip_serializing_if = "Vec::is_empty")]\n    pub shelved: Vec<KindCount>,\n', '    #[serde(default, skip_serializing_if = "Vec::is_empty")]\n    pub shelved: Vec<SalvageRow>,\n']
    if name == 'offline.rs':
        removals = ['        shelved: b.shelved.iter().map(|(k, (n, g))| SalvageRow { kind: game.lineage.wire_name(k).replace(\'_\', " "), n: *n, gold: *g }).collect(),\n']
    for removal in removals:
        assert expected_code.count(removal) == 1, (name, removal)
        expected_code = expected_code.replace(removal, '')
    assert code(expected_code) == code(after_code), name
    (out / (name + '.diff')).write_text(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile=name + ':97e8', tofile=name + ':followup')))
    results.append({'path': str(root / name), 'beforeSha256': hashlib.sha256(before.encode()).hexdigest(), 'afterSha256': hashlib.sha256(after.encode()).hexdigest(), 'productionDeltaExactlyDeclared': True, 'commentOnly': name in ['forecast.rs', 'trace.rs', 'provenance.rs']})
before = gzip.decompress((out / 'meta.rs.before.gz').read_bytes()).decode()
after = (root / 'meta.rs').read_text()
block = lambda s: s.split('pub const UNLOCKS: &[UnlockDef] = &[', 1)[1].split('];', 1)[0]
assert block(before) == block(after)
ids = re.findall(r'\b(?:m|free|gold|oath)\("([^\"]+)"', block(after))
assert len(ids) == 44, len(ids)
assert not set(ids) & {'quartermaster', 'auto_supply', 'auto_insure'}
(out / 'source-delta-proof.json').write_text(json.dumps({'files': results, 'currentCatalogueIds': ids, 'catalogueInitializerByteIdentical': True, 'scope': 'Production changes are exactly3inactive descriptor arms,2insurance reason-prefix exceptions,2storage-only accepted exit fates,3shelved fields plus their dead loop/empty initializer/report reader; all other production deltas are comments. This proves no undeclared code delta. Current output equality remains a separate runtime check; arbitrary injected or nonempty historical inputs intentionally differ.'}, indent=2) + '\n')
print('PASS: exact declared delta;44current catalogue IDs unchanged')
