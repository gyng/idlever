# Cut309 — compile-free recovery cap and bounded alternative screen

2026-10-21. Cut308's town upgrades meet the two-seed spending discovery bar
but cannot repair the earlier pen gap. Recovery alternatives remain authorized.

Implement a validated optional `recovery_full_ticks` balance field, default12000,
so native dev-balance processes can test deep recovery without rebuilding.
Bounds:1..12000 ticks and shallow recovery≤full cap; reject invalid profiles
before publication. Old profiles lacking the field retain exactly12000. The
existing four-number depth curve remains unchanged. New deaths and explicit
reclones use the configured cap; already stored recovery deadlines/durations
and legacy saves' historical12000 fallback are not rewritten. No default change,
extra fee, offline cap, automatic hurry or save migration.

Before outcomes freeze these three complete profiles, all other fields shipping:

1. reference: `[600,14,28,1]`, full12000;
2. shallow15: `[150,14,28,1]`, full12000 (original held proposal);
3. deep5m: `[150,14,28,1]`, full3000 (different deep-cap alternative).

Fixed reused discovery seeds1/2, ordinary PICKED/TUNED, three check-ins/day,
D33-or14days. No town-upgrade prototype or policy in this screen: compare
recovery itself first. Reference must match all original Cut298 record/SeedOut
fields except elapsed time, explicitly separating new balance metadata.
Never infer independent/population or combined Bank/Vat acceptance from this.

Per alternative: pen median of individual PICKED/TUNED D33 ratios≥1.15;
D13/D18/D23/D33 role-specific median absolute arrivals no later than reference;
no earlier observed King. Retain every seed, censoring, cash/kit/sends/deaths,
original failures and exact profiles. Missing milestones are inconclusive rather
than silently dropped. No resampling, extension, numeric bar change or default
adoption from this screen. Worker-away/fortnight and combined upgrade evidence
remain required before choosing a replacement.

Validation: parser compatibility/bounds; pure curve checks at all depths0..40,
monotonicity/endpoints for all three profiles and exact shipping-formula parity;
native workspace fast tests, strict Clippy and rebuilt WASM. Freeze producer/
profile/runtime identities before campaign outcomes, preserve full observations,
and independently derive arrivals/exact rational ratios. Update handoff/queue.
