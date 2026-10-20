# Cut313 — historical recovery-cap metadata compatibility repaired

Contract: [CUT313](../../CUT313_LEGACY_CAP_METADATA.md). An otherwise-complete
old profile may omit `recovery_full_ticks`; Rust fills12000. The tuner previously
compared the emitted object to the raw request and rejected that valid default
as an identity mismatch. The retained pre-fix synthetic regression fails with
that exact message, before any statistical acceptance.

The validator now creates an expected comparison object with numeric12000 only
when the request omits this known optional field and the producer emits it.
It does not mutate the requested profile, stored raw packet, source identity,
job key or statistical configuration. Explicit values remain exact; all other
profile fields/milestones are still strictly compared. Older peers and profiles
that both omit the field continue through the existing strict path.

Focused tests accept omitted→numeric12000 and explicit3000→3000. They refuse
omitted→3000, omitted→string12000, explicitnull→12000, a producer omitting an
explicitly requested cap, and other field changes. Full tuner regression passes
46/46 using synthetic peers only, with no game campaigns. Formatting and
warnings-denied JS lint pass. Original failing log and accepted logs retained.
Full-test elapsed75.95s under concurrent native work is not a speed benchmark.

This correction was performed while Cut312 outcomes remained sealed. Its
collector/analyzer/verifier use pinned local modules and immutable native code;
none was changed by this repair. No new game defaults, durations, sampling,
thresholds, cache identities/formats, WASM, client or deployment changes.

Whitespace review preserves raw `fix.patch` blank context and `validation/pre-fix.log`
Node assertion padding; authored source/docs pass.
