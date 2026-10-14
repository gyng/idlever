# Cut223 actual settlement fixtures

These are transaction diagnostics from genuine earned saves and public actions.
They do not certify natural progression or class balance. Production Core,
wire and package source remain unchanged. The dedicated exporter is
`crates/idlever-core/examples/gold_settlement_fixtures.rs`.

Final input manifest: `../settlements-inputs.json`. Each case records its
immutable pre-operation Session gzip/raw hashes, source input hashes, actual
setup actions, exact browser replay operation, active owner and canonical Rust
Gold/ledger/ExitLine/standing-pet/loss expectations. Final pre-exit Sessions
reload and replay the last tick to the identical native exit line and ledger.
Read-only serialization preserves each saved boundary. The actual runtime and
exporter identities are recorded in the manifest.

| Case | Actual operation | Canonical credit and loss |
| --- | --- | --- |
| Bank | step(1) from turn 55 before real stairs exit | Owner 1: +1 Gold, `banked D1`; carried 1, kept 1 |
| Secured Death | step(1) from turn 4349, HP 4, before ordinary first paid-resident 2 demise | Owner 2: +75 Gold, `died D4`; carried 98, secured 75, lost 23 |
| Fetched Death | step(1) from turn 1459, HP 1, Greth alive at 13 HP | Owner 1: `died D1`0, gross lost 40; `fetched by Greth`+9, remaining loss 31 |
| Three heroes | runOfflineQuick(28800) from three genuinely sent residents | Owner 3 Bank +25; owner 2 Death +75/lost 23; owner 1 Death 0/lost 1206; shared purse +100 |

The fetch case deliberately uses already-unlocked pen choices, confirmed
Rebirth, its lawful 60-second recovery, empty armour pins, cleared temperament,
an actually owned Greth and legal pet retreat/follow rows, then Hold beside a
real foe after actual pickups. No HP, carry, Gold, ownership, record or RNG
field is patched. Greth is a level 3 Fetcher: current `pets::fetch_pct` is 24%,
so 40 lost carry yields 9 Gold by integer division. The old-hound history label
is not the percentage gate; level 5 is the 28% threshold. Secured currency and
named pet protection are distinct receipts. Ordinary lost carry creates no
credit, and a zero-delta death receipt must not produce a coin flight.

The secured-death case uses the real paid three-resident source, selects
resident 2, pins armour empty for free and follows ordinary rules. The first
actual departure dies with both secured and remaining carry. The legal
Take-control/Wait fallback was audited but was not used. Bank uses the
original already-open pen after a real pickup. No blind API or locked-pen
bypass is used.

Native generation's corrected phase passed all four cases. Default scoped
exporter Clippy passed with warnings denied in 27.54 s. The first compile
failure (nonexistent read-only Hero.blind field) is retained separately.
Native/protected receipts and repeated source reads are proof here; actual
WASM transfer particles, owner routing, silent import/read and motion are
Root's next client acceptance phase. The manifest pins the current 66b8 WASM
(6698072 bytes); it does not claim a future changed package is already proved.
