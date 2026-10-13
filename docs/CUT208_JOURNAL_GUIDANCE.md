# Cut208 — a useful Journal and readable discoveries

Owner asks for an MMO-style journal and guidance for locked Tactics/Orders/Heirs,
and asks what “first: the cage” means. Replace ambiguous milestone chrome with
factual objectives and context. The full queue remains in scope; this cut does
not deliver persistent heroes or tune unlock timing without measured baselines.

## Contract

1. Rust owns Journal progress, completion, prerequisites, priority and actual
   reward/effect descriptions. TS renders them and routes to existing actions.
   Journal reads do not mutate resources, saves, RNG or unlocks. No claim chore.
2. A new town has one recommended next action, beginning with manual House,
   then a manual delve, then genuinely earned Scout automation. Show actual
   manual-delve count/requirements and worker cost; never promise automation
   before hire or grant free workers. Optional build/class/pet paths stay optional.
3. Keep at most one recommended step visible at once. Group the rest into
   expandable Town/Builds/Delving chapters, with completed and later entries
   distinguished. State why a current objective matters, its actual progress,
   and what completing it changes. Do not present a discovery as an unfinished task.
4. Integrate the existing real quest card into the Journal with readable reward
   meaning, progress and completion. Preserve its real swap/award timing and
   automatic settlement; no new XP/Gold economy or daily-claim system.
5. Show genuine next requirements for Tactics/Orders/Bloodlines/Class/Forge/
   Kennel using existing core thresholds/ages. Explain free reusable Loadouts,
   permanent Forge upgrades, actual alive/death Gold rules, and leash/tame access.
   Avoid future promises for unimplemented Guild/Reincarnation/Engineer systems.
6. Owner superseded the cage-copy work with removal in Cut210. Do not expose
   a loot-choice task, timer or preference control in the Journal. Automatic
   cache finds remain ordinary discoveries; historical evidence is unchanged.
7. Cover fresh/ready/locked, failed and successful real actions, away/refusal,
   selected bloodline changes, earned seed1/13 progression and real quest
   completion. Whole/sliced/save-reloaded catch-up yields the same Journal truth.
   No new RNG draw or gameplay/cost change; compare saves before/after reads.
8. Fresh real-WASM phone320/400/desktop1440, normal/200% text: zero horizontal
   overflow,44px controls, focus/reading position retained, no stale actions across
   bloodlines and no accidental purchases. Post settled Journal screenshots.

## Ownership

Core lane: new journal module, wire/types, core discovery copy and focused tests.
Client lane: new ui/journal.ts + journal.css, consuming agreed wire only; no
camp/frame/watch glue edits. Root owns entry-point/glue, Cage presentation,
integrated checks, handoff/ledger and final package/commits. A separate renderer
lane may work on factual combat FX without editing Journal/core/glue sources.
