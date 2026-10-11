# Cut 130 — game menus

Owner request: full game menu system, including main menu/settings, with later
loads entering the game directly. Existing saves skip the title; a fresh browser
shows New game, Settings and Credits before any game engine is booted. In-game
Settings exposes Main menu; Continue returns to the existing mounted session.
New game from an existing session requires explicit Replace save confirmation.

Settings uses shared sound, effects, slowdowns and auto-continue controls before
and during play. Existing save/rules import/export, debug and worker controls stay
in the in-game settings. Settings menus do not auto-dismiss. No new game truth.

Acceptance:

- Cold boot shows title, no generated save/engine until New game. Reload of the
  saved game skips title and retains state; saved absence catch-up still runs.
- Main menu / Continue preserves session and selected screen. Settings never
  create/reset a town. Cancel starting over preserves the save byte-for-byte.
- Starting over requires a second explicit confirmation; only then reset.
- Keyboard navigation/focus stays in menu, Escape returns from submenus/Continue;
  no focus leak into inert game. Every action at least 44px tall, no horizontal
  overflow at 320/400/1440. Existing game settings selectors remain supported.
- Explicit development fixture URLs retain direct game boot. Menu checks force
  title with `?menu=1`; ordinary bare dev and production cold boots show title.
- TypeScript/copy lint, scoped real-WASM menu/save checks and existing settings
  regression checks pass; honest phone/desktop screenshots posted at review.
- Source isolation until previous acceptance terminal; no deployment.

Validation checkpoint: real-WASM menu flow81 checks PASS at320/400/1440;
TypeScript/copy lint2354 literals zero violations and production build PASS.
Private-display GPU captures400×800 and1440×900 use D3D12 NVIDIA RTX3080;
page errors empty, post-start engine `wasm`. Evidence preserved in
`scratchpad/qa-cut130-menu/` (menu-test.log, build.log, capture.json, screenshots).
These are focused checks; the earlier156/156 suite predates these application
changes. Complete combined terrain/menu client acceptance remains required.
Confirmed restart uses a one-shot session marker and a clean App/worker boot;
old-page exit saves complete before the receiving page clears the old town.
