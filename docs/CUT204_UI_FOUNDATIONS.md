# Cut204 — shared controls, distinct materials

## Scope and ownership

UI lane owns `web/src/ui-foundations.css`, `ui/sheet.ts` material hooks,
`ui/forge.ts` material option only, a dev-only design board module, and focused
comparison harness/evidence. Existing art and Fira/Grenze remain. No core/types,
WASM package, hero gameplay or progression changes. Journal means the existing
quest card in real-menu evidence; any broader specimen is labeled design fixture.

## Numeric contract

- Three actual menus (Forge, Bloodlines, quest card) at 400×900 and 1440×900:
  six settled baseline and six settled candidate screenshots with identical
  current earned save inputs. No new fictional rewards or unlocks.
- Nine states across three materials at two widths: 54 fixture cells. Default,
  hover, pressed, selected, focus, disabled, locked, busy and error are explicit.
  Fixture state variants exercise shared CSS; genuine interaction checks also
  verify hover/pressed/focus and keyboard operation separately.
- Ordinary actions measure at least 44 CSS px in both dimensions. Preserve larger
  deliberate primary actions. Candidate body/control/detail sizes are at least 16/14/14px
  on phone and 18/16/14px on desktop, using rem and semantic roles.
- Important ordinary text contrast is at least 4.5:1 against the most adverse
  surface sample; inactive text at least 3:1. Measure effective rendered colors
  and sampled surfaces, not just palette intentions. Record exceptions/failures.
- At 200% text scaling, all menu content remains reachable, controls wrap and no
  horizontal viewport overflow occurs. Keyboard exposes a visible focus state;
  existing Bloodline selection/focus/scroll behavior remains unchanged.
- Reduced motion removes optional movement; no recurring sweeping sheens.
- Preserve primitive fallbacks, readable disabled reasons and non-color state
  cues. Forge uses matte iron/stone, Bloodlines ink/gilt, Journal parchment.

Baseline capture precedes runtime changes. Root reviews the measured comparison
before expansion to other menus. Focused static/browser checks only; no complete
accessibility certification, fun verdict or performance claim from this cut.

## Implemented checkpoint

Three materials/shared roles are implemented. Scoped final proof is in
[evidence/cut204/README.md](evidence/cut204/README.md): 10 baseline / 10 candidate
real-menu frames including Class/Legacy, 54 fixture cells and 365 contrast ranges
with 0 failures. Actual 44px targets, hover/press, focus, canceled spend and exact
200% text scaling with nested overflow checks pass. Oxfmt/Oxlint/copy-lint/TSC
pass. This historical cached menu snapshot does not certify root's later
StartingKits integration; served module responses and exact injected CSS are
archived separately. Root review/broader adoption and current named-kit proof
remain pending. No package or commit was made by this lane.
