# Earned home fixture

`earned-gunner-home.json` is the complete real Rust save for seed3 long gun,
retained paid-upkeep/backup campaign, before its Tier5 send. It carries earned
class XP, Legacy, gold, town and curriculum; no unlock or currency grants are
added for UI tests. Import through the real worker, never the fake engine.

Source: `scratchpad/gunner-fixed-sidearm-retained-20261007/seed3-long_gun-start.json`
from Cut35 earned campaign acceptance (see `docs/CUT35_GUNNER.md`/HANDOFF).
SHA256: `5eef774a85264b7d9d7cb39d097c3bdf6c6f65dbe54404bc592e0bd567b28115`.
The save is a UI/recovery fixture, not a replacement for balance or fun evaluation.

`class-path-catalogue.json` is an authored Rust node catalogue, not a save or
earned progression fixture. Regenerate with `cargo run -q --profile fast -p
idlever-core --example cut253_catalogue`; preserve its JSON and SHA provenance
in docs/evidence/cut253, then copy the classes into this fixture with current
class_tree.rs/hero.rs sourceHashes, generatedBy and nativeOutputSha256. The
skill-icon test refuses stale source hashes. It uses the catalogue solely to
check IDs, primitive/painted rendering, states and accessibility; eligibility
and purchases still require real engine journeys.
