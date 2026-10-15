# Frozen-visual A/A timing — terminalFAIL,2026-10-16

Current same-scene A/A controls finish18/18repetitions with exit1 atUTC
2026-10-15T22:08:51Z. Five of six pairs pass; **Crypt1440fails+0.292864ms**.
The declared absolute limit remains0.20ms. No timing retry, successor archived-
off equivalence or candidate run follows. R6 feature cost remains unaccepted;
independent cold and broader acceptance requirements remain open.

| Scene | baseline median p95,ms | second A/A label median p95,ms | signed difference,ms | absolute≤0.20 |
| --- | ---: | ---: | ---: | --- |
| Fens400 |0.852992|0.887808|+0.034816|PASS|
| Crypt400 |2.134016|2.163712|+0.029696|PASS|
| Foundry400 |0.828416|0.833536|+0.005120|PASS|
| Fens1440 |2.563072|2.615296|+0.052224|PASS|
| Crypt1440 |2.500608|2.793472|+0.292864|**FAIL**|
| Foundry1440 |2.715648|2.837504|+0.121856|PASS|

Both labels render landmark-off; the second label is not the landmark candidate.
Every pair uses3fresh repetitions and240resolved queries/label/repetition.
Aggregation remains difference of branch median p95s, not median of differences.
Crypt1440rep differences are+0.293888,+0.674816,−0.233472ms, all retained. No
repetition/outlier is removed, no bar/sample size/aggregation changed.

All18content rechecks and8640query issue/clock/viewport/projection/tick/highFX/
context/atlas guards pass,0page errors/disjoint samples. VisualClock stays
10000000ms while realRAF/query/quality/CPU clocks advance normally. All144raw
pre-timing capture files are byte-identical to the prior committed content proof.
These establish controlled inputs and valid recorded queries. They do not make
the observed variance acceptable or attribute the failure to landmark geometry,
previous visual-clock mismatch, foreign activity, Windows scheduling or hardware.
No additional concrete wrong-tag/draw-input defect was found in this audit.

Before first timing launch, two observed foreign Armee browser batches used
1058%/1387%CPU. Timing was not started in either window; no foreign process was
signalled. After those specific families exited,3consecutive5s samples showed
no visible browser/display process or heavyCPU activity. Actual timing then
started once. Two sparse in-run process samples showed no active outside-owned
browser/heavyCPU load; the first includes own idle detached crashpad helpers,
clarified in the later sample. This is finite Linux-process observation, **not**
host/Windows-wide or continuous whole-interval quiet proof. Do not blame foreign
load for this failed control. Process receipts and original observations stay raw.

Independent verify-frozen-aa.py recomputes all quantiles/medians/flags, checks all
8640issue/real/visual-clock tags and complete per-issuing-frame metadata, actual
atlas hashes and frozen source/method, and validates every capture against the
committed complete trace/PNG artifacts. Both live-raw and curated-alias modes
pass as **verification of failed controls**, not a fresh successful cost run.

The full17,698,502byte result JSON is preserved locally and losslessly compressed
in ../frozen-visual-aa-2026-10-16-raw.json.gz. No result field is normalized/dropped.
All144raw captures stay local. Curated evidence references their exact previous
committed canonical files through SHA-bound captureAliases; this saves duplicate
images/traces, not semantic data. A curated checkout can verify the full proof:

```
python3 docs/evidence/cut245/verify-frozen-aa.py docs/evidence/cut245/frozen-visual-aa-2026-10-16 scratchpad/verify-aa.json --curated
```

All18known owned wrapper/node/browser/display/helper PIDs were positively absent
in namespace4026532214 after terminal. The lane was released for root's icon
preview, then native work. No new GPU timing is authorized during native checks.
