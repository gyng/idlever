# Next integration boundary — source inspection, not implemented

Current shipping code has no building-upgrade wire/API/client surface. Search of
core wire, wasm bridge, Engine types and town UI confirms the old feature is not
available to simply re-enable. Existing Bank sheet is `web/src/ui/town.ts`'s
`openBank`; it exposes deposit/withdraw and current Rust-owned capacity/interest.
The bridge's `bankWithdraw` returns Lineage, and the worker invokes generic
ordered Engine methods. Shared upgrades must explicitly call the new Session
method rather than accidentally resolving the single-Game prototype through
Session's Deref.

Use a separate isolated integration tree derived from the archived source.
Expose Rust-owned quote data (including readiness, benefit, purse, Savings,
exact withdrawal and selected identity) and one explicit upgrade command.
Keep Gold-only the initial funding choice; a visible choice may authorize the
quoted Savings shortfall. Requote when hero/wallet/level changes. Capture a
payer-bound quote token or selected identity in the request if selection can
change between review and submission: max_price alone does not bind the hero.
Core must refuse any stale payer/level token before withdrawing. This additional
wire requirement is not claimed by the current id/max_price/bool native API.

Return both receipt and fresh Lineage from the mutation. The UI can hand Lineage
to existing App mutation handling and use the receipt to explain the actual
purchase. Do not calculate prices, readiness, recovery or interest in TS. Keep
upgrade rows inside the corresponding Bank/Vat panels and show current level,
next benefit and actual funding. No automatic upgrade, withdrawal, hurry,
construction or standing-order change. Existing home/away/manual construction
and reduced-motion behavior remain intact.

Bounded real-WASM journeys should cover two/three residents, wrong/stale payer,
Gold-only success/refusal, Savings success/refusal, cancellation, price/level
staleness, legacy chest, away selection, repeat click, and reload/background
sync. Record actual402×681 browser-content and desktop views. Require real WASM
and source/runtime/served-byte identity. This is integration acceptance only;
keep independent ordinary progression/worker/pen/recovery acceptance separate.
