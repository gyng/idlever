# Cut313 — old recovery-cap profiles and strict tuner metadata

2026-10-21. Cut309 makes recovery_full_ticks optional with historical12000
default. The statistical tuner compares emitted Balance against the requested
JSON exactly. Verify whether a pre-Cut309 profile now fails when the producer
materializes its optional default, then repair that one compatibility case.
This is independent tooling work while Cut312 collection remains sealed; no
frozen collector/analyzer/spec/runtime/source-policy or numerical claim changes.

Use synthetic peer regression tests, never new campaign outcomes. Accept an
omitted recovery_full_ticks only when the producer emits exact numeric12000;
explicit profile values still must match exactly. Refuse emitted3000 for an
omitted cap, omission by the producer for an explicitly requested cap, and all
other profile mismatches. Older profiles/peers both omitting the field continue
to work. Do not normalize null/type errors, ignore unknown fields, alter raw
profiles/job identities or silently reuse changed-code jobs.

Record an actual pre-fix failure and accepted focused/full tuner tests, plus
format/lint. No game, duration, alpha, sample, cache-integrity, WASM, confidence
study or deployment change. Update handoff/queue with precise compatibility.
