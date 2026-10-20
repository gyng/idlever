#!/usr/bin/env python3
"""Verify that post-run driver cleanup preserves all original test tokens."""
import hashlib
import json
from pathlib import Path
import re

r = Path('docs/evidence/cut306')
frozen = (r / 'mechanics.rs').read_text()
corrected = (r / 'validation-source/mechanics.rs').read_text()
identity = json.loads((r / 'validation-source/identity.json').read_text())
assert hashlib.sha256(frozen.encode()).hexdigest() == identity['frozen_driver_sha256']
assert hashlib.sha256(corrected.encode()).hexdigest() == identity['corrected_driver_sha256']
original_body = frozen.removesuffix('\nfn main() {}\n')
assert corrected.startswith('#[cfg(test)]\nmod tests {\n')
assert corrected.endswith('}\nfn main() {}\n')
corrected_body = corrected.removeprefix('#[cfg(test)]\nmod tests {\n').removesuffix('}\nfn main() {}\n')
# Preserve complete string literals; ignore only formatting whitespace.
tokens = lambda s: re.findall(r'"(?:\\.|[^"\\])*"|[^\s]', s)
assert tokens(original_body) == tokens(corrected_body)
assert frozen.count('#[test]') == corrected.count('#[test]') == 3
print('Corrected driver preserves all three tests/imports/fixtures token-for-token; only cfg wrapper/format changes.')
