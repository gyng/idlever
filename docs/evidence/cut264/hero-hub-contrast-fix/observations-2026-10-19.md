# Hero Hub close-control overlap — 2026-10-19

Agent visual review and automated measurements; no owner/player feedback is claimed.

Source checkout HEAD at final targeted diagnostic start: `68905730e9f13eb60e563624a87ccf983b572f21` plus the scoped uncommitted UI fix.
The unchanged shipping WASM SHA-256 is `fbf5c36b5703b8071ccc0e8a4301d158304d75727851dd201cb7a29d2422ddda`.
Fixed file identities: `hero-hub.css` SHA-256 `41263dc100fa3f240833364484ddf73392611415142c55c46a7ce1dc171ee73d`;
`ui/sheet.ts` SHA-256 `64f3e2a2613e4dcdf9eaa76e3992785c0308c6dc17c79a43c6733943b0e20b08`.
Served by the existing Vite on localhost:5521. Browsers use the repository's private Xvfb headed GPU launcher; no desktop focus.

## Reproduced defect

The original Hero Hub actual-material contrast audit failed two ordinary-text samples at its unchanged 4.5:1 threshold:
`earned-ready`, 320 CSSpx wide, 100% root text, Gear: 1.108:1;
`earned-recovering-rebirth`, 320 CSSpx wide, 200% root text, Gear: 2.657:1.
These are historical earned fixtures in `hero-hub-current-inputs.json`; diagnostic code verifies their compressed/raw hashes.

The focused harness uses the original load/open/parity/geometry/material sampler, including its existing scroll-step generation,
existing quiet style and whole rectangular text sampling. No new mask, test filter, threshold change or paint-settle workaround.
The material viewport grows to 4000 CSSpx, exactly as in the existing audit. Those tall diagnostic screenshots are scroll inventories,
not representative mobile review. The visible before captures are labelled `before-*`.

The exact first failure reproduced: text rectangle x33.59–265.97, y99.93–118.59;
close stud x241.41–285.41, y100.59–144.59. The actual control overlaps the end of the line.
The visible screenshot shows the sentence ending beneath the stud, and element hit tests identify the stud over that end.
The second exact failure also reproduced. Confidence: high; this is a real content/control overlap, not a screenshot race.

## Change

Only Hero Hub windows reserve a 44 CSSpx close/back row and scroll the folio beneath it.
The existing scroll-more indicator has its own 16 CSSpx footer row; it no longer overlays content.
Other windows retain their current layout. The window controller reads the Hub's internal scroll position for this indicator,
with the same 24px remaining-content cutoff. Root text scaling does not enlarge the reserved close row.
The earlier name-line right padding is removed because the close control no longer shares that line.

## Validation

TypeScript and scoped Oxlint checks pass. Final targeted contrast/geometry/viewport/keyboard results and visual observations are
recorded below when completed. This focused result does not replace the parent agent's complete Hero Hub acceptance rerun.

Final targeted results: PASS. `final-targeted.json` retains the final frozen-source original geometry/material results.
Both original 320 Gear cases pass the unchanged ordinary 4.5 / inactive 3 thresholds: 257 and 404 sampled text rectangles,
2 and 6 automatic scroll steps; ordinary minimum 7.29:1 in each. The fixture source, canonical parity and read-only assertions
remain in the copied diagnostic helpers. No CSS filters, thresholds or sampler filters were changed.

`viewports.json` records six successful viewport/input checks: 402×681 primary browser-content approximation,
320×681 compact stress, and 1440×900 desktop, each at 100% / 200% root font (16px / 32px).
Input: automated mouse/keyboard. All five sections remain free of horizontal scroll; close/back row remains separate from the
scrolling folio; close is exactly44×44 CSSpx; ArrowRight selects Skills from Gear; Escape restores the real focused opener.
The existing focus controller restores on a scheduled animation frame; the initial diagnostic's immediate post-Escape read raced
that callback at200%, so `viewports.log` reruns with a wait for the existing restoration. No focus controller change was needed.
The more indicator clears at the end of each folio.

Visual review: visible-viewport `phone-*-initial.png` and `phone-*-end.png` captures retain the fixed close control above content.
The primary402 folio scroll area measures295.56 CSSpx at both root font sizes. At200%, the large identity header occupies the
initial area and requires scrolling to the section tabs; the separate close remains usable. At normal size, the initial header and
beginning of the tabs are visible. This fix reserves44px for close/back and16px for the end indicator to prevent content overlays;
it does not claim a new compact-header acceptance. Screenshots ending`end.png` show lower gear choices without the stud crossing
their text. These are browser viewport approximations, not physical iPhone or Safari acceptance.

No Cargo, build, package mutation, commit or deployment was performed by this task. Owner subsequently chose to restore the
baseline600-tick shallow recovery while retaining the vat UI and this fix. This evidence remains UI evidence against the unchanged
`fbf5…` shipping package above; final600-package acceptance belongs to the parent agent's subsequent full audit.

The original sampler/function extract and viewport diagnostic are archived as `targeted-harness.mjs.txt`.
To reproduce, copy that file to `web/tests/.vat-hub-diagnostic.mjs` (its original import base), run with
`IDLEVER_TEST_URL=http://localhost:5521 IDLEVER_BROWSER=headed node web/tests/.vat-hub-diagnostic.mjs`, then remove the temporary file.
`IDLEVER_DIAG_VIEWS_ONLY=1` skips the material leg and repeats only the six viewport/navigation checks.
