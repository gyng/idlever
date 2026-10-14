# Cut227 routine-full failures: bisect 61ccdf27 (cut187 PASS) → b497aa59

Per commit: `<sha>-tuned16.log` (`gates.mjs --full --rows tuned-picked`, 16 seeds),
`<sha>-random2.log` (`gates.mjs --rows random-picked`, the routine's 2 seeds; its
numbers equal the routine full gate's row), `<sha>-qa.log` (`qa --seeds 10`), and
`*-table.txt` the per-seed dayplayer tables. GATES_THREADS=16. Only the ten
first-parent commits that touch `crates/` were tested (the rest are docs/art/client).

| commit | what | TUNED/PICKED D33 (16) | RANDOM routine (2) | gem qa |
|---|---|---|---|---|
| 61ccdf27 | cut187 final verify | 1.24 PASS | 2/2 · 2/2 +12 · +84 PASS | PASS |
| 1c5d755f | storage retirement | 1.18 PASS | 2/2 · 2/2 +12 · +36 PASS | PASS |
| 37db5b58 | free saved kits | 1.18 PASS | 2/2 · 2/2 +12 · +36 PASS | PASS |
| 3753532a | cage removed (cache auto-taken) | 1.08 FAIL | 2/2 · 2/2 +8 · **+0** FAIL | PASS |
| a327b8dd | persistent heroes (death recovery 20 min → 60 s) | **1.00** FAIL | 2/2 · 2/2 +8 · +96 PASS | PASS |
| 03562fee | legendary Forge | 1.05 FAIL | 2/2 · 2/2 +8 · +124 PASS | PASS |
| ad72977d | armour sets | 1.05 FAIL | 2/2 · 2/2 +8 · +112 PASS | PASS |
| b497aa59 | Cut219–224 batch | 1.00 FAIL | 2/2 · **1/2** +4 · +32 FAIL | **FAIL(1)** |
| b1860f37 | HEAD | 1.00 FAIL | 2/2 · 1/2 +4 · +32 FAIL | FAIL(1) |

Probe `probe-recovery12000-tuned16*`: HEAD with `persistent::RECOVERY_TICKS` 600 → 12000
(the old 20-minute wake), nothing else: TUNED/PICKED D33 **1.17 PASS**. Diagnostic only;
reverted (Cut211 contracts 600 ticks).

Fix (gem): `fix-qa.log` (10 seeds) and `fix-qa30.log` (30 seeds) all PASS; the TUNED
table after the fix (`fix-tuned16-table.txt`) is byte-identical per seed to HEAD's.
`fix-random16*`: the 16-seed RANDOM row at HEAD, 16/16 · 15/16 PASS; seed 1 (in the
routine pair) is its only D23 exception (RANDOM 24 h vs PICKED 32 h).
Native: 936 passed, 6 ignored (workspace --profile fast); clippy -D warnings clean.
