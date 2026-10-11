# Capped ade4b12 QA — current triage

Both original passes remain incomplete. These dispositions record the known
findings; they do not certify a completed QA horizon or authorize blind release.
Fresh QA must confirm fixes and assess the remaining observations.

| Finding | Disposition and evidence |
| --- | --- |
| Selected Guarded card collapses | Fixed Cut172; selected card occupies its own row, 320/400/1440 checks and before/after images preserved. |
| Pen appears to require Captain | Fixed Cut170; the rail names its actual next rung, separating Tactics from Pen. Core Mother gate unchanged. |
| Unkept carry called spending | Fixed Cut171; ledger displays losses separately, with exact arithmetic and legacy fallback checks. |
| Early death cannot explain failed banking | Fixed Cut174; read-only historical trace available without Pen unlock. Genuine saved D5 death shows repeated banking attempts and archer blows; no invented no-path cause. |
| Orders tap opens explanation | Fixed Cut173; nested controls retain their action, tested with real pointer events. |
| Workers needs a separate entry | Fixed Cut173; earned Workers rung opens the existing worker sheet. |
| Paired “worse6/8” has no criterion | Fixed Cut173; depth-then-exit caption and actual Rust tie ordering disclosed. |
| Forecast signed delta has no baseline | Fixed Cut173; delta's on-demand explanation names the existing baseline and percentage-point unit. |
| Disabled initial Rogue has no gate | Fixed Cut176; omitted free-entry caption names first full haul. Ownership/availability still comes from Rust. |
| Extra “+13” find quantity unnamed | Fixed Cut172; extra-find count explicitly says finds. |
| Sheet helper opens title menu | Harness fixed Cut175; copied navigation removes reset/menu/absence flags; exact original URL and saves unchanged. |
| Gold earned mistaken for wallet change | Bounded presentation deviation: gross earnings and spendable wallet are distinct quantities, already named and reconciled in Gold details. New loss/spending separation reduces the ambiguity; no numerical change. |
| Dungeon hotspot mistaken for information | Bounded interaction deviation: entrance sends a run, with a visible Send label. Its existing behavior is intentional; no undo/state grant is introduced. Fresh QA should assess discoverability. |
| Foe instead of an attacker's name in log | Retained limitation: log falls back when its name map lacks an actor. The death cause/recorded trace still names the killer. No guessed identity added. Fresh QA must assess whether this remains material. |
| Scout bubble retains prerequisite count | Unconfirmed: seen only in the original asynchronous walk; actual live hire showed hired/automatic departure. Preserve capture and recheck a settled hover after hire; do not claim a fix or stable defect. |
| Pet receipt precedates the absence | Retained scope limitation: completed-run facts can include pre-away events, while the absence ledger uses its own delta. Actual receipts reconcile; the existing scope label is less local than desired. Fresh QA must assess materiality. |
| Keep armour does not displace stored sword | Bounded capacity deviation: one occupied slot cannot promise another item kind; capacity and stored item are shown, and excess gear is salvaged. Keep/loot preference is not a capacity upgrade. No automatic deletion of the chosen heir item. |
| Forge quote changes175→200 | Retained explanation limitation: purchases charge the displayed current quote and receipts reconcile; the progression-dependent pricing rationale is not yet exposed beside the quote. No undisclosed charge found. |
| Left-behind count names no item | Bounded copy deviation: brief run lines intentionally count finds; the exit/gold detail lists named fates. Preserve short chrome rather than expanding every run into an item list. |
| Savings “a night's purse” has no numeric target | Retained explanation limitation: genuine saved seed149 had2319 gold against Rust last_night_net2411; lock is correct but this target is not exposed in the current wire caption. Optional construction remains manual. No client approximation of that target is introduced. |
| “TAME FAILED · NO” unexplained | Unconfirmed transient Fast sample; not reproduced before budget. Recheck a real visible failure before changing cause copy or asserting it is fixed. |

The retained limitations are explicit deviations, not evidence of perfect
clarity. They cannot support a1.0 no-lapse claim. They remain visible to the
coordinator; fresh players receive no finding list or prescribed strategy.
