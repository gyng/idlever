# Cut206 — direct watch settlement

Finish the active storage retirement in the watched journey. Rust already
settles found loot once, before emitting the exit receipt. The client must not
create a second Keep decision or reconstruct another item payout.

## Contract

- Zero Keep sheets, storage-capacity checks, insurance or autoKeep/keep calls in
  the watched exit flow. Preserve the actual receipt, refresh timeout recovery,
  final-frame playback, report/death routing and Gold destination animation.
- Cage selection remains an optional in-run choice using actual VaultChoice
  items, preference and timer. It never claims home storage is full or items
  will be sold again at exit. Unknown labels remain the engine's flavour names.
- Do not reconstruct salvage amounts in TS. Actual spent Gold/XP/renown and
  death/drive causes continue to come from current engine data.
- Verify actual watched Bank/Return/Death transitions reach their destination
  with0 Keep interruptions, correct receipts and no extra Gold after refresh.
  Exercise a real cage choice and its timeout/preference without home storage.
- Use targeted real-WASM client checks, build/lint/copy. This client-only change
  does not certify the pending backend/API retirement or multihero offline audit.

## Scope

Root owns watch.ts and the now-unused vaultSlots helper in ui/unlocks.ts.
Core/new starting-kit APIs, material styles and individual skill icons are
parallel lanes. Historical evidence stays unchanged; no compatibility alias is
required.

## Implementation checkpoint

The active watch no longer opens a Keep sheet, calls keep/autoKeep, checks
storage capacity or reconstructs item salvage payouts. It preserves the
authoritative exit receipt, bounded refresh, final frame and report/death flow.
The cage says `Gold on pickup` and preserves actual unknown flavour labels.
Controlled actual Bank/Return/Death checks reach report/report/death with
512/512/508Gold, no pending exit and zero Keep calls/sheets.

A real resumed-cage fixture exposed an existing bug: watch initialization
ignored an already-open choice, letting grace expire before displaying its
beat. Initialization now presents its actual snapshot choice before pumping.
Actual mail choice gives raw30/carry7, Return507Gold; actual preference timeout
chooses the unknown `black potion?`, raw12/carry3. Fixture qualification and
world edits are explicit in `docs/evidence/cut206/core`; this is not earned
progression. The first timeout assertion wrongly expected the known kind
instead of the honest flavour label; original failures are retained.

An integrated probe incorrectly expected direct bail to settle immediately:
Rust records the input, then settles on the next scheduled hero action. Its instrumentation
now disposes the watch pump, calls bail and advances bounded actual ticks to the
Return event, then checks both UI and
authoritative saved Gold. No competing-refresh bug is inferred from this failure.
Normal watched exits remain separately checked. Backend save/API retirement,
broader offline acceptance and satisfying build-trial endings remain open.
