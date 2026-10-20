# Real replay UI observations — 2026-10-21

Automated measurements and agent visual review; no player/owner feedback or blind
fun rating collected. Build label in frames is2026-10-20, capture timestamps are
UTC in the result files (local review2026-10-21). Git/source/WASM/input identities
are pinned in identity.json and the producer receipts.

Input:14 original earned Cut293 runs from one original camp (not independent
cohorts). Phone402×681 browser-content approximation and desktop1440×900 CSSpx,
text scale1, device scale1.5, reduced motion, automated pointer clicks. Actual
private-Xvfb GPU driver D3D12/NVIDIA RTX3080. Not real Safari/device acceptance or
a frame-time benchmark. Screenshots show visible viewport, not full-page scans.

Actual route: Heroes/Details→Run log→#133 Replay→floor chip. Before history the
other legal weapon is selected publicly at0 Gold/marks/time; actual viewer input
and kind remain the recorded weapon. Actual WASM responses match native replays
and canonical post-choice saves stay byte-exact after navigation on56/56 flows.
The screenshot position uses an explicitly diagnostic render-only seek/pause at
the native event+2. It does not demonstrate an available player pause/scrub control.
The UI snapshot/events were observed unchanged, not injected into a test viewer.

Findings/corrections: parent Hero Details disposal invalidated child scopes, so
Run log appeared but Replay never reached the engine. Appearance shared that
scope. Both now resolve the owner before parent disposal and use child lifetime/
actor/engine guards. Two failed pilots, debug DOM/image and subsequent passing
pilot remain. The final matrix resumes ten same-product/input passes from the
first matrix; the reconstructed parent harness exactly matches its captured SHA.

Retention: original short Caster absence saves contain the run entry but no
serialized ordinary completed capsule. UI correctly offers no Replay (two actual
UI checks). The original blanket56saved-source availability claim is false.
Attempting the watched-end save also cannot restore a capsule never serialized;
failed recovery preparation retained. Final viewing matrix uses48restored-source
flows and8flows that complete the same original in-flight Caster departure via
public catch-up, no new send/seed/injected history. These completions exactly
match native reports/replays; no retention policy was changed.

Visual review: inspected fixed pilot desktop Fighter sword; final phone Caster
bow authored GL and Gunner pistol Canvas; desktop Fighter Crownsplitter authored
GL and Caster dagger authored Canvas. The real replay modal and actual selected
floor are present; header/close/back/floor controls surround the real scene. The
recorded pose persists despite next-kit changes. In phone captures scrolling the
canvas into view can move the textual replay heading above the visible region;
floor chips may be partly below the viewport. Canvas map framing keeps weapon
and spell detail small. Shared cape colours, overlapping actors and flashes also
limit interpretation. Confidence high in routing/identity and medium in visual
weapon/action recognition; no proof of player comprehension or overall R4/fun.

The UI currently has floor jumps and automatic16× replay, with no normal pause/
scrub control; the diagnostic pause must not be described as user interaction.
Caster's spell-only policy still provides no measured weapon-value distinction.
Revalidate after UI/controller/renderer, replay-retention, rules, saved build or
player context changes. Historical failed/superseded receipts remain labelled.
