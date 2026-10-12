# Riddle handoff — Cut185 checkpoint, 2026-10-12

Owner asks to finish the current queue/refinement and PAUSE at this checkpoint
because weekly quota is low. No new content or rating round should start until
the owner resumes. The fun>=80 goal is unfinished; DO NOT DEPLOY.
Commit/push and milestone screenshots remain authorized.

Read PLAN.md, docs/CUT30_5.md and AGENTS.md. Prior long handoff is preserved at
`docs/evidence/cut185/checkpoint/prior-handoff.md`.

## Latest owner direction

1. Deeper class trees, specifically **cumulative ability unlocks**, superseding
   the initial exclusive combat-path proposal.
2. Steady progression with fewer simultaneous decisions.
3. Home-base graphical polish, including basic shadows, in the original style.

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

Current full client73394 TERMINAL1: **123/125 in489.096s**. All568 recorded source/
WASM inputs match. The newclass-tree group passes; failed existing groups:
- class-switch: Escape did not clear.sheet-wrap within30s, cause unproven.
- clarity:paint: controlled first forecast1277ms versus1200ms; original1313ms,
  retry logged hostload37 on32cores. Real-WASM quiet firstpass median210ms and
  refine bounds pass. This is NOT proof that host load caused the failure.
Unchanged sequential diagnostic77833 TERMINAL0: bothgroups2/2 in47.4s. This
neither repairs nor certifies the failed full invocation. Full success remains
pending, and489.096s also misses the historical359.449s compaction target; scope
isnow125 and artifactfastWASM, not the old124-group shipping comparison.
**Do not claim full client acceptance, shipping acceptance or a fun score.**

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

## Resume only when requested

1. Reproduce the two failed full-client groups as needed, preserving the original
   run and unchanged bars. Capture actual tooltip/focus/sheet state if Escape
   times out again; do not assume a cause. Achieve a fresh complete client pass.
   New125-group scope and fastWASM benchmark should not be silently relabelled
   the old shipping124-group20%-runtime acceptance.
2. Complete fresh shipping-WASM/native current-game acceptance for new Rust
   source. Earlier Cut177 native acceptance certifies old runtime only.
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
No deployment. Git remote gyng/riddle verified and authorized; do not stage
mine.bars or scratchpad. Raw logs preserved byte-for-byte, including whitespace;
explicit force-add only named evidence logs. Local core.fsync=committed enabled
following recovered Git corruption. Original metadata backup stays private.

Validation commands: tools/verify.sh --quick; `pnpm --dir web -s test:full` current
inventory (future files join automatically); `pnpm --dir web -s test:exhaustive` retains original
166 groups/widths plus new files. Original compaction baseline1797.246s,
accepted124-group340.043s and latest pre-cut359.167s, no80%defectdetection claim.

Checkpoint ready for commit/push, then goalpause perowner. No validators, rating
players or delegated coding tasks remain running. Existing local preview
servers may remain for review;53741 is current diagnostic source,41273 oldfreeze.
Unrelated mine.bars andscratchpad are excluded fromcommits.
