# Cut192 — home building interaction

Scope: owner queue6 and the building portion of queue5. Existing five buildings
(House, Forge, Storehouse, Kennel, Bank) retain current rules. Later economy cuts
must revise purpose text if they remove or repurpose a building.

Acceptance:

- Every visible built building and the current unbuilt/locked plot has rich
  hover/focus help and a separate named `(i)` button with44px minimum height.
- Info activation spends zero gold and calls construction zero times, including
  a ready house; Escape dismisses shared tooltip. Primary Build stays separate.
- Purpose, built/ready/locked state, actual level and actual Rust requirement are
  inspectable without inventing a build price. Current construction is free.
- Mouse hover, focus-visible and pressed feedback use existing ink/gold palette.
  Locked plots remain inspectable; help never looks like a purchase action.
- At400/1440px, info targets and tooltip stay within viewport. Real-WASM boot,
  construction and hero panel are verified. No fake engine balance claims.
- Current hero tent already opens the selected hero; moving sprite targeting is
  a follow-up until a live walker anchor can preserve selected actor identity.

Owner tutorial amendment permits contextual help. This cut keeps existing10-word
per-tooltip-line budgets and adds no new economy or tutorial gate.

Results: focused real-WASM `home-building-help` and `town-save` pass2/2
in13.9s; existing39 construction persistence checks remain green. Private GPU
check passes1/1 in21.3s. Screenshot coverage400/1440px includes empty ready
house and controlled all-building town/Forge help. See
`docs/evidence/cut192/client-final.log`, `gpu-client.log` and `screenshots/`.
TSC, scoped Oxlint and copy-lint pass (88 files,2436 tagged literals).

Built-state coverage: House/Forge/Storehouse/Kennel/Bank5/5. Ready-house help,
locked-Forge help, mouse hover on each building, Enter activation, Escape,
zero construction/gold side effects and selected hero tent details are tested.
All-building fixtures pass through the real Rust worker load API; they are
controlled UI fixtures, not evidence of earned pacing. Other locked/ready
building transitions use the same dynamic path but are not individually played
through yet. Exact WASM binary hash is recorded; these checks use the packaged
pre-Cut191 economy and must rerun after rebuilding subsequent Rust changes.

The locked first-home Forge plot is now visible: old scene logic excluded the
house from stage count and hid the locked next plot until its trigger. Primary
Build remains separate from the `(i)` action. Current named info controls add
one help action per visible building/plot; this explicitly requested coverage
supersedes the old fresh-camp four-surface presentation target in this scope.
No other density/gameplay/balance gate is claimed or weakened.

Remaining: clickable moving hero sprites with truthful multi-hero anchors,
all subsequent economy purposes/state transitions, keyboard Tab focus audit,
all-class/multi-hero town interactions and320/1920/2560 screenshots. This scoped
checkpoint does not certify the full resumed queue or fun rating.

Subsequent integration: Cut194 implements actual moving hero targets/cave
portraits; Cut195's final real-WASM focused set passes4/4, including this building
help test and39 construction-persistence assertions. Source hashes/full output
are retained in Cut195 evidence; original checkpoint evidence above is unchanged.
