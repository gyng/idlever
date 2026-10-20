#!/usr/bin/env python3
"""Build an isolated source copy; exact anchors refuse silent rebase drift."""
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import sys

evidence = Path('docs/evidence/cut306')
identity = json.loads((evidence / 'ordinary-identity.json').read_text())
for name, digest in identity['core_sources'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest() == digest, name
dest = Path(tempfile.mkdtemp(prefix='idlever-cut306-core-'))
shutil.copytree('crates/idlever-core', dest / 'crates/idlever-core')
shutil.copy2('Cargo.toml', dest / 'Cargo.toml')
shutil.copy2('Cargo.lock', dest / 'Cargo.lock')
shutil.copy2(evidence / 'producer.rs', dest / 'crates/idlever-core/examples/upgrade_utility_probe.rs')
if sys.argv[1:] == ['--shipping']:
    Path('target/cut306/shipping-source-path.txt').write_text(str(dest) + '\n')
    print(dest)
    sys.exit(0)
assert not sys.argv[1:]

def change(name, old, new):
    path = dest / 'crates/idlever-core/src' / name
    raw = path.read_text()
    assert raw.count(old) == 1, (name, old, raw.count(old))
    path.write_text(raw.replace(old, new))

change('lib.rs', 'pub mod town;', 'pub mod town;\npub mod cut306_upgrades;')
change('town.rs', 'pub struct Town {', '''pub struct Town {
    #[serde(default, skip_serializing_if="std::collections::BTreeMap::is_empty")]
    pub levels: std::collections::BTreeMap<String, u32>,''')
change('town.rs', '(bank_nights() * l.last_night_net', '(crate::cut306_upgrades::bank_nights(l) * l.last_night_net')
change('town.rs', 'crate::tree::bonus_rank(l, "clerk") as i32;', 'crate::tree::bonus_rank(l, "clerk") as i32 + crate::cut306_upgrades::bank_bonus_permille(l);')
change('persistent.rs', 'recover_for(l, recovery_ticks(depth));', 'recover_for(l, crate::cut306_upgrades::recovery_ticks(l, depth));')
change('persistent.rs', 'Some(p.min(i32::MAX as u64) as i32)', 'Some(crate::cut306_upgrades::hurry_price(l, p.min(i32::MAX as u64) as i32))')
change('engine.rs', 'return crate::persistent::recovery_ticks(self.run.as_ref().map_or(self.lineage.best_depth, |r| r.max_depth)) as u32;', 'return crate::cut306_upgrades::recovery_ticks(&self.lineage, self.run.as_ref().map_or(self.lineage.best_depth, |r| r.max_depth)) as u32;')
change('engine.rs', '"supply wish", "hurry clone"].iter()', '"supply wish", "hurry clone", "upgrade "].iter()')
change('engine.rs', '    } else if why.starts_with("hire ") {\n        "hires"', '    } else if why.starts_with("upgrade ") {\n        "town"\n    } else if why.starts_with("hire ") {\n        "hires"')
shutil.copy2(evidence / 'prototype-upgrades.rs', dest / 'crates/idlever-core/src/cut306_upgrades.rs')
shutil.copy2(evidence / 'mechanics.rs', dest / 'crates/idlever-core/examples/upgrade_mechanics.rs')
Path('target/cut306/source-path.txt').write_text(str(dest) + '\n')
print(dest)
