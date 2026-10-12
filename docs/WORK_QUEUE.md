# Content and refinement queue — 2026-10-13

## Current checkpoint and owner additions

Idlever alpha.2 is live at https://gyng.github.io/idlever/ from `79032ef5`.
Release build/deployment and live real-WASM/PWA checks pass. The full client
repeat passed125/125; its earlier timing failure is preserved in Cut190 evidence.
The exhaustive audit and verified fun>=80 remain unfinished. Read
[HANDOFF.md](HANDOFF.md) for exact evidence and limits.

**Queue only. Implementation and rating work remain paused.** The owner's
2026-10-13 feedback below takes priority on resume. It supersedes the earlier
proposal to automatically keep useful drops and salvage only the rest: the
preferred direction is automatic conversion of found loot into currency, with
starting gear prepared at the forge and deeper custom starting kits unlocked
gradually. The forge becomes a main place for meaningful build choices as loot
handling becomes automatic.
No new feature, balance change, tutorial, asset or release is delivered by this
queue update. Backwards compatibility is not required.

## Next product work — owner feedback, not started

| Order | Work | Intended result | First checkpoint / acceptance |
|---|---|---|---|
| 1 | Automatic loot settlement; simplify Keep and Storehouse | Keep feels like a chore. Automatically convert found loot into the existing currency instead of recurring keep/storage decisions. Use that currency at the forge for starting gear; gradually unlock deeper custom starting kits with meaningful build tradeoffs. See the forge-depth brief below. Reassess whether Storehouse has a useful remaining role, and remove or merge it if it only supports the old loot workflow. | Inventory the current keep, cage, salvage, storage, forge and starting-kit paths. Write one economy contract covering found versus brought/equipped gear, consumables, currency values, forge access and optional kit choices. Routine runs require zero keep decisions and no mandatory Storehouse visit. No second salvage currency, silent equipment replacement, duplicate settlement or manual bookkeeping. Rust owns settlement; verify whole/sliced/reloaded and multi-hero outcomes. |
| 2 | A simpler banking model | Make currency progression understandable through one consistent rule for what is earned, secured and lost. Reduce competing bank/return/checkpoint percentages and overlapping destinations; explain the actual rule through the same totals shown in town and reports. | Compare the current model with a simpler proposal before tuning. Show worked first-run, retreat, death and offline examples with reconciled currency totals. Explicitly amend affected banking/exit contracts and gates if the model changes; do not layer another wallet or retention rule on top. |
| 3 | Stage early progression | Forge and Storehouse arriving after the first run feel too fast. Spread unlocks and choices across clear milestones; introduce a building when its purpose becomes useful in the revised economy. | Record earned first-session runs, unlock timing and simultaneous decisions across fixed seeds. Set numeric pacing/decision targets in the implementation cut. Reassess Storehouse after item1 rather than merely delaying an obsolete building. Preserve a useful first session and prompt access to autonomous play; add no artificial wait or new required chores. |
| 4 | Explain the cage and run endings | The owner does not understand “first: the cage,” and runs appear to end abruptly. Use clear encounter/objective names and show the actual reason the hero stopped, what was earned and what happens next. | Reproduce the exact “first: the cage” surface and identify whether it names a loot encounter, objective or enemy before changing it. Review how cage choices fit automatic loot conversion. Audit bank, retreat, death and clear endings in watched/offline runs. Every ending has a correct cause and a readable transition into its outcome; summaries do not invent actions or outcomes. No blocking confirmation for routine settlement. |
| 5 | Clickable heroes and town objects | Clicking a hero in the base opens that hero's details and relevant actions. Make useful town objects respond consistently, with visible feedback. | Start with one hero and one built building, then cover the town. Correct actor identity with multiple heroes; pointer/touch/keyboard access, accessible labels and useful feedback. Avoid accidental construction or purchases. Preserve camera gestures, readable targets and original art direction. |
| 6 | Building information | Add an `(i)` next to building names, such as Forge, that opens a short explanation or tooltip of the building's purpose, costs and available actions. | Cover every building that remains after the economy redesign, including relevant locked/unbuilt states. Information is available by click/tap and keyboard, not hover alone; support focus, Escape and dismissal. Keep help opt-in and contextual, with concise chrome and readable help text. No forced tutorial sequence. |
| 7 | Bloodline tabs and visible branching trees | Put Legacy and Class tree in tabs inside Bloodlines. Display parent/child branches as connected nodes, with prerequisites, learned nodes, availability and costs readable at a glance. | First show one bloodline with two working tabs and one class branch at phone/desktop sizes, then cover all classes and Legacy. Reuse delivered cumulative unlocks; keep learned parents and other branches. Preserve current bloodline identity across tabs and exact purchase/cancel/reset behavior. Existing branching data must be visible; any additional tree depth needs a separate content contract. |
| 8 | Large-desktop typography | Refine font sizes, hierarchy and spacing on large desktop screens. Avoid phone-scale text floating in oversized panels. | Capture town, Bloodlines/trees, forge, watch and report at1440/1920/2560px and compare with320/400px phone layouts. Set font/line-length/spacing targets from the audit; verify zoom, wrapping, contrast and keyboard focus. Post matched before/after screenshots. |
| 9 | Send → Delve | Rename the player-facing run action to **Delve** to tie it to Idlever. Update related visible instructions and accessible names consistently. | Audit town/hero controls, confirmations, reports, automation descriptions and player README. Use natural matching forms such as “Delve” and “delving.” Leave internal APIs alone unless a separate change requires them. Preserve manual/automatic behavior; post the revised action in a screenshot. |

### Forge and starting-kit depth — owner addition

The owner wants deeper forge/starting-gear customisation alongside automatic
loot conversion. Include this in the loot/economy design cut, rather than
reducing the forge to a linear stat-upgrade button.

- Introduce a useful default kit first, then unlock additional choices gradually.
  Keep basic delves available when the player cannot afford a custom kit.
- Explore weapon families, armour profiles and a small number of gear modifiers
  or specialisations. These are design candidates, not a committed list of new
  systems. Choices should change combat strengths, weaknesses and synergy with
  class skills/tactics; compare alternatives at similar currency budgets.
- Separate permanent forge capabilities from the cost of preparing a selected
  starting kit. Define both clearly in the single-currency economy contract;
  avoid more currencies, random reroll chores or repeated item maintenance.
- Let players save and reuse starting kits for their bloodlines/classes.
  Preview the gear, relevant effects and total cost before confirming changes.
  Reuse the confirmed kit automatically for later delves; customisation remains
  optional and does not require a shopping/confirmation step after every run.
- First checkpoint: two earned, affordable Fighter kits with different strengths
  at one actual progression wall. Show their costs, action traces and outcomes,
  including where each loses. Then extend meaningful choices across the other
  classes as their relevant forge options unlock. Retain a viable default.
- Verify selected-kit persistence, explicit kit changes, insufficient funds,
  automatic repeat delves and whole/sliced/reloaded multi-hero parity. Show the
  forge's mobile/desktop selection and comparison screens at checkpoints.

Start with a single scoped loot/economy design cut covering items1–4 and their
dependencies. Decide what happens to Storehouse before polishing its help or
vignettes. Then deliver coherent checkpoints, rather than changing all systems
at once. On resume, use appropriate numeric gates and targeted checks before
broader acceptance; do not weaken a gate to pass a redesign. Post screenshots
at meaningful UI checkpoints. Queueing does not change canonical game rules.

## Retained visual work — after the product priorities above

These earlier owner requests remain queued, in this order:

| Order | Work | Concrete first delivery | Acceptance |
|---|---|---|---|
| 1 | Dedicated class-skill icons | Give all30 cumulative skill nodes readable individual icons, beginning with the six Fighter nodes, then Rogue, Ranger, Caster and Gunner. Use the approved ink/wash palette and class motifs; integrate with the revised Bloodlines tabs and connected tree. | 30/30 stable skill IDs covered in manifest/UI mapping; primitive fallbacks; readable at24/32/48px on parchment and dark surfaces, including learned, available and locked states. Phone/desktop screenshots. No altered unlocks, costs or saved data. |
| 2 | Combat animations and FX | Audit existing FX and improve class action/impact distinctions. Begin with one Fighter fight, then cover all five classes and enemy reactions. | Genuine action/hit/miss/heal/status events and replay state; truthful passive attribution. Pause/seek/speed, multiple actors, reduced motion and full/low/off settings. Readable telegraphs, targets, HP and logs; private-GPU screenshots/clips, GL/Canvas fallback and measured frame cost. No gameplay/RNG changes for this visual pass. |

Write a scoped cut before execution. Earlier sections below are historical
context. Their old priority claims, retention proposals and Storehouse vignette
plans yield to these current owner additions. No implementation or deployment
is authorized by this queue-only update.

Owner requested more content and refinement work. This is the prospective queue; older NEXT_WORK entries are history. Cuts137–139 menu art/title/Credits removal and rooted grass wind are integrated, with menu81/81 and private GPU evidence. Two d34605e ratings are closed: diagnostic human-only75.2 each/all16-axis alpha1; A4h return was short8seconds. That pair cannot certify>=80, and does not rate new polish. Raw evidence remains immutable.

Priority now follows the actual blind observations. Cut141 fixes a reproduced zero-ETA sentinel bug falsely announcing an unslain King, and ration confirmation/pending-state ambiguity. Cut142 quiets repeated unsafe-rest bubbles while retaining all events; the original D28 plateau remains unreproduced and unresolved after bounded real-WASM diagnostics. Cut143 repairs hidden manual-pad CSS and reduces the automatic watch strip178px to84px at phone/desktop sizes, with unchanged manual keyboard/mouse/touch gates passing. Cut144 now folds full-editor package details once authored rules exist; about95% shorter diagnostic list, legal promotion/highlight/drag and unchanged editor gates pass. Cut145 audits saved King deaths and scopes no-gain wording to the last replay moments; a cadence-mechanic experiment changed actions without meaningful outcome gain and was reverted, with exact restored saves/reports. Cut146 now completes historical TRY prices from the same Rust measuring mirror, with snapshot invalidation and readable phone layout; six focused gates plus final geometry checks pass. Next resolve full native regression evidence and actual affordable King winning levers, then unattributed gains and return budgets. Content work below remains queued but cannot replace these observed issues or a fully completed independent rating. New final candidate requires appropriate complete mechanical acceptance and a fresh freeze. No deployment.

## Ready next

The first item now has a preparation contract in [CUT136_ENCOUNTER_CONTRAST.md](CUT136_ENCOUNTER_CONTRAST.md): six existing scenes, eighteen legal matched comparisons, then one biome's measured content change if the catalogue exposes a gap. No execution or implementation is claimed; fresh blind findings may reorder it.

| Order | Work | Concrete first delivery | Evidence before shipping |
|---|---|---|---|
| 1 | Biome encounter variety | Audit existing room generation and earned Fens/Crypt/Foundry fights; author two contrasting encounter compositions in each of three biomes, using existing enemies first. Each composition must reward a different existing package or positioning response. Start with one biome, then expand after its results. | Fixed-seed before/after replay catalogue; identify the actual tactical counter for each composition. Determinism, death-cause attribution, current idle/engagement bounds and whole/sliced/reloaded parity for one/three heroes. Targeted tuning first, required current-game gates afterward. No statistically unsupported claim of six balanced encounters. |
| 2 | Class and loot identity | Inventory all five public classes including the delivered Gunner. Compare two affordable, actually earned loadouts per class at a relevant wall. Improve unclear item/action presentation first; propose horizontal loot options only where the comparisons expose a real missing choice. | Ten reproducible loadout cases with cost, upkeep, actual action trace and outcomes; retain losing choices. No automatic grants in earned proofs, replacement of authored rules, or alteration of old drop RNG without an explicit migration contract. New items require icons, supply/forge integration, saved-run replay metadata and named death levers. |
| 3 | Lived-in home base | Add one small activity vignette at each of the four existing constructed buildings: smith work, storehouse hauling, kennel care and Savings business. Use actual hired-worker/building state to choose what appears; expand forest-edge/path dressing only where the current camera leaves gaps. | Same-state400/1440 day/night before/after screenshots, cold town plus earned settled town. Clearly label any diagnostic fixtures. Activities cosmetic, do not imply completed chores or grants; unbuilt plots remain manual. Keep approved ink/wash palette, lantern ownership, walk paths and touch targets readable. |
| 4 | Dungeon visual landmarks | Start with three distinct environmental landmark treatments for three existing biomes, derived from the approved art direction and their actual floor layouts. Make rooms distinguishable in a paused screenshot before adding more animation. | Matched real-replay screenshots at400/1440; characters, hazards and telegraphs remain legible. Primitive fallbacks, Canvas/GL behavior, asset provenance, no gameplay changes; warm GPU and cold-load costs measured separately. |

Inventory preparation: `gen.rs::layout_for` already varies room shapes/layouts, cave density/chambers/mere and connectivity (Cut109); `situations.rs::band_on/place_twist` already chooses band-specific situations; `descent.rs::boss_affix/guest_for` already draws heir-specific boss affixes and wandering champions (Cut116). Do not queue these delivered features again. Start encounter-composition work by exporting the existing generated/played situations and measuring which configurations they reward. Fens, Crypt and Foundry rosters are in `defs.rs::spawn_table`; routes can reorder bands, so eligibility must follow biome/route rather than assume fixed depth. New content must fit the existing placement/situation system rather than create an unrelated second generator. This is source inventory, not earned-play or balance certification.

## Refinement passes

1. **Remove routine gear-keeping work.** Owner feedback: “Gear keeping feels like busywork... Are items converted into some currency instead?” Existing Rust salvage already pays gold and advances each item's forge crafting progress; kept gear goes into storage. Investigate automatic retention of useful upgrades and salvage of the rest, with optional manual review instead of a recurring blocking sheet. Preserve distinct loadout choices and the player's equipped kit; storing an upgrade must not silently equip it. Do not add another salvage currency. Start from `keep_is_a_decision`, `auto_keep_plan` and the existing keeper worker so the refinement does not duplicate automation. Before implementation specify numeric interruption/decision gates, exact gold/forge reconciliation, storage-full behavior, protected/brought gear and whole/sliced/reloaded parity. Source-backed discovery contract [CUT140_KEEP_FLOW_DISCOVERY.md](CUT140_KEEP_FLOW_DISCOVERY.md) now specifies twelve cases across three exit tiers, interruption/settlement gates and keeper migration limits. This is queued owner feedback, not independent rater evidence or delivered behavior; implement after the frozen cohort.
2. **Combat and death readability.** Use fresh blind evidence to identify the first misunderstood enemy telegraph, tactic activation or death lever. Fix that concrete case through an existing icon/animation/detail surface. Preserve the exact rule/event attribution and historical replay; no additional persistent caption feed. Verify pause, speed changes, returning parties, multiple heroes and phone taps. Post the relevant fight/death screenshots, with a short description of the changed behavior.
3. **Menus and settings finish.** Owner additionally requested stronger main-menu art/FX. A finished isolated pass is on branch `polish/main-menu` (`CUT137_MENU_ATMOSPHERE.md`): approved existing title art, responsive layout, subtle motes/mist, effects and reduced-motion controls;81 menu checks/typecheck/copy lint/build pass. Integrated after both raters closed; no rating claim for this changed menu. Cut139 additionally delivers owner-requested Credits removal and generated transparent title lettering with semantic/fallback heading; updated81 menu checks and build pass. Remaining refinement: Audit the implemented first-visit menu, saved-load bypass and in-game return to menu at320/400/1440. Refine keyboard focus, touch targets and preference labels where the audit finds a problem. Exercise save replacement/cancellation, Escape, settings persistence and worker startup; cancelled replacement must preserve the exact save. Do not reintroduce a title interruption on subsequent loads or add time-of-day controls that silently override the requested wall clock.
4. **Lighting and visual consistency.** Owner-requested grass wind is implemented on isolated `polish/main-menu` (`CUT138_HOME_GRASS_WIND.md`): rooted gust-driven tufts, full/low/off/reduced-motion support, GL/Canvas cache and exact-save checks plus clock36/save39/typecheck/copy/build pass. GPU gate now PASS400/1440 private D3D12,24 walkers,100%display rAF,p95 0.6ms; integrated. Remaining pass: Compare the same home state at dawn, noon, dusk and night. Check character lantern bobs/fades, warm windows versus neutral personal lights, overlapping pools, unlit ghost workers and camera-edge characters. Use the approved original palette; refine excessive pools or lost silhouettes only from screenshot evidence. Verify actual local-clock transitions and visibility resume, with no terrain repaint or game-save changes.
5. **Cold town rendering cost.** Current terrain proof measured initial bitmap paints around120–140ms separately from warm frames. Profile image decode, bitmap paint and GPU upload before optimizing the largest measured part. Reuse the existing shared GL/Canvas bitmap and asset-settlement publication; target at least25% improvement in median initial-paint time across five matched cold launches, without weakening current image quality, cache, context recovery or warm-frame gates. Report absolute timings and hardware; retain the baseline and failures.
6. **Existing progression finish.** Inspect earned class training, Legacy choices, companion use and post-clear returns before proposing more systems. Repair any real dead end, hidden reward or unaffordable advertised action. Worker ranks and late economy deviations already recorded in acceptance need measured saved-camp/choice checks before changing prices or timing. No inference of whole-game balance from a handful of diagnostic builds.

## Later content, after played evidence

- One additional elite or boss modifier, only in unlocked ascension tiers. Start with one readable counter and one corresponding loot/preparation choice; keep tier0 behavior intact. Existing ascensions, Legacy tree, Sentinel/Hexbinder styles, Leeching and Gunner are delivered and must not be queued again as missing features. Follow `ENDGAME_ASCENSIONS.md` for deterministic modifiers, cause/trace, replay snapshots, save/load and equal-work overhead.
- A single scoped optional early-reset proposal if the earned progression audit still demonstrates a stalled long-term loop. Specify what persists, what resets and why the player would choose it before implementation. Expedition/era/dynasty layers remain deferred; do not introduce all three together or advertise them as current content.

## Delivery checkpoints

Before each implementation, write a numbered cut with numeric gates and record the baseline candidate/save/seed. Finish one coherent change, run the cheapest relevant checks, then the required broader checks. Do not weaken gates to admit added content. For visual work post paired app screenshots here at each meaningful checkpoint; phone first, then desktop and any useful day/night comparison. Separate earned screenshots from fixtures and cosmetic time overrides.

All gameplay truth remains in Rust; TS only renders/edits. Preserve autonomous play, absence safety, uncapped offline after scout, named workers, manual construction and checkpoint carry semantics. Commit and push completed reviewable checkpoints under the owner's standing authorization; do not deploy. Fresh independent raters receive only their frozen brief and never this queue, design history or the desired score.
