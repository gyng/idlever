# Exhaustive audit — 2026-10-16 (272 cases, after Cut257)

Run: `node tools/gates.mjs --exhaustive` → `docs/evidence/cut257/exhaustive-audit.log`,
3110 s wall, exit 1, `1 bar(s) FAIL`. Source key `526caeae1690b60b`, threads
metrics=31 qa=24 dayplayer=32, no cache hits. Host was shared (load 2.7–68 during
the run).

## 1. The metrics leg was dead on arrival — a preserved-card schema mismatch (fixed)

`metrics` panicked 0.4 s in:

```
thread 'main' panicked at crates/idlever-core/examples/metrics.rs:186:
d34605e.blind-b.rules.json: missing field `rows` at line 6 column 1
```

`cohort_sets()` feeds the stall gate from `eval/cards/*.rules.json` and expected a
rule set directly. Two cards are *labelled wrappers* instead — `d34605e.blind-a`
(`format,build,seed,exportedUtc,text`) and `d34605e.blind-b`
(`format,rulesText,exportedUtc,source`) — both deliberately preserved
(`docs/CLAUDE_HANDOFF.md`: "exact returned string labeled riddle-rules-text"), and
under *two different* field names. So the leg died on the first wrapper and ran no
cohort bars at all.

Fix: the loader now falls back to parsing a `text` / `rulesText` string when the
card is not itself a set, and still panics on a card that is neither (so it stays
strict). The preserved cards are untouched. Verified in
`docs/evidence/cut257/metrics-loader-fix.log` (clippy clean; the leg now prints its
bars instead of panicking).

## 2. The dayplayer leg's only failing bar: `each system adds value` on **pets**

```
Each system adds value by its own output (TUNED vs TUNED − S)   FAIL
  packages 28.0/52.0 h→D23 · pen 32.2/32.1 mean best · forge 32.2/30.8 mean best ·
  pets 61.3/59.3 % deaths · bank 1910.8/1700.4 $/day · quests 11.8/0.0 kept
```

Every clause passes except pets, whose predicate is `deaths%_with < deaths%_without`
(`dayplayer.rs:~2110`): with pets TUNED dies on 61.3 % of sends, without on 59.3 %.

**This is not caused by Cut257.** The clause is a coin flip in the cached record —
**7 pass / 7 fail across 14 samples** (`target/gates/dayplayer*.txt`), with both
signs at every magnitude:

| when | pets (with/without) | clause |
|---|---|---|
| 2026-10-03 (×2) | 10.6 / 11.0 | PASS |
| 2026-10-04 | 6.9 / 8.8 · 10.6 / 11.0 | PASS |
| 2026-10-09 | 23.0 / 20.4 · 23.6 / 20.2 (×2) · 21.7 / 13.6 · 16.9 / 12.7 · 22.9 / 16.9 | FAIL |
| 2026-10-09 | 11.9 / 13.2 · 17.2 / 20.7 · 32.5 / 33.4 | PASS |
| 2026-10-16 (this run) | 61.3 / 59.3 | FAIL |

Cut257 changed no pet mechanic (`ai.rs` ranger volley/split-mark arming + holdfast
arming window, `class_advanced.rs` long-watch window + conduct copy path + holdfast
consume, `class_tree.rs` the ghostwalk/chilling-charge/conduct rows). The absolute
death rates have risen across the board since early October (7–33 % → 59–61 %),
which is a separate, earlier change in the bots' configs/recovery ramp.

**Handover, not a fix.** Making this clause pass means either (a) a *gate-design*
decision the owner must accept — a tolerance or more seeds, because an untoleranced
16-seed `with < without` comparison on a small true effect is a coin flip — or (b) a
content change to pets. Changing the expected value to obtain green is forbidden;
until one of those decisions lands, `--exhaustive` reports exactly this one failure.

## 3. What this audit does **not** cover

`qa` finished exit 0; the dayplayer leg settled every other row. The *client*
exhaustive inventory, the earned campaigns, native↔WASM advanced parity and
independent fun≥80 remain separate and unrun here.
