# Next chrome checkpoint — source audit only

Queue16/17/18 remain open. This inventory did not measure desktop pixels or
change runtime. Current normal/200% home/menu scaling already has scoped proof;
that does not establish optimal use of1440/1920/2560 desktop space.

`ui/frame.ts::renderBar` renders persistent identity/ordinal, temperament,
Gold/Legacy resource captions, marks/rank/best depth and settings. Best must
retain that distinction from live depth. The header still names the changing
incarnation ordinal; the stable hero name now exists elsewhere. A useful compact
header would prioritise actual hero name/state, Gold and Legacy, then place
secondary rank/marks in a details popover with accessible names and44px actions.
This should follow the persistent identity UI, not substitute unexplained icons.
First-time captions now reserve normal flow in cut29.css; preserve that fix.

`ui/frame.ts::renderConsole` intentionally fills unused slots with empty tiles
unless compact; stable:true also keeps gaps when entry visibility changes.
`camp.ts` uses stable:true, and watch.ts uses compact:true but still renders a
full footer with portrait, two tiles, gem and scrub. The CSS material shell in
styles.css(.console/.console-row/.well-slot) and chrome.css reserves that footer
space. The next candidate should keep town's current shortcut destinations,
move them into a content-width desktop dock, and reserve only measured dock
height. Phone and200% may continue wrapping; do not shrink targets to fit.

Watch's closed controls are already limited to Speed, Town and Pause, while
Speed opens watch-options with speed modes, skip, meter and Return. The control
panel is a separate manual-mode controller. A floating watch dock can reuse
these actual controls and handlers; closed/open semantics must identify mode,
focus must return on dismissal, and pause/seek/hand commands must remain exact.
Place the dock against an actual scene safe area, avoiding the new side depth
map, HP, hero and factual combat log. Keep Replay scrub accessible; do not hide
its state or accidentally change engine stepping while rearranging DOM.

Queue13 is a real paid recurring tap today. `ui/feats.ts::wishChip` first shows
“a song · +2”, then `twoTap` asks `ok $price`; its tooltip explains Legacy.
After grant it plays the generic unlock cue and says only “wish granted”.
`feats.rs::WISHES/wish/grant_wish` chooses one deterministic label, charges
unit(l)/2 Gold, awards2 Legacy (map3), and schedules the next wish one day later.
There is no corresponding song selection, build rule, music change or care need.
This explains the owner's confusion; an actual clicked-song reproduction and
ledger check still need proof. Recommended next contract: remove the recurring
wish purchase surface and decide in Rust whether to retire its small reward or
make an equivalent optional discovery reward. Do not automatically spend Gold
or invent pet/rest effects from wish labels. Balance/persistence migration must
be measured separately; no reward retirement has been implemented here.

Smallest coherent implementation cut: matched baseline/candidate home and
watch at400/1440/1920/2560, normal/200%; compact header + content-width town
dock + floating watch dock. Numeric gates: all actions44px, no viewport
horizontal overflow, no overlap with factual HUD/map/log, keyboard dismissal
and focus restoration, unchanged actual pause/speed/Return/seek outcomes,
measured usable scene-height gain at desktop, readable long names/large values.
Song removal is a related core contract, not a CSS change. Existing caller/slot
ordering, tutorials and busywork removals need retained regression assertions.
