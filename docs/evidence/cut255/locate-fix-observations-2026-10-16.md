# Cross-owner Locate on the remounted camp — 2026-10-16

Dated engineering observations from resuming the parked Cut255 work. Headless
Chromium (private display), real `ef4b58d7…` WASM served from a fresh Vite test
server, genuine mature three-resident session (Bloodline 1 Vale Ash L10, 2 Bryn
Thorn, 3 Corin Flint; gold 48036). Not Safari, not owner/player feedback, not a
fun or GPU claim.

## What was wrong (two defects, both reproduced)

1. **The locate action wrote into a disposed scene.** `heroRoster`'s focus hook in
   camp is a closure over that camp's `town`; `App.selectBloodline` always calls
   `go({ kind: "camp" })` on a successful selection, which disposes that camp and
   mounts a new one. Cross-owner Locate therefore appended the `town-hero-focus`
   ring to the *old* town element. Probe (`locate-probe-1`, `locate-probe-6`
   after the fix), desktop 1440×900 normal:
   - before: `ring {connected: false, inDoc: false, inOld: true}`, trace empty,
     `oldTownConnected false` — no ring the player can see;
   - same-owner control: no remount (`probe.go` empty), ring in the live town.
2. **The scene clock could go negative on the first drawn frame after a mount.**
   `start()` seeds `last = performance.now()`, but the first rAF callback arrives
   with an earlier frame timestamp, so `dt = (now - last)/1000 < 0` and the scene
   time `t` fell below 0 (`-0.0283` measured). `walkerAt` returns null while
   `t < hero.from` (0 with no party), so `focusHero()` returned early and created
   no ring at all. This is why the earlier RAF/event-only candidate (reverted at
   parking, `unvalidated-locate-raf.patch`) still failed: it delivered the event
   correctly — the new camp's handler ran with `hero: true, legs: 26` — but
   `focusHero` could not place the ring at `t < 0`.

## Fix

- `web/src/render/town.ts`: `const dt = Math.max(0, Math.min(0.1, (now - last) / 1000))`
  — the scene clock never runs backwards when the loop (re)starts.
- `web/src/ui/camp.ts`: the compact roster's `focus` hook dispatches
  `idlever:focus-hero` on the next frame instead of touching the captured scene;
  the camp that is standing answers that event (`focusHome`), so whichever town is
  mounted locates. This is the mechanism `heroRoster` already used for rosters
  with no hook (desktop frame) and the watch screen listens for.

## Evidence

- `locate-probe-1`/`-6` (mechanism, before/after), `locate-probe-3`/`-4`/`-5`
  (event fires on the live camp; retry ladder; temporary renderer log).
- `cross-owner-locate-2` — the parked bounded proof, now **PASS** at normal and
  200%: ring `connected: true, currentTown: true, selected: 2, 52×52`, selection
  accepted, Gold 48036 unchanged, every other owner's complete game/Session field
  exact, served bytes `ef4b…`, no page errors. (`cross-owner-locate-1` remains the
  original failure at this same source epoch.)
- `attempt-4`/`attempt-5` — the four-case Home matrix: desktop normal/200% pass
  end-to-end (owners, Hub progress, Legacy, locate, send/away watch, live step).

## Related finding — nested sheets on the mobile Menu

`menu-route-probe-1` (402×681): Menu open → Tasks expanded → a task entry routes to
the Journal, which the sheet system stacks *over* the Menu (the Menu goes
`hidden`+`under`, the Journal carries a `‹` back). One Escape returns to the Menu
(focus back on the task entry), a second clears to the Home control
(`.gear stud`, connected, inside `.camp`). This is the platform's existing
sheet/Escape behavior, which CUT255 §3 asks the menu to keep; the Menu's own
Journal/Settings chips instead close the menu first (`home-menu.ts`) and so clear
in one. The parked harness's `close()` assumed one Escape always clears the stack;
it now unwinds up to four and the mobile task-entry step records
`backButtons`/`taskClosePresses`, so the nesting is measured rather than papered
over. No sheet ever shows two visible panels at once.

## Limits and shelf life

Local Chromium geometry and timing, one fixture, engineering observation only.
Expires when the roster, camp mount/dispose routing, sheet stack, locate ring or
these probes change; revalidate rather than carrying the pass forward.
