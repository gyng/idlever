# R5 "Lived-in home base" — live-base routines beyond the Forge (READ-ONLY source + evidence review)

Date 2026-10-16. Sources read: `docs/QUEUE_ACCEPTANCE.md` R5 + item 14; `docs/CUT228_ANT_FARM.md`;
`docs/CUT251_WORKER_PAUSE_PRESENTATION.md`; `docs/evidence/cut228/README.md`;
`docs/evidence/cut228/lived-base-audit-2026-10-16.md`; `docs/evidence/cut251/README.md`;
`crates/idlever-core/src/{tree,town,wire,engine,bloodlines,persistent,balance}.rs`;
`web/src/render/town.ts`; `web/src/render/view2d.ts`; `web/src/ui/town.ts`; `web/src/ui/building-help.ts`;
`web/public/art/atlas.json`; `art/town-ids.md`. No build, run, browser or edit was performed.

## Shared pipeline (one mechanism, all actors)

`tree::posts` (`crates/idlever-core/src/tree.rs:1457-1464`) emits a `WorkerPost { id, post, paused, rank, lit, price, progress, fallback_h, eta_h }`
for every hired `NODES` worker (`tree.rs:80-93`), plus the single lit node greyed. Source fields:
`Tree.hired` (`tree.rs:124`), `Tree.paused` (`tree.rs:130`), `tree::rank` (`tree.rs:639`), `tree::hired` (`tree.rs:368`).
The wire is `Town.workers` (`crates/idlever-core/src/town.rs:469`), typed `WorkerPost` (`crates/idlever-core/src/wire.rs:1795`).
The renderer maps it to `WorkerSpot` (`web/src/render/town.ts:413-420`, type `town.ts:173-181`) and draws it
(`town.ts:2395-2432`). Only **one** present-work field exists on the whole wire: `Town.forge_work` (`wire.rs:1796-1798`,
`ForgeWork` `wire.rs:1804-1808`), set in `engine.rs:3521` and `bloodlines.rs:203`, computed by `town::forge_work`
(`town.rs:484-513`, window `town.rs:478`). Nothing marks a worker as "doing its chore now".

Worker visuals are therefore exactly four core-driven properties: **hired/lit**, **post**, **paused**, **rank**. The
on-screen behaviour is a fixed post + a desynchronised two-frame ambient idle beat (`town.ts:2415-2429`), `dim 0.7` when
paused, one gold pip per rank past I (`town.ts:2426-2431`), a night lantern (`town.ts:2432`, `2063-2072`), and a one-off
tent→post hire arrival (`town.ts:2915-2922`, consumed `2404-2413`). Cut251 (`docs/CUT251_…md`; `docs/evidence/cut251/README.md`)
states this beat is "ambient idle inspection, not proof of a transaction or a recently performed chore".
`view2d.ts` draws the identical frame quad list (`view2d.ts:432-516`), so there is no second Canvas-only path.

## Table

| entity | driver (`file:line`) | observed/predicted behaviour | classification | evidence | smallest fix if dead/generic |
|---|---|---|---|---|---|
| **quartermaster** (given) | post: `NODES` `tree.rs:81` (post `crate`); `WORKER_AT.quartermaster` `town.ts:186`; hired/paused/rank `tree.rs:1458`→`town.rs:469`→`town.ts:413` | stands at the crate; two-frame idle beat; paused dim; rank pips; hire arrival | generic/idle-only | no worker capture; smith/hero only in `docs/evidence/cut228/gpu/*` | native "preparation changed" receipt (`engine.rs:3043` drills) → a bounded pack-check pose; needs a wire field (audit `docs/evidence/cut228/lived-base-audit-2026-10-16.md`, Quartermaster row) |
| **porter** | post `tree.rs:82` (post `mouth`); `WORKER_AT.porter` `town.ts:187` | worker: idle beat only. **Separate live prop**: the haul chest is driven by `L.tree.chest` + porter node state (`townState` `town.ts:398-412`) and hops/glints/opens (`town.ts:2370-2392`, tap `web/src/ui/town.ts:923`) | worker generic/idle-only; chest = real state-driven prop | chest appears in `docs/evidence/cut228/gpu/before-*` (whole-town); no porter-routine capture | chest already real; a porter carry/sack poses would need an actual-collection receipt — audit explicitly forbids a Storehouse destination/sorting |
| **scout** | post `tree.rs:83` (post `fire`); overridden `WORKER_AT.scout` = guild+13 (`town.ts:188`); hired/paused `tree.rs:1458` | idle beat; paused → base frame 0 only | generic/idle-only | **`docs/evidence/cut251/{red,final}/results.json` + `README.md`** — real renderer matrix on the paused/active Scout (32 obs / 184 assertions / 800 refreshes); CUT251 says it is ambient inspection, not work | escort the *actually departing* resident to the mouth on a real send; blocked on a recent-send identity (no such field today) |
| **apprentice** | post `tree.rs:84` (post `blacksmith`); `WORKER_AT.apprentice` `town.ts:189` | idle beat beside the Forge; does **not** join the `forge_work` vignette | generic/idle-only | CUT228 known limit: "Apprentice purchases happen at sends … most natural sightings show the smith alone" (`docs/CUT228_ANT_FARM.md`) | apprentice inspects the hot bar during the *same* real `forge_work` interval; must not be labelled a purchase (manual vs commission unproven) |
| **clerk** | post `tree.rs:85` (post `bank`); `WORKER_AT.clerk` `town.ts:190` | idle beat at the bank; savings/interest (`town.bank`/`town.interest`) never read | generic/idle-only | none for the clerk | ledger/quill pose only after a confirmed `bank …` deposit receipt (balance delta can be interest/withdraw) — audit Clerk row |
| **drillmaster** | post `tree.rs:86` (post `tent`); `WORKER_AT.drillmaster` `town.ts:191` | idle beat at the tent | generic/idle-only | none | a drill pose on a confirmed native level spend for a present, non-away resident; never passive XP |
| **kennel_hand** | post `tree.rs:87` (post `kennel`); `WORKER_AT.kennel_hand` `town.ts:192` | idle beat by the kennel; penned pets drawn separately (see kennel building) | generic/idle-only | none | bucket/hound pose directed at an *actually penned* pet on a real field/return selection |
| **herald** | post `tree.rs:88` (post `board`); `WORKER_AT.herald` `town.ts:193` | idle beat by the board | generic/idle-only | none | scroll/bell inspection after a confirmed quest swap (`town.quest_seq`/`quests_done`) |
| **guide** | post `tree.rs:89` (post `mouth`); `WORKER_AT.guide` `town.ts:194` | idle beat at the mouth | generic/idle-only | none | lantern/waystone check after a real start change (`tree.start_by_hand`) |
| **kennel_keeper** (hired, live) | post `tree.rs:93` (post `kennel`); **no `WORKER_AT` entry** → `workerAt` falls back to `PLOTS.kennel` (`town.ts:214-215`) | idle beat **standing on the kennel building's own foot**; **no art**: `town_worker_kennel_keeper[_1]` absent from `web/public/art/atlas.json` (`grep` finds only `keeper`/`armourer`) and from `art/town-ids.md` → primitive fallback with default coat, no role tag (`town.ts:910-920`, role branch has no `kennel_keeper` case) | generic/idle-only **+ art/post defect** | none; only the atlas/sheet absence is evidence | add a `WORKER_AT.kennel_keeper` offset beside the hand (not on the building foot) and a `town_worker_kennel_keeper` sheet frame + primitive role tag; a breed/sort pose on a real `acts`/`bred_by_hand` event |
| **smith** (folk, `FOLK_AT.smith` `town.ts:209`) | `Town.forge_work` (`town.rs:484-513`; `engine.rs:3521`; `bloodlines.rs:203`) → `state.forge` (`town.ts:471-477`) → `forging()` (`town.ts:1364`) | with work: dips and lays `town_hammer_down` on the anvil every `HAMMER_S` 0.8 s, hot-bar ember + night glow (`town.ts:2137-2160`); without: idle bob (`town.ts:2181-2184`) | **real state-driven ritual** | `docs/evidence/cut228/gpu/{before,forge,forge-reduced}-{400,1440}-{day,night}[-forge].png` + `*-report.json`; `web/tests/home-forge-work.mjs` 31 checks; `docs/evidence/cut228/README.md` | n/a (delivered) |
| **fitted home hero** (resident walker with `.fit`) | `forge_work.hero` + resident phase (`town.ts:471-477`, `1619-1627`) → `refit()` (`town.ts:2102-2127`) | walks from wander/bench to `FIT_AT`, faces the smith while work lasts, returns to bench/wander | **real state-driven ritual** | `docs/evidence/cut228/gpu/forge-*` (hero 3 at the anvil), `README.md` | n/a (delivered) |
| **home residents** (roster) | `L.hero_slots` filtered `life_state != away` (`townState` `town.ts:435-452`), `life_state` from `persistent.rs:199` | *set* and *phase* are real; the wander loop tent→forge/crate→fire with 2-6 s pauses (`town.ts:1578-1614`) is generic and seeded. Resting/recovering → **seated** at a pool bench (`town.ts:1630-1643`); reincarnating → the device spot (`town.ts:1628-1638`) | mixed: real for phase (pool/device), generic wander otherwise | `docs/evidence/cut228/gpu/*` (hero 3 on the bench); `cut228/client-home-groups.log` `home-resident-phases` 25 checks | n/a for the wander; any "training/fitting reason" needs a native reason (audit: random walkers are not the fix) |
| **returning parties** (absence) | `ReturnReport` (`absence`) exits/kept (`townState` `town.ts:345-383`) | one walker per returned run walks out of the mouth to the tent, with sack/chest/pet (`town.ts:1525-1568`, carry `town.ts:1552`) | real state-driven (per absence) | source only; no named PNG in `docs/evidence/cut228` | n/a |
| **child / carter** (townsfolk) | none — seeded by day (`buildFolk` `town.ts:1667-1725`; comment "cosmetic, seeded, never read back") | child circles the fire; carter walks exit→south→kennel→south carrying `town_cart` (`town.ts:1721-1734`) | generic/idle-only (cosmetic) | `docs/evidence/handoff-lighting/*` (town lighting frames show the dress, not this routine) | n/a (cosmetic by design) |
| **merchant** | `stage >= 3` (`town.ts:2186-2191`), `FOLK_AT.merchant` `town.ts:209` | step-bob at the stall | static decoration | — | n/a |
| **fire** | none (`state.home`, `town.ts:2589-2607`) | smoke + embers always at home | static decoration | cut228 gpu frames | n/a |
| **Forge building / anvil / chimney** | `built(blacksmith)` (`town.rs:101`), `forge_work` for the ritual | build sprite + look level; chimney smoke always (`town.ts:2628-2640`); build dust on construction (`town.ts:2650-2670`); forge emitters always (`town.ts:2357-2365`) | building real (existence) + ritual above | cut228 gpu + README | n/a |
| **Bank building** | `built(bank)` (`town.rs:101`) | sprite; coin marker when `absenceNew && bank>0` (`town.ts:425-426`) | static decoration + marker | none | n/a |
| **Kennel building** | `built(kennel)`; penned pets = `L.kennel.slice(0,2)` (`town.ts:464`) | sprite; up to two penned pets lie by it (`town.ts:2433-2436`) | real state (penned pets) | none | n/a |
| **house** | `L.town.home` + stage → `houseLook` (`town.ts:320`, `town.rs:101`) | growing house sprite | real state | cut228 gpu, handoff-lighting frames | n/a |
| **guild / pool / device services** | `L.persistent_hero[id].available` (`townState` `town.ts:455-457`) | drawn; pool adds benches + water motes (`town.ts:2324-2338`); device shows its `_active` frame while a resident is `reincarnating` (`town.ts:2314-2322`) | real state (availability + reincarnating phase) | `docs/evidence/cut228` (hero 2/3 phases) | n/a |
| **haul chest** (pre-porter) | `L.tree.chest` + porter node state (`town.ts:398-412`) | closed/empty, full (hop + glint + light), open on tap | **real state-driven prop** (current design, Cut 30.5) | cut228 gpu whole-town frames | n/a — **not** the retired Storehouse; do not remove |
| **Storehouse / keeper / armourer** (retired) | **none** | nothing drawn or read | **dead/unreachable** (retired) | `town.rs:12` `BUILDINGS` has no storehouse; `town.rs:518-519` asserts `build_town("storehouse")` errors and `tree::def("keeper"\|"armourer")` is `None`; `tests_cut305.rs:301,324`; `tree.rs:80-93` `NODES` has neither | already removed from the draw/read path (see "Retired paths") |

## Retired Storehouse hauling — confirmation

**Nothing live draws or reads it.**

- Core: `town::BUILDINGS = ["blacksmith","kennel","bank"]` (`town.rs:12`); `tree::NODES` (`tree.rs:80-93`) has no
  `keeper`/`armourer`; `tree::def("keeper"|"armourer") == None` and `build_town("storehouse")` errors
  (`town.rs:518-519`, `tests_cut305.rs:301,324`); `wire` filters `Town.workers`/`buildings` to those ids (`town.rs:469,588-597`).
- Renderer: `BUILDINGS`/`BuildingId` (`town.ts:38`), `PLOTS` (`town.ts:52-67`) and `WORKER_AT` (`town.ts:185-195`) contain
  no storehouse/keeper/armourer; `workerAt` (`town.ts:214-215`) can only resolve live ids; `townState` filters
  `town.buildings` through `BUILDINGS` (`town.ts:327-330`), so a legacy save/fixture entry is dropped.
- Residue only (no code path): stale comments in `web/src/engine/types.ts:866` (Building lists `storehouse`) and
  `web/src/engine/types.ts:1028` (post list includes `storehouse`); `web/tests/fixtures/earned-gunner-home.json` still
  carries a `storehouse` building (filtered out); `art/town-ids.md:70,118,120` documents `town_storehouse_1`,
  `town_worker_armourer`, `town_worker_keeper`, and `web/public/art/atlas.json` + `web/src/render/town_lights.json`
  still pack/lit those frames — **unused**, since no live id requests them.

## Three highest-value missing routines (with what would prove each)

1. **Scout escort on a real send (Guild → mouth).** Native truth today is only hired/paused plus the auto-send
   transition (audit Scout row), so no departure can be authorised. Proof: a read-only `activity { id, kind:"send",
   worker:"scout", resident, origin, left_s }`-style field with a real send identity; then a 400/1440 × day/night × GL/Canvas
   capture of only the *actually departing* resident walked to the mouth, 100 read-only refreshes creating 0 replayed
   departures and 0 new acts, exact save equality, and matched IDLE/PICKED 16×14 byte-identical results.
2. **Kennel-hand/keeper pen routine over real penned pets (+ fix the keeper's missing art and post).** Proof: pen/pet
   identity + a breed/sort receipt (`tree.acts`/`bred_by_hand`) on the wire; a capture of the hand directed at an
   *actually penned* pet (never an away pet), the new `town_worker_kennel_keeper` sheet frame and a `WORKER_AT` offset
   that no longer sits on the kennel building's foot, with primitive-fallback and context-loss frames.
3. **Clerk ledger check after a confirmed deposit.** Proof: a deposit receipt identity (owner/tick/origin, from the
   `bank …` ledger line) exposed read-only; a capture of the clerk's ledger/resting ledger pose only after a real deposit,
   0 pose after a read-only refresh or an interest-only delta, and a Full/Low/Off/reduced matrix each preserving the
   exact save and the native report.

## Explicit unknowns

- I inspected the shipped `web/public/art/atlas.json`; whether the build regenerates it from `art/` the same way for a
  production package is unverified (read-only).
- No capture in `docs/evidence/cut228/**` or `cut251/**` shows a hired worker other than the paused Scout
  (`cut251`) or the forge smith + fitted hero (`cut228`); I did **not** open the PNGs under `docs/evidence/handoff-lighting/**`,
  `cut208/**`, `cut219/**`, `cut250/**`, `current-scaling*/**`, which may incidentally contain other workers at their posts.
- Whether the `kennel_keeper`'s `PLOTS.kennel` fallback visibly overlaps the kennel sprite is predicted from
  `town.ts:214-215`, not captured.
- The runtime look of the pool-seated / device-reincarnating resident poses is inferred from source
  (`town.ts:1630-1643`, `2314-2322`); the Cut228 bench capture shows hero 3 on the bench but no R5 capture isolates
  the device pose.
- I searched only `crates/idlever-core/src` and `web/src` (plus tests/fixtures/art) for retired ids; a residual read in
  another tree (e.g. tooling) is not excluded.
