#!/usr/bin/env python3
"""Cut316 phase A: put a legacy stylesheet inside `@layer legacy { … }`.

Top-level `@property` blocks stay outside (they may not nest). Idempotent: a file
already starting with the marker is left alone. Usage: css-layer-wrap.py FILE...
"""
import re, sys

MARK = "/* Cut316: legacy layer — kit/screens layers win; migrate rules out, never in */\n"

def split_props(text):
    out, keep, i = [], [], 0
    for m in re.finditer(r"@property\s+[^{]+\{[^}]*\}\s*", text):
        keep.append(text[i:m.start()]); out.append(m.group(0)); i = m.end()
    keep.append(text[i:])
    return "".join(out), "".join(keep)

for path in sys.argv[1:]:
    text = open(path).read()
    if text.startswith(MARK):
        continue
    props, body = split_props(text)
    open(path, "w").write(MARK + props + "@layer legacy {\n" + body.rstrip() + "\n}\n")
