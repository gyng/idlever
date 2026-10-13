# Cut209 — factual combat cues

## Audit

GL Juice already shows landed melee slashes, miss dust, damage/heal numbers,
projectile trails, body squash/knockback and boss beats. It ignores Rule.skill;
Canvas fallback shows the replay/sprites without equivalent event FX. Several
existing GL pop/number/light lifetimes use wall time, while squash uses replay
ticks. Seek clears floor stains/shots but does not clear every old transient.

## Scoped contract before implementation

1. Five distinct source-policy marks use only immutable executing Rule.skill IDs
   for Fighter/Rogue/Ranger/Caster/Gunner. Do not infer a node from verbs, current
   edited rules or passive bonuses. Source marks show a policy firing, not target,
   status success, healing amount or landed damage.
2. Actual Attack.dst/hit/dmg distinguishes landed (`hit && dmg>0`), blocked
   (`hit && dmg===0`) and miss. Real positive moment-heal/recover amounts mark the
   actual recipient; zero amounts and ambient rest/regen produce0 new cues.
   Missing/dead target entities do not invent replacement actor positions.
3. Shared GL/Canvas cue lifetime is6 replay ticks. Pause freezes cursor effects;
   seek/skip/load clear old cues rather than replay old bursts. Validate speeds
   0/1/4/8, multiple actor IDs and changed camera positions.
4. Full caps8 active cues/128 matte pixel quads; Low/reduced caps4 static cues;
   Off adds0. Add0 particle sprays, bloom lights, shake or hit-stop. Maintain
   primitive artwork fallback and accurate target IDs.
5. Clear old Juice transient bursts on seek/skip/load. Address wall-time pause
   expiry for existing effects; record explicitly if a wider legacy speed/timing
   conversion remains outside this checkpoint. Never call remaining gaps done.
6. Record a warmed private-GPU baseline from both actual Cut203 earned kits at
   the sameD7 wall before runtime edits, then compare scoped frame costs on the
   same bounded journeys. Target incremental CPU p95≤1ms, no more than1 active
   extra draw call; record GPU timer availability and shared-load limits.
7. Use clearly labelled controlled class-action fixtures for missing mechanics;
   they are renderer correctness evidence, not earned balance/fun. Inspect
   hit/blocked/miss/heal/class marks at400/1440 and GL/Canvas/settings. Keep art
   quiet enough for the existing sprites, numbers and telegraphs to dominate.

## Checkpoint result

Implemented a shared, matte pixel cue layer in GL, context-loss Canvas, and the
pure Canvas viewer. Five class-family marks show the source policy firing.
Landed slash, blocked shield, miss cross, and green heal cross follow the actual
recipient ID. Bodies come from the renderer's drawn positions, including GL
crowd offsets and squash; remembered/missing bodies receive no invented cue.
The live interface separately shows the exact skill name and insignia (Cut205).
These world marks identify a class family, not30 individual skill animations.

New cue lifetime is exactly6 replay ticks, with8 stored cues/128 quads maximum;
Low and reduced motion draw at most4 static marks/64 quads. Off clears the
layer. No new particles, bloom, shake or hit-stop were added. Landed legacy
melee slashes now require positive damage, so blocks do not look like cuts.
Seek, skip and load clear both new cues and old Juice transients. Dynamic
reduced-motion changes are read through one cached media query.

`node web/tests/combat-cues.mjs` passes43 deterministic model checks: five
unique source glyphs, three distinct damage outcomes, actual target placement,
missing IDs, zero/ambient healing exclusions, moving body coordinates, caps,
expiry, clear and pause-equivalent repeated rendering. This test needs no
browser or engine simulation.

Fresh no-HMR :5213 renderer checks use a real-WASM app boot, then clearly
controlled renderer snapshots/events. One private-GPU browser tests GL400 and
Canvas1440: pause, Full/Low/Off, dynamic reduced motion, speed1/4/8, seek/skip/load
and five class families with an unknown target kind exercising the primitive
fallback. This is correctness evidence, not earned class progression or fun.
The recorded pause held51 quads; Low/reduced drew40 and Off0. See
`docs/evidence/cut209/controls.json` and the matched labelled screenshots.

## Measured cost and limits

Before edits, both genuinely earned Cut203 kits were imported at the sameD7
home wall, sent through the real WASM, and stepped1000 ticks. The bounded
measurement samples the first actual D1 attack in each resulting tape; it does
not claim a D7 fight. Each leg uses150 cursor-changing frames after warmup.
Post tapes are byte-equivalent to the baseline. CPU p95: Steady1.9→1.3ms,
Heavy1.5→1.0ms; GPU p95:3.577→2.789ms and3.364→0.390ms. These are scoped
samples, not a general performance improvement claim. Targets die on the first
hit, and no source skill metadata fires in these windows: new cue quads are0.
Consequently these journeys cannot certify the active cue layer's cost.

A separate controlled before/active/after sample measures the actual new layer
with legacy Juice disabled by the existing `fx=low` quality setting. Same
paused scene,120 frames per leg,8 active cues/81 matte quads: CPU p95
0.8/1.0/0.8ms; draw calls8/9/8. The measured incremental0.2ms and one draw
call meet this scoped contract. It excludes first paint, screenshot overhead,
real encounter balance and a quiet-FPS certification. Existing environmental
animation continues independently of replay pause. Timing harnesses, raw
samples and exact source/package/save hashes are archived in the evidence.

Legacy Juice now uses a presentation clock that stops on pause and clears its
transients when scrubbing. Its motion simulation still caps speed scaling at
2.5×, and old caption/environment timing is not migrated to the replay cursor.
This checkpoint therefore certifies the new six-tick cue layer's cursor timing,
not a full conversion of every historical effect at8×. Canvas receives the new
shared marks; legacy GL particle/number effects were not ported to Canvas.

Runtime source is frozen. Current proof precedes the Cut210 automatic-cache
core/package rebuild; root must run the integrated focused checks with that
final package. Broader combat-animation variety and actual build-fun acceptance
remain separate work, rather than being closed by these controlled fixtures.

## Final Cut210 integration

The fresh-suite targeted `combat-cues ctxloss` run passes2/2 groups on final
WASM6442546 bytes (SHA-256802c54f2f1a3b7142386b0620a86753046b4845be26110bad25f479172ed4fe1).
Separate `final-integration/` evidence preserves this package identity and
terminal log; earlier baseline/performance files are unchanged. The existing
context-loss journey tests clock continuation, Canvas map pixels, GL restore,
run completion and town recovery. It does not individually assert the new
class mark's pixels during context loss; direct GL/Canvas cue checks above
cover the shared layer independently. No runtime fixes were required.
