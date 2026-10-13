# Idlever handoff — queued implementation resumed, 2026-10-13

Owner resumed the full queue on2026-10-13 with the active objective:
**resume and finish all queued items verified and refined**. Prior pause is
revoked. Commit/push and milestone screenshots remain authorized. No blanket
new deployment is inferred; Pages still deploys published releases only.
All38 current product items plus retained visual/content work remain in scope.
Acceptance ledger: docs/QUEUE_ACCEPTANCE.md.
The fun>=80 goal remains unverified; do not narrow completion to a small cut.

Current cuts: CUT191_BUILD_ECONOMY (free preparation complete; remaining loot
work pending), CUT192_HOME_INTERACTIONS (building help/hover), CUT193_UI_CLARITY
(scroll/Delve/Chronicle/chrome), CUT194_HOME_HEROES (actual actors/cave portraits),
CUT195_BUILDING_FX (construction/appearance). Required tests/evidence remain
pending for any cut without a recorded pass. Historical paused notes below
record their earlier checkpoint, not a current instruction to stop.

Current checkpoint: Cut191 free preparation passes seven focused tests and the
integrated native workspace829/829 (6 explicitly ignored), Clippy warnings
denied. Raw logs, including the initial old-fee805/24 failure, are preserved
in docs/evidence/cut191. Found loot conversion, Keep removal, simpler exits and
Loadouts are still pending. Final exact-source WASM6414194bytes and four
focused worker/UI groups pass4/4 in8.6s. Do not claim all economy requirements
complete.

Cut194 moving-hero targets and genuine delve portraits pass three GPU groups
in32.7s at400/1440. It checks three real actors, exact1px target tracking,
keyboard/touch/mouse identity, two simultaneous actual delves and8h refresh.
Cut195 construction/upgrade presentation passes final four focused groups in
48.2s on the exact-source WASM, with GL400/day and Canvas1440/night captures.
Full/Low dust is bounded22/8; Off/reduced is static. Initial loads/refused
actions/reloads produce no build animation; successful state changes remain
immediately usable. Production web build passes with existing bundle/import
warnings. Shared-check frame P95 is high and unisolated; quiet frame-cost
certification remains open. No deployment or broad fun acceptance is inferred. Next core stage
is docs/CUT196_SINGLE_LOOT_VALUE.md: audit found duplicate pickup/salvage value,
unreset checkpoint raw carry and merged-leash valuation/provenance risks.
Correct accounting before measuring new pacing; no fix is claimed yet.

Owner amendment 2026-10-12: fix Pages deployment and publish the first alpha.
This explicitly authorizes this release and its deployment. Content work and
the fun>=80 rating goal remain paused. See docs/CUT187_ALPHA_RELEASE.md.
The owner also requested default Oxfmt/Oxlint setup and automatic fixes before
release (docs/CUT188_DEFAULT_TOOLING.md). Clippy was already enforced.

Owner amendment2026-10-13: rename the game/repository to **Idlever** for search
visibility and regenerate its title in the approved style. This replaces the
brief, unpublished Ridle direction. It authorizes the rename and the necessary
release deployment at `/idlever/`; current contract: docs/CUT190_IDLEVER_RENAME.md.
Content and fun-rating work remain paused. Prior release tags and historical
evidence remain immutable. The owner explicitly waived backwards compatibility:
active crates, WASM modules, browser globals, events, storage/settings keys and
diagnostic markers use Idlever identifiers. No old-brand aliases or migration
code are required. Actual local checkout paths remain valid.

## Owner requirements — 2026-10-13, implementation resumed

The owner subsequently resumed implementation of all additions below. See
[WORK_QUEUE.md](WORK_QUEUE.md) for priorities, dependencies and checkpoints.

Latest owner design priority: **the main fun is trying builds and seeing how
far they get**. Gear, class branches, Legacy, tactics and pets should support
that loop; automatic loot and base life reduce chores and give results context.

1. Make Keep automatic. Preferred direction: convert all found loot into the
   existing currency, use the forge for permanent gear unlocks/upgrades, and
   unlock custom starting kits gradually. Unlocked items are free to use. **Deepen forge/starting-kit customisation alongside loot
   simplification:** meaningful weapon/armour/modifier tradeoffs, class/tactic
   synergy and saved reusable kits, introduced in stages. These option types are
   design candidates; first prove two earned unlocked Fighter kits at one wall, free to use.
   Keep a viable default and automatic reuse, with no shopping chore per delve.
   Reassess/remove/merge Storehouse if it no longer serves a purpose.
   This supersedes the older useful-upgrade retention proposal.
2. Simplify banking and currency progression. Stage early unlocks; Forge and
   Storehouse after the first run feel too fast. Write a combined economy/pacing
   contract before implementation; do not silently replace existing rules.
3. Explain “first: the cage” and why runs end. Audit the exact label and actual
   bank/retreat/death/clear causes, then show readable outcomes and transitions.
4. Make base heroes and useful objects clickable. **Every home-screen building
   needs both a tooltip and a visible hover state**, including locked/unbuilt
   plots. Cover scene targets/nameplates/`(i)` help, with keyboard focus and
   tap/click access; explain purpose, state and requirements without accidental
   purchases or misleading enabled states. Audit complete building coverage.
5. Put Legacy and Class tree in Bloodlines tabs; show their branches as connected
   nodes. Preserve cumulative learned skills and bloodline identity.
6. Refine large-desktop font sizes, hierarchy and spacing; retain phone readability.
7. Rename player-facing **Send → Delve**, including related copy/accessibility.

8. Give different menus distinct chunky materials in the original art style:
   Forge uses metalwork; parchment belongs on suitable journal/report surfaces.
   Audit the full menu family and preserve common interaction conventions.
9. Make quests/progression an MMO-style journal with meaningful objectives,
   progress, rewards and context. The current progression labels feel empty.
10. Fix expanding run details pushing the viewport upward; preserve reading
    position and focus. This can be an independent small bug-fix checkpoint.
11. Audit the unclear “song” click and recurring wish busywork. Current Rust
    song wish spends gold for2 Legacy and schedules the next wish a day later.
    Verify the clicked surface and make purpose/cost/result clear; consider
    integration, automation or removal with explicit economy impact.
12. Make base life an ant farm/garden parallel to delving: meaningful visible
    hero recovery, training, kit preparation and interactions, driven by actual
    state. These routines are candidates; no new tending or daily-claim chores.
13. Show genuinely delving heroes' portraits over the cave, with matching
    hero/watch navigation and correct multiple-hero/return/death/offline updates.
14. Reclaim wasted desktop bottom-bar space. Explore floating collapsed delve
    controls; keep expanded controls and necessary status readable and usable.
15. Compact top-bar labels without losing values, actor identity or accessibility.

16. Review forge/preparation access for leashes and integrate pets with builds
    and base life. Reuse existing tame/companion/kennel systems. Consider an
    optional Petmaster class; ordinary pet access need not require that class.
    Replace confusing “first tame” with **“Tame a pet with a leash”**, show a lock
    while unmet, and make leash acquisition and actual taming state clear.
17. Queue new **Clown** and **Engineer** classes with distinct build identities.
    Tricks/decoys/risk-reward and gadgets/traps/constructs are concept candidates,
    not selected mechanics. Show contrasting builds and weaknesses before adding
    a full class catalogue; keep original art direction and staged unlocks.
18. Make build trials and endings satisfying. Audit early banking/retreat rules
    that stop healthy heroes as well as abrupt transitions. Show depth, actual
    stopping cause, pivotal encounter, rewards and comparison to prior build
    trials, so the player can revise the next kit. Coordinate with the simpler
    banking contract; preserve truthful outcomes and automatic/offline play.

19. Make the live view more diegetic and useful for understanding builds.
    Audit actual action/target/skill/pet/status events and missing visible cues;
    use appropriate combat/skill animations and FX to explain what happened and
    why. First compare two earned builds at one wall. Integrate the prior combat
    FX queue into this pass; retain truthful attribution, pause/seek/speed,
    knowledge limits, readability, effects controls and GL/Canvas fallbacks.
20. Explain floating gold on the forge: audit the badge's actual meaning and
    label what the amount is for, visibly and with useful contextual details.
21. Animate real gold gains/spending between their true sources/destinations.
    Scale particle size/strength with value under a cap; retain exact amounts,
    correct hero identity and accessible reduced/off-effects feedback. Aggregate
    offline batches; never animate failed purchases or change/duplicate balances.

22. “Supplies” is confusing. Consider a Loadouts section/tab in Bloodlines for
    gear, consumables and pet/leash selection, alongside Class tree and Legacy.
    Forge owns unlocks/upgrades; Loadouts selects and saves the eligible build.
23. **Firm rule: unlocked items are free to use.** Supersedes earlier paid kit
    preparation. No gold charge to equip, use, restock, reuse or replace an
    unlocked item; include consumables and leashes. Permanent unlocks/upgrades
    may cost gold. Verify zero-gold builds, repeated/offline delves and explicit
    ownership/slot rules; amend affected old economy gates in the design cut.

24. Add a live depth map beside the scene, with current floor, known boss/POI
    markers and relevant milestones/personal bests. Use actual route/knowledge
    data and the selected hero/replay cursor; support floor changes, seek and
    offline updates without future spoilers or excessive HUD space. Markers
    offer accessible details and fit both phone and desktop layouts.

25. Explore subtle footsteps or a short-lived movement trail for the tracked
    hero in live view. Use actual known movement and replay timing; keep it
    bounded/readable, clear on floor changes/seek, and respect pause/speed,
    reduced motion, effects settings and GL/Canvas fallbacks.

26. Audit hover/pressed/selected/focus-visible/disabled/locked states across
    buttons, tabs, toggles, tree nodes, icons and scene controls. Use each menu's
    chunky material identity and truthful active states; preserve keyboard/touch
    access, readable reasons for disabled states and stable hit targets/layout.

27. Make bottom Tactics/Orders/Heirs clearer as unlock/progression systems.
    Use the queued MMO-style journal for optional guided onboarding: purpose,
    actual requirements/progress, meaningful unlock/reward and a useful next
    action, with contextual links and clear locked/available/unlocked states.
    Stage choices, allow dismissal/reopening, and avoid forced tours/claim chores.
    This owner-requested guidance supersedes old blanket no-tutorial-text advice
    for this future pass; concise chrome remains required.
28. Remove distracting random/periodic sweeping sheens from top and bottom bars.
    Preserve static materials and hover/focus feedback; scene/menu/gold effects
    are separate from this targeted chrome removal.
29. Add a truthful Chronicle empty state. It currently records ended heirs,
    not every completed delve; explain this without encouraging deliberate death.
    Cover empty/current/other-bloodline and first-record states with correct
    identity and useful current-hero/run navigation.

30. Consider a guild hall/reception hub for scout hiring, journal guidance and
    base life, inspired by Girumasu/Guild Receptionist. Current scout is a Works
    hire after3 manual sends (half a forge unit), posted at the campfire; it
    enables automatic sends after rest. No guild hall exists. Primary anime
    references and the proposed interpretation are in WORK_QUEUE.md.
31. Consider recovery pool/reincarnation facilities: same persistent named hero
    returns after defeat with a short automatic/offline cooldown. Define retained
    stats/skills/gear/pets/currency and rename Heirs appropriately if adopted.
    Preserve truthful failed-delve causes; avoid another tending/building chore.
32. Allow clear individual hero renaming and deliberate persistent stat builds
    such as Strength-focused heroes. Audit/refactor Legacy rather than stacking
    redundant progression; needs should support recovery/training/base life,
    not hunger/mood upkeep or missed-visit penalties.
33. **Firm design distinction: builds/specs easy to change; stats slower/harder
    to gain or change.** Consider optional deliberate hero NG+/rebirth to reset
    unwanted stat commitments, with explicit eligibility and reset/retention
    preview. Ordinary death recovery must not silently reset stats. Review
    existing ascensions; no routine paid respec/reroll chore or trapped early
    stat build. Define and gate the combined hero/Legacy model before coding.

34. Add building construction/upgrade FX: material-appropriate assembly/reveal
    and clear completion feedback in the original style. Start with one actual
    purchase, then cover buildings/upgrades. Coordinate gold particles and keep
    tooltips/targets readable. Presentation follows real successful events;
    instant construction gains no artificial timer, cost or usability delay.
    Cover reload/offline, day/night, motion/effects settings and renderer fallbacks.

Coordinate skill icons with the revised trees and live-view cues. Combat FX
is part of the build-focused live-view work, not a duplicate later polish pass.
Content implementation and fun-rating work remain paused. No game behavior
changed by this documentation update. No backwards compatibility is required.

## Idlever — current checkpoint

GitHub is now `gyng/idlever`; origin and Pages settings use
`https://gyng.github.io/idlever/`. New artwork and all active namespace names
are integrated. Existing local checkout remains `/home/g/p/riddle`.
No old-brand aliases or save/settings migration were added.

Local quick checks, Clippy, shipping WASM,17 dayplayer tests and27 tooling tests
pass (6 Rust tests ignored;1 optional tooling test skipped). Real-WASM/PWA and
private GPU smoke pass the new title, fresh town and direct saved-game reload.
First full client run124/125: watch-live-edge timing failed during native-test
overlap; unchanged isolated rerun passes. Full repeat passes125/125 in433.2s. Preserve
both outcomes; the timing failure's cause is unproven. Alpha.2 is published at
source `79032ef5`. Release workflow38278721510 passed build and deploy.
Live site: https://gyng.github.io/idlever/. Twelve live files match the exact
release artifact. Live real-WASM/PWA and private D3D12/NVIDIA smoke pass fresh
house/hero, direct saved-game reload and offline reload, with no page errors or
HTTP failures. Title screenshots at320/400/1440px are archived with live proof. See docs/CUT190_IDLEVER_RENAME.md and docs/evidence/cut190/.

## First alpha and tooling — historical checkpoint

The first alpha was released under the original Riddle name at `/riddle/`.
Its archived evidence records that source, branding and URL. Current public
links use the renamed repository; the new brand ships as alpha.2.

`v0.1.0-alpha.1` was published as a prerelease from `29752da9`, following the
owner's explicit release request. Pages now deploys published versioned
releases, including prereleases. Main pushes, PRs and manual runs validate only.
The Pages environment permits `v*` tags; the former main-only policy is removed.
Deployment passes: run38270161875. Live production files match the release
artifact, and private D3D12/NVIDIA smoke passes new-town construction, real WASM
and direct saved-game reload. Proof: docs/CUT187_ALPHA_RELEASE.md and
docs/evidence/cut187/live/. The original alpha was live at `https://gyng.github.io/riddle/`; this is historical evidence.

Oxfmt 0.72.0 and Oxlint 1.87.0 are locked web dev dependencies. They use default
rules, with generated engine files/raw save fixtures excluded from formatting.
Use `pnpm --dir web fmt`, `fmt:check`, `lint` and `lint:fix`. Both checks now run
in tools/verify.sh and CI; existing default Clippy rules remain enforced with
warnings denied. Maintained client/tests/tooling were formatted and all 177
initial lint diagnostics resolved. Rust gameplay and raw fixtures are unchanged.

Final source validation: 822 Rust tests pass, 6 ignored; 14 tooling tests pass;
typecheck, copy lint, formatter/linter and Clippy pass. Shipping WASM is
4,922,959 bytes (SHA256 `4852596a08429dd13585088a58cf7048f31b6766708b2beee0136e491929220b`).
Current-game native full regression passed fresh in 942s; final verification
reused valid regression caches and passed in 255s. The separate exhaustive
balance/migration audit was not run.

Full client run: initially 124/125 in 357.3s, with a class-tree confirmation click
timeout. That test passed unchanged alone in 61.6s. The complete unchanged
repeat passed 125/125 in 371.1s, default 12-browser pool, with 840 checked source,
asset and WASM inputs unchanged. The earlier timeout's cause remains unproven;
do not claim it was fixed or erase the failed run. The older Cut185123/125
result below remains historical. No fun>=80 verdict is certified.

Read PLAN.md, docs/CUT30_5.md and AGENTS.md. Prior long handoff is preserved at
`docs/evidence/cut185/checkpoint/prior-handoff.md`.

## Earlier owner direction — implemented and retained work

1. Deeper class trees, specifically **cumulative ability unlocks**, superseding
   the initial exclusive combat-path proposal.
2. Steady progression with fewer simultaneous decisions.
3. Home-base graphical polish, including basic shadows, in the original style.
4. Queued after the checkpoint: dedicated icons for all 30 class skills and
   improved combat animations/FX. This request updates the queue only; the
   broader implementation/rating goal remains paused.

## Visual queue — not started; integrated with latest owner priorities

See [WORK_QUEUE.md](WORK_QUEUE.md), current owner additions. After the latest product priorities, deliver six
Fighter skill icons, then complete all30 skill IDs across five classes. Replace
generic tactic icons with readable skill-specific art in the tree/reviews,
preserving the original style, 24/32/48px readability and primitive fallbacks.

The latest diegetic live-view request now includes the combat-animation/FX
audit, starting with matched earned builds at one wall; do not duplicate it.
Use actual attack/impact/heal/status and replay events; distinguish hit/miss and
active/passive effects honestly. Cover all five classes, pause/seek/speed,
multiple actors, reduced motion and effects full/low/off. Preserve telegraph,
target and HP readability; measure private-GPU costs and keep GL/Canvas fallback.
Post screenshots/clips at milestones. No gameplay, unlock, RNG or save changes
for this visual pass. No assets/effects have been created by this queue update.

## Implemented queue

All five classes have six cumulative skills: two roots, two children per root,
30 authored nodes. Existing class levels provide at most six derived picks,
`min(6, level-2)`, one per learned skill. Gates: roots L3/D8; one child per branch
L5/D13; another L7/D18. Parents, siblings and other branches stay learned.
Existing class XP thresholds, ordinary ability unlocks and later Sentinel/
Hexbinder schedules stay intact. No extra XP currency or automatic assignment.

Skills improve actual existing abilities (damage, healing, control durations,
cooldowns and reload deadlines), with named contextual tactics. Six-bit class-
local masks snapshot at send; zero is omitted from old/no-choice saves. No new
RNG draws. Literal written rules receive ability benefits without injected
policies. Children compile before parents in stable authored order. Current
mask feeds forecast keys; inactive-class memory does not. Free reset at home
returns derived picks for current class only, without XP/resource loss. Learning
and reset refuse active runs. Memory is per class and bloodline.

Rust: class_tree.rs/class_tree_tests.rs; hero/ai/firearm ability effects;
class_skill_effect_tests.rs; engine send/save, forecast keys, packages, wire and
WASM/native APIs. Wire Lineage.class_tree; learnClassSkill/resetClassSkills.
Generated native bridge and native-api.json updated.

Client: class-tree.ts +class-tree.css and Hero integration. L1 hides tree;
L2 previews one milestone. Learned nodes and the next reachable tier show;
future map and owned skill rules fold. Derived picks and next class level stay
visible. Class pickers show learned abilities +next tier, folding later skills.
Reviews show benefit, actual rules, owner, cost/refund; cancel/stale/refusal/
double-confirm/reload handled. All gates and amounts remain Rust-owned.
Contract: docs/CUT185_CLASS_TREES.md.

Home renderer: town.ts/town-terrain.ts contact shadows on buildings, characters,
pets and physical props; short daytime cast shadows and grounded landscape
cutouts. Existing painted style, wall-clock lighting, wind and mono night
lanterns retained. Shared GL/Canvas texels, cached shapes, no extra lights.
Contract: docs/CUT185_HOME_GROUNDING.md.

## Validation and evidence

Core focused cumulative tests:1341 TERMINAL0,10/10 in10.22s, including90 bounded
node/seed diagnostics and actual actions in all five classes. Effects18161
TERMINAL0,5/5, covering all30 modifiers, landed-hit comparisons, deadlines,
healing, stacking, mask/save behavior and unchanged RNG stream. Clippy81412
TERMINAL0 with warnings denied. These controlled cases are not universal
balance or fun evidence. Some contextual nodes have zero fires on individual
sampled seeds, honestly logged.

Earlier exclusive prototype and every failed compile/cache/gate/action fixture
are preserved under docs/evidence/cut185/class-core/. The owner amendment
superseded exclusive choices; its passing tests do not certify cumulative work.

Renderer: types; town-clock/save/cut30town3/3; earned-save400/1280 day12/night23
before/after shots; GL/Canvas/cache/wind/lighting/context recovery pass. Original
15730gold unchanged; cosmetic hour override only, no Date.now change or play
credit. Stress CPU p95 3.9ms with26walkers, not a quiet-machine FPS certification.
Evidence docs/evidence/cut185/home-renderer/. Day phone checkpoint posted.

Final integration checkpoint: whole quick84824 TERMINAL0 in71s:822Rust tests,
6ignored, types/copy and14tooling checks. New UI group79074 TERMINAL0 at320/400/
1440, all five cumulative trees. Earned originalL5/D22 town normally learns
three skill nodes, preserving15730gold/1767classXP; privateGPU screenshots pass
all three widths. Evidence undercut185/checkpoint/earned-tree-shots/.

Historical Cut185 full client73394 TERMINAL1: **123/125 in489.096s**. All568 recorded source/
WASM inputs match. The newclass-tree group passes; failed existing groups:
- class-switch: Escape did not clear.sheet-wrap within30s, cause unproven.
- clarity:paint: controlled first forecast1277ms versus1200ms; original1313ms,
  retry logged hostload37 on32cores. Real-WASM quiet firstpass median210ms and
  refine bounds pass. This is NOT proof that host load caused the failure.
Unchanged sequential diagnostic77833 TERMINAL0: bothgroups2/2 in47.4s. This
neither repairs nor certifies the failed full invocation. Full success remains
pending, and489.096s also misses the historical359.449s compaction target; scope
isnow125 and artifactfastWASM, not the old124-group shipping comparison.
These historical checks do not certify acceptance. Cut187/188's complete
shipping/native/client results above supersede the pending mechanical checks;
the fun score remains uncertified.

Current fastWASM89561 TERMINAL0,6381646bytes,
SHA5ac794b1e80d4cbfcf4dd44a38deb7f72df8bdef01e454bc22ea1f30f7d6c9ab.
Native bridge generationcheck passes. Frontend build16394 TERMINAL0 usingfastWASM; sourceguard568 stillmatches.
Bundle-size warning retained. This is a local build, not a clean frozen candidate
or shipping-WASM certification.
Initialquickfailedactualproxyregistration; fixedlearnClassSkill/resetClassSkills.
UI fixture failures (ghost scope,reloadhelper,asyncparentpaint) preserved and
corrected without numeric/time-limit relaxation. Full audit and all reruns remain
separate evidence. Source integration complete; acceptance limits remain explicit.

## Rating goal and frozen builds

No accepted fun score. Cut184 fresh neutral CLI startup audits reported no
prohibited source/design/QA/target exposure. Both players ended incomplete:
A48calls/0images; B180calls/2images; neither certified active horizons. Both raw
cards locked; neither awards inspected or scored. Full49original files and raw
CLI/public-operation evidence archived byte-for-byte with SHA manifest at
cut184/incomplete-independent-cohort/. No repaired card or transferred time.
Owned browsers and gateways intentionally closed after terminal.

The previous immutable candidate remains **8c17acb** on41273, not Cut185.
Path /tmp/riddle-cut183-8c17acb4e15e-frozen/assets,262files; manifestSHA
c38cc86f30d4485c587cb931702f86672ecd882138b0135fb2e98421c26cbd4b.
Its source/real shipping-WASM/hash/construction/reload/GPU smoke accepted.
Old41271 is historicalb60. Do not release new players to either for Cut185.
Mutable development53741 (owned renderer preview44167) serves current source;
source changes mean it is diagnostic only, never a frozen rating build.

## Historical Cut185 acceptance work (now resumed)

1. Preserve the historical failed runs and the complete alpha pass. Investigate
   the unexplained class-tree timeout if it recurs; capture actual tooltip,
   focus and sheet state rather than assuming load caused it. Repeat acceptance
   when source changes or a remaining concern warrants it. The current125-group
   shipping audit is distinct from the old124-group compaction benchmark.
2. Complete fresh shipping-WASM/native current-game acceptance for new Rust
   source. Cut187/188 certifies the alpha runtime only.
   Exhaustive272/30-seed balance audit remains separate and uncertified.
3. Finish any real integration failures before adopting/freezing new assets.
4. Fresh scoreless QA on new features, dispositions, same-sitting calibration,
   then TWO complete independent pure-context ratings on the SAME new immutable
   build. No reuse of old incomplete/purity-broken cards/time.
5. Preserve protocol:40/5/5/20 actual active; ordered20m/4h/8h SAME save; first10
   unnoted;3actual deaths read;2completed owner-named written edits;2Normal
   watches each3min DIRECT observation;1000tools/120images. Criterion before
   probes before awards; BOTHrawlocks before inspection; all16 reliability axes;
   alpha>=.8,all7killsfalse,mean after measured applicable caps>=80. Unknown
   proxiesNA/audiounassessed/delayedRecall empty until actual next-day followup.
   Neutral CLI method: cut170/blind-context-amendment.json, actual startup audit
   mandatory, no design/history/QA/desiredscore. Never repeat incomplete trials
   as if complete, or claim automation wait time as directly observed play.

## Operating reminders

No desktop focus: headed browsers privateXvfb tools/browser.mjs only.
Deploy through published releases; prior alpha deployment was authorized.
Queued implementation is active. New deployment needs explicit authorization.
Git remote gyng/idlever is verified and authorized; do not stage
mine.bars or scratchpad. Raw logs preserved byte-for-byte, including whitespace;
explicit force-add only named evidence logs. Local core.fsync=committed enabled
following recovered Git corruption. Original metadata backup stays private.

Validation commands: tools/verify.sh --quick; `pnpm --dir web -s test:full` current
inventory (future files join automatically); `pnpm --dir web -s test:exhaustive` retains original
166 groups/widths plus new files. Original compaction baseline1797.246s,
accepted124-group340.043s and latest pre-cut359.167s, no80%defectdetection claim.

Historical pause checkpoint: it was ready for commit/push, then goalpause per
owner, with no validators, rating players or delegated coding tasks running.
That pause has since been revoked; current activity is recorded at the top. Existing local preview
servers may remain for review;53741 is current diagnostic source,41273 oldfreeze.
Unrelated mine.bars andscratchpad are excluded fromcommits.

## Cut186 — scoped button polish after pause

Latest owner asks taller Continue and improved chunky class controls. CSS only:
Continue/Newgame primary104px; class-picker controls64px/fullwidth; skill/reset
and specialization review/actions56px, shared existingiron/gilt frame, clearer
selectedclass, preservedfallbacks. No Rust, rules, XP orsavechanges. Broadgoal
remainspaused; no ratinground orfullshippingaudit resumed.

Existingtargetedgame-menu/class-locks pass2/2 (81menuchecks, all3widths),
class-styles pass1/1 all3widths. PrivateXvfbGPUcheck320/400/1440 passesactual
heights104/64/56, zerooverflow/errors andexactunchanged earned save. Finalmenu
shots wait forexistingillustrationdecode (initial shotwas takenbeforeimage
loaded; noartsourcechange). Copylintpasses. Evidence/screenshotshere:
docs/evidence/cut186/button-ui/. PriorCut185full123/125 andshipping/balance
limits remainunchanged, notcleared bythisscopedpolish. Nofrozenassetmutated,
nodeployment. Commit/pushauthorized; unrelatedmine.bars/scratchpadexcluded.

## README refresh

The owner requested another ASD-STE100-inspired rewrite and removal of all
developer instructions from README. README is now a short player guide: game
description, first steps, death/progression and features. It retains the title
art, Play/release links and three screenshots. Each screenshot displays at450px
height with its original aspect ratio; source images are unchanged. The middle
capture used an800px viewport, while the other two used900px.

Local setup, formatting/lint commands, architecture, validation references,
developer docs and release deployment instructions now live in AGENTS.md.
README links there once. No formal ASD-STE100 compliance is claimed. This
documentation-only follow-up does not change the published alpha tag or resume
content/rating work. See docs/CUT189_README_PLAYER_GUIDE.md.
