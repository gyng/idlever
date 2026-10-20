#!/usr/bin/env python3
"""Reproduce the prototype with its cleaned validation driver, no rule changes."""
from pathlib import Path
import subprocess
import shutil

subprocess.run(['python3', 'docs/evidence/cut306/prepare-prototype.py'], check=True)
source = Path(Path('target/cut306/source-path.txt').read_text().strip())
shutil.copy2('docs/evidence/cut306/validation-source/mechanics.rs',
             source / 'crates/idlever-core/examples/upgrade_mechanics.rs')
print('Validation driver cleaned; frozen rule/utility implementation unchanged.')
