# R5 lived-in Home: dated read-only audit

Observed2026-10-16, source review only. Context: current development WASMe62c;
Cut247/248 native batch-equivalence work is separate and must settle before new
runtime/pacing claims. Sources: current HANDOFF, QUEUE_ACCEPTANCE R5/item14,
WORK_QUEUE base-life brief, CUT228; render/town.ts, engine/types.ts,
core tree.rs/town.rs. No browser, simulation, compile, production edit or new
visual acceptance was performed. This is an implementation proposal, not player
feedback. Current owner preference is sparse Home with actual building sprites
as primary controls; do not add persistent task cards or action icons.

## What is actually delivered

- `townState` reads actual built Forge/Pets/Savings, available Guild/pool/device,
  resident phase, hired/lit/paused/ranked workers and the real recent Forge read
  model. Away residents are excluded; roster IDs keep bench/device spots stable.
- Forge alone has a present-work reason: `forge_work` drives smith strokes,
  bounded sparks and the correct available resident's fitting visit. CUT228's
  historical31checks/day-night/reduced/save and32matched bot jobs are scoped
  prior-package evidence, not freshly measured e62c/247/248 acceptance.
- Other workers have fixed posts, desynchronised two-frame idle art and a one-off
  tent→post arrival when newly hired on the current mount. These are existing
  movement, not authoritative current chores. `paused` currently dims the sprite
  but does not suppress its idle-work frame alternation: do not interpret that
  as a truthful transaction/action indicator.
- Existing recovery/bench/device poses, returning parties, selected-pet followers,
  penned pets, ambient child/carter/merchant, construction and window/lantern
  lighting provide activity. They do not prove every resident has a meaningful
  work/training/preparation reason. Random walkers are not the remaining fix.
- Native `ReturnReport.workers` is absence aggregate (count/items/spent/gold),
  not present activity with a timestamp. `Town.workers` gives ownership/post/
  paused/rank; it cannot authorize a timed deposit, send or training vignette.

## Concrete missing routines and safe visual treatments

| Actor/place | Native truth available | Smallest meaningful treatment | Exact gap before claiming an action |
|---|---|---|---|
| Scout/Guild→mouth | Hired/paused worker; actual resident ready/away transition; native auto-send and run IDs | Existing spyglass pose while on duty; briefly escort the **actually departing** resident to mouth on an observed send transition, then return to Guild | No recent-send event identity in current town model. Ownership alone must not play repeated sends. An arrival already away must not recreate a departure or draw a duplicate resident |
| Apprentice/Forge | Existing forge_work identifies paying resident/step/remaining time; worker hire/order/paused state | Apprentice checks the existing anvil/bar during the same real Forge interval; smith remains striker; home fitted resident can inspect | Forge work may be manual or a commission. Do not label it Apprentice purchase unless native origin proves that. Suppress automatic-work gesture when paused/orderoff; no duplicate smith/hammer/extra sparks needed |
| Clerk/Savings | Built bank; current amount/capacity/interest; worker hire/paused; signed native deposit ledger/report | Existing clerk ledger/quill lean at bank after a **confirmed** actual deposit; resting ledger pose otherwise. Interest may produce a distinct inspection, never a deposit claim | Bank balance difference can be interest or withdrawal, not proof of a clerk deposit. Need actual receipt identity/owner/tick/origin and recent-work window; reading Savings cannot earn or replay interest |
| Kennel-hand/Pets | Built kennel; actual penned/party pets; worker hire/paused and native field action | Existing bucket/hound pose directed at an actually penned pet; brief escort for a confirmed field/return selection | Do not show feeding as paid growth/healing or duplicate an away pet. Need actual field identity for action; native party selection proves disposition, not continuous work |
| Kennel keeper/Pets | Current active order/breeding/sorting results exist in native worker reports | Station at existing pen; inspect the actual resulting pet once on a confirmed sort/breed event | Separate keeper/hand roles. No invented pup/growth/periodic rewards. Confirm current asset ID/fallback before implementation; historical asset list is not current coverage |
| Drillmaster/House | Hired/paused; actual native level/stance spend and per-resident phase | Existing dummy/practice sword; actual available resident performs a short drill following a confirmed level allocation | Never imply passive XP or drill an away/recovering resident. Aggregate floor-clear feat is not a current training timestamp |
| Quartermaster/preparation crate | Given worker; actual prepared supplies/starting configuration | Existing backpack/bedroll pose, brief check of real prepared kit when current preparation changes | No new purchases/restock from rendering; distinguish free permanent selection from real paid supplies |
| Herald/board; Guide/mouth | Actual quest swap/ascension and actual chosen start/order; paused state | Scroll/bell inspection after confirmed quest swap; guide checks existing lantern/waystone after real start change | No quest payout on bell, no imaginary deeper start. Current unlock/ownership alone is insufficient for a recent result |
| Porter/mouth | Actual Gold chest/auto-collection/receipts; hired/paused | Existing sack/cart only for a confirmed current Gold collection if this remains in current native behavior | **No Storehouse destination, item sorting, keeper/armourer revival or physical loot haul.** Historical art/docs contain those retired IDs; do not reactivate them |

Assets already available: `town_worker_scout[_1]` (spyglass), apprentice (anvil),
clerk (ledger/quill), drillmaster (dummy), kennel_hand (hound/bucket), herald
(scroll/bell), guide (lantern), quartermaster (pack); town_board, town_crate,
town_bank_1..3, town_kennel_1..3, bench/pool/device and class walkers. Primitive
worker fallbacks already exist in town.ts. Historical `art/town-ids.md` includes
retired Storehouse/keeper/armourer: an asset's presence is not gameplay authority.
No missing bitmap is established by this audit.

## Small shared mechanism

Keep `townState` as the semantic boundary. Extend the existing Forge-style
read-only native projection only where necessary, after247/248 stabilize:
`activity { id, kind, worker, resident?, object?, origin, left_s }`, where native
actual receipts/actions supply stable identity, attribution and per-owner age.
No saved animation timer, no new simulation action, no guessed Gold-delta event.
A generic scene `Routine` consumes that read model: post→target route along
existing `legsAlong/route/walkerAt`, one bounded service pose, return to post;
resident participation requires current native home/ready eligibility. One
active routine per worker/resident; actual actor identity/position also feeds
DOM hit bounds. Reuse the existing sprite/primitive draw path for GL and Canvas.
Separate on-duty ambient inspection (no claimed result) from confirmed work.

Do not replay a backlog on mount/resume: a current unexpired native activity may
show its remaining pose once; old aggregate absence acts remain report history.
Deduplicate by native identity across refresh and preserve owner attribution when
selected resident changes. On pause/off/expiry/disposal, clear transient routes,
lights and particles. Recovering/reincarnating residents retain their existing
recovery poses. No camera/terrain rebuild is needed for an activity phase change.

Reduced motion: stationary truthful service pose, no travel/bob/particles; effects
Off similarly removes transient particles/lights while preserving actor/location/
optional reason. Low reuses the same routine with fewer cosmetic particles;
full/low/off cannot change phases, currency, clock or API choices. Optional detail
on existing sprite hover/focus/longpress can name the actual reason without new
persistent chrome. Missing art uses role primitive + tool; no action relies on FX.

## Proposed complete verification contract (not measured here)

1. Enumerate every currently native worker ID and built/service facility;100%
   covered by either an earned action routine or an explicitly honest idle/no-
   current-action disposition. No broad R5 pass from Forge+Scout alone.
2. Per event type: real public action or earned elapsed transition, actual native
   receipt/owner/id recorded; repeated100reads cause0restarts,0new acts and0save
   changes. Manual/automatic, hired/off/unhired, insufficient/absent and expired
   cases each suppress false work. Owner-switch and two simultaneously active
   residents preserve identity;0away heroes rendered in town.
3. Earned settled three-resident Session at400/1440 × day/night × GL/Canvas,
   plus320normal/200% interaction bounds. All active sprite targets≥44px,0wrong
   owner openings,0inaccessible targets. Capture start/mid/end or bounded clips
   for every actual routine; record occlusion and actor overlaps, not source-only
   claims. Inspect night tools/actors and current lanterns without adding clutter.
4. Full/Low/Off/reduced each preserve exact save and native report; read-only
   presentation legs cause0terrain repaints. Reload/visibility resume changes0
   receipts and creates0old-event replays; mount/selection/pause/dispose clear
   all transient stale actors/lights. Test primitive fallback and context loss.
5. A renderer-only implementation proves matched native outputs unchanged; any
   new native projection requires native serialization/read-purity tests plus
   exact matched IDLE/PICKED16×14 outputs on one source pair. Existing routine,
   pacing and package gates remain independently required after native changes.
6. Measure frame cost only with native/browser competition absent, matched
   settled state, source/package/control identity and predeclared budget. No
   numeric performance pass is proposed from this static audit.

Revalidate after247/248 package replacement, changed activity wire/lifetimes,
worker retirement/orders, resident lifecycle/ownership, scene paths/hit geometry,
assets, clock/visibility, reduced-motion or lighting composition. A fresh dated
visual observation must identify source/package/earned state/layout/backend and
separate reviewer judgment from actual player feedback. Current R5 remains OPEN.
