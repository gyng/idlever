# Exact baseline reproduction — 2026-10-19

Resume baseline: `37d8b63fe4756637ba25bf60e6ff08459ba96de6`, isolated clean
worktree. Candidate source: `423fe45ae9e5747f311904d97ffc058807419c63`.
The candidate's whole routine full run is **FAIL**, exit1. This note does not
relabel it or lower either numeric threshold.

Baseline command after native fast build, `CARGO_INCREMENTAL=0`:

```
dayplayer --routine --no-share --rows tuned-picked,automation-pays --seeds 2 --tuned-seeds 2 --threads 8
```

It completed in128s, build exit0, targeted-row exit1. `baseline-rows.log` retains
per-seed results; `baseline-rows.exit.json` retains statuses. Targeted mode
stops milestone-only policies when settled; it is not a whole gate pass.

| Existing row | Exact baseline | Candidate routine full | Required bar |
|---|---|---|---|
| TUNED beats PICKED at D33 |1.10 FAIL|1.10 FAIL|≥1.15|
| Workers pay the away player |D18 48 vs24h; mean best29.93 vs30.14 FAIL|D18 48 vs24h; mean best29.93 vs30.14 FAIL|D18 sooner or mean best deeper|

Both failures therefore predate this Vat delivery. The separate
`bounded-source-equivalence.md` identifies identical ordinary policy, existing
balance fields, worker/offline/forecast/row sources, and the explicit-only Hurry
mutation. This is bounded reproduction of these two failures, not a fresh
whole baseline gate,16-seed pacing result or exhaustive audit.

Delivery decision: the agent records a dev-milestone deviation under AGENTS.md's
“tune content, or record a deviation with a reason” rule. The owner requested
deploy-and-pause at a major milestone and held upgrade redesign. Vat, Hub,
settlement and metadata acceptance passed; ordinary progression is unchanged,
and these inherited balance failures require separate follow-up. Publish the
clean candidate to the dev site, preserve both failures in HANDOFF, then pause.
This does not claim whole-game mechanical acceptance or independent fun≥80.

One premature comparison launch ran before the temporary worktree path existed;
it was stopped immediately and preserved under `baseline-premature-*`. It is
not baseline evidence. The corrected launcher checks the exact baseline HEAD
before compiling. No balance tuning was performed.
