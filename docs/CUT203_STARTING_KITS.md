# Cut203 — permanent starting gear and named kits

This implements the next build-economy slice of Cut191. Full queue acceptance,
API retirement and subjective fun remain separate work.

## Existing capability and selected rules

`kit.rs` owns paid, cumulative weapon/armour/pack upgrades. The weapon has aim
and edge branches; armour has plate and pace branches. `kit::equip` currently
chooses the class weapon and armour ladder piece. Five actual discoveries of
an item make its Forge row craftable; supplies already prepare free. Historical
`loadout(itemIds)` selects private vault instances and is not this new API.

Add bloodline-owned starting shapes and named reusable preparations. Unchosen
gear keeps the existing class/forge default and its RNG sequence. An explicit
weapon or armour shape requires its real Forge craftable row (five discovered
units); the current class weapon and bare armour remain valid free defaults.
Weapon upgrades apply to the chosen weapon. Explicit armour uses the selected
piece, the owned armour enchant and its real speed cost: leather0, mail−1,
plate−2. The default fitted armour keeps its existing speed behaviour. Axe
trades sword3–7 damage/speed10 for4–9/speed9 before shared bonuses.

Gold continues to buy permanent ladder upgrades. Selecting, saving, editing,
deleting and reusing a kit cost0 Gold. This cut does not add a discovery bypass,
new resource, per-delve fee or arbitrary pacing delay.

Saving an edited currently selected record detaches its selected ID and keeps
the active configuration unchanged until explicit selection. This prevents the
saved label from claiming new gear before that gear has been selected.

## Wire and API

`Lineage.starting_kits` exposes Rust-owned eligible gear choices, current
configuration and up to8 named kits. Configuration contains `weapon` and
`armour` (null means existing default; armour `none` means bare), and an ordered
`supplies` list with duplicate entries representing separate slots.

`setStartingKit(configJson)` selects an unsaved configuration;
`saveStartingKit(name, configJson, id)` creates/updates a stable named ID;
`selectStartingKit(id)` atomically applies an eligible saved configuration;
`deleteStartingKit(id)` removes the record without changing an already selected
configuration. Names contain1–32 trimmed characters. Invalid IDs, names,
locked gear/items or overflow reject without changing state, IDs, Gold or facts.
All methods return the authoritative Lineage. Selected configuration applies
to future departures; an in-flight hero is unchanged. Saved configurations
belong to each bloodline, not shared town storage.

Explicit supplies are authored slots; repeated departures refill them for free
and preserve their multiplicity. Package preparation may use spare capacity.
Kennel leash provenance remains distinct. The empty/default configuration does
not disable the existing preparation workflow. Forecast fingerprints include
selected combat gear and preparation; saved names alone do not change combat.

## Numeric acceptance

1. Fresh default departures preserve starting gear, Gold and RNG draws.
2. Four discovered units reject an alternate shape; five unlock it. At Gold0,
   selection and three actual departures refill/retain the intended supplies,
   with0 preparation transactions and0 conversion income from starting gear.
3. Invalid selection/edit is save-byte identical. At most8 named records;
   duplicate names may exist but stable IDs never collide. Delete/reload cannot
   duplicate currency or unlock ownership.
4. Earn two real Fighter configurations from actual delves at one saved wall,
   without granted Gold/facts/discoveries. Show exact damage/speed/armour
   tradeoffs and matched-seed next-run outcomes; do not claim one always wins.
5. Default and selected named gear preserve whole/sliced/save-reloaded catch-up
   parity; two bloodlines keep independent choices and shared Gold accounting.
6. Paid permanent upgrades still debit the exact price, refuse at Gold0 and
   apply equally after free shape changes. Cumulative class and Legacy survive.

Evidence must distinguish controlled boundary fixtures from earned progression.
Focused native tests precede workspace audit; package/browser acceptance is
coordinated by the parent after source freeze. No package build in this lane.

## Implemented foundation and evidence

The wire/API above is implemented. `setStartingKit` also accepts JSON `null`
to restore the existing default workflow. Selection immediately prepares its
authored slots; future departures reconcile and refill them, preserving usable
instances, duplicate counts and kennel provenance. Package preparation uses
spare slots and cannot replace selected authored items. In-flight gear does not
change. Changing to an incompatible class resets the active weapon to the class
default and clears the selected named ID; the saved record remains and refuses
incompatible reselection. The wire names the actual weapon and armour.

Gear rows carry `available`, `needs`, `compatible` and `ranged`. Their `damage`,
`armour` and `speed` describe the base item definition; label these as base
statistics. The existing cumulative ladders separately describe owned aim,
edge, enchant and pace effects. Do not present base numbers as the fully
levelled hero's final combat statistics. Gunner firearm profiles keep their
existing paid/unlock API; generic weapon selection cannot bypass it.

Actual class-policy actions emit optional `Ev::Rule.skill {id,name}` from the
executed row's `class:path:<id>` origin and Rust-owned class label. Ordinary
attacks, negative chore rows and passive modifiers do not inherit a skill
attribution. The numeric fixture verifies the real `second_wind` heal, exact
identity, save/reload event determinism and unattributed ordinary attacks.

Seven new controlled native tests pass; the fifteen adjacent free-preparation/
single-conversion tests and ten existing class-tree tests also pass. Workspace
Clippy with all targets and warnings denied passes. The final full native audit
passes848 tests with0 failures and6 pre-existing ignored tests in88.79seconds.
Both processes exited0. This core acceptance does not replace real-WASM,
responsive browser, wider balance or subjective fun acceptance.

The actual earned diagnostic is `examples/starting_kits_check.rs`: fresh seed1,
three manual delves, genuinely hired Scout and an8h absence. Both shapes were
earned at the same D7 wall. Sword/leather is3–7 damage, speed10, armour1;
axe/bare is4–9, speed9, armour0. Matched next-hour diagnostics each complete
two runs at D7, gaining227 and176 Gold respectively. This establishes distinct
tradeoffs and usable preparations in one earned case, not all-seed superiority
or subjective fun. Raw saves are byte-preserved in
`docs/evidence/cut203/earned-kits.tar.gz`; the manifest labels the later
attribution-wire refinement separately. No unlock, Gold or discovery was granted.

The first full native audit passed847 tests and failed one genuine performance
contract: inline skill metadata expanded `Ev` from80 to128bytes. Optional skill
metadata is now boxed and Rule text uses `Box<str>`; JSON remains unchanged.
The unchanged80byte event-size/reload gate passes. Five legacy Rust text reads
needed type conversions without assertion changes. Original audit and compile
failure logs are retained. Canonical class labels use one immutable `OnceLock`
cache; they no longer construct all30 definitions on every fired path row.
A fresh-process native diagnostic measured47.867µs for the cold call and
44.4919ns per warm call over10,000 calls. These are one host timing sample,
not a performance pass threshold. Final integrated audit passes; its longer
concurrent elapsed time is not an isolated performance comparison. Exact logs,
exit statuses and hashes are in `docs/evidence/cut203/validation-manifest.json`.

## Client integration checkpoint

Bloodline Loadouts now exposes collapsed Weapon/Armour choices, real base
statistics and shape requirements, an explicit class-default reset, and named
Save/Update/Use/Delete controls. Forge upgrades remain separate and apply to
every eligible kit. Authored supply edits update the permanent configuration;
ordinary default preparation retains its existing slot/provenance rules.
Engine proxy registration and native code generation include all four APIs;
the generator now handles optional String arguments.

The actual earned save above passes real-worker CRUD, record/active identity,
explicit invalid-name/unknown-ID refusal, unchanged1393Gold, save/reload, away
guards, retained expanded gear choices and nested overflow checks at320/400/1440.
At200% text, controls remain at least44px with no horizontal panel/document
overflow. A private-GPU repeat passes in20.6s and captures current StartingKits
with the frozen Cut204 materials, separately from that lane's older cached UI
comparison. These checks do not certify hero NG+, pet loadouts or broader pacing.
The initial browser failure was an expected Rust refusal not caught by the new
test; it is retained alongside the corrected explicit error assertions.
