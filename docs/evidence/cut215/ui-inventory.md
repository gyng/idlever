# Legendary frontend inventory — read-only

Forge openForge at ui/forge.ts:112 owns a paint closure which builds rank offers
and Details. It refreshes via JSON.stringify of actual Lineage/rules/loadout and
engine identity; no hand-written legendary discovery cache is needed. Add an
owned-shapes block independently of paid rank buttons and requested forecasts.
Keep material forge and current actual kit complete/sidearm/commission states.

Starting gear at ui/starting-kits.ts:7 already selects shapes through
setStartingKit, saves named configurations, selects them and deletes them.
Each row has kind/label/base damage/armour/speed/available/needs/compatible.
No named effect/tradeoff or rarity field exists yet. Selected gear heading
currently derives label by replacing underscores in actual_weapon/armour;
that should read the actual matching authored choice label for named gear.
Rows have data-kit-slot/data-kit-choice and aria-pressed useful for exact tests.

Current Loadouts owners are guarded by engine object and selected bloodline;
body connectivity prevents detached old controllers. Strengthen the new
legendary action guard with actual PersistentHero.id/incarnation (includes
seed/slot) so a same-ID import/new world cannot route a retained controller.
This is identity protection, not a new game rule. Existing Bloodlines fingerprint
and disclosure handling should retain the current gear fold after live updates.

Forge rank upgrades remain real KitLadder offers; preserve estimates only on
explicit Forecast. Legendary free choice must not call buyKit or buySupply.
Ordinary choices remain meaningful comparison rows. Catalogue reveal should
come from Rust, not UI assumptions about boss depths or a saved new boolean.

Root-owned first-discovery seams: actual Watch pickup/note handling in
ui/watch.ts:2342 and report Finds group in ui/report.ts:2012. Ordinary rarity
legendary currently exists on InvItem; it cannot stand in for the new permanent
named unlock. Any helper link must read actual metadata and only open an
existing Forge/Loadouts screen. No auto-equip on a find notification.

Core effects, earned drop fixture production,16-seed survey and permanent
ownership merge remain unimplemented/unverified in this lane at inventory time.
No production file changed for this audit; Hero/frame Cut211 sources stay frozen.
