# Cut200 — an Idlever design system

## Decision and status

Use a small Idlever-owned token and component system. Adapt external conventions,
not an external visual theme or runtime library. Official-source research and a
static CSS audit are complete. Cut204 subsequently implemented shared roles,
three materials and a scoped measured comparison. Broader adoption, the current
whole-game accessibility audit and visual review remain pending; this document
does not certify them.
No external code, fonts or assets were imported. Cut199 lighting is the preceding
checkpoint, not evidence that menu materials or controls passed this audit.

## Preserve

[ART_DIRECTION.md](ART_DIRECTION.md) governs the result: moonlit ink/wash on a
pixel grid, existing palette, self-hosted Grenze/Fira, restrained BLOOD actions,
matte iron/stone and appropriate parchment. Forge, Bloodlines and Journal need
distinct materials with predictable controls. Reuse native DOM helpers and packed
frames in `web/src/ui/skin.ts`, `frame.ts` and `sheet.ts`. Keep builds central and
language concise; add no recurring chores.

## What to adapt

| Official reference | Adaptation | Limit |
| --- | --- | --- |
| [Spectrum tokens](https://spectrum.adobe.com/page/design-tokens/) | Separate palette primitives, semantic roles and component values | Tokens do not supply interaction behavior; retain Idlever art and fonts |
| [Carbon spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview) and [component checklist](https://www.carbondesignsystem.com/getting-started/contributing/component-checklist) | Shared spacing rhythm and explicit state inventory | Choose game density from the comparison, not enterprise defaults |
| [USWDS buttons](https://designsystem.digital.gov/components/button/) | Native buttons; default, hover, pressed, focus and unavailable states with reasons | A custom implementation needs its own checks; `aria-disabled` requires activation guards |
| [Xbox text](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101), [contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102) and [navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) | Measure rendered text, scaling, worst-background contrast and logical focus | CSS font size alone is not rendered glyph height; source declarations cannot prove compliance |
| [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/basic/) | Readable defaults and information that survives loss of color or animation | Verify actual game screens and moving backgrounds |

## Original audit and first scope (historical)

The [source audit](evidence/cut200/source-audit.md) covers29 CSS files and17,987
lines, with literal type sizes from8 to48px. Hover, pressed, focus and accessible
Bloodline tabs already exist. The gaps are a shared semantic state/material map,
consistent desktop type hierarchy, measured contrast and complete visual proof.
The common parchment window still surrounds Forge; bronze trim does not make it
an iron workshop. Several important descriptions use11–13px. Journal is currently
one quest card, not an implemented journal. Existing cumulative class/Legacy
behavior should survive; connected-tree presentation still needs comparison.

Start with one token file and six existing primitive families: window, button,
tab, info/disclosure, state card and tree node. Map Forge to iron/stone, Bloodlines
to ink/gilt and Journal to parchment. Keep control rules shared. Candidate spacing
is4/8/12/16/24/32; candidate body/control/detail sizes are16/14/14px on phone and
18/16/14px on desktop, expressed through scalable roles. These are design inputs,
not accepted accessibility values. Ordinary hit targets should measure at least
44px; retain deliberately larger primary controls such as Continue. Distinguish
selected, locked, unaffordable, busy and disabled with text or symbols as well as
color. Keep unavailable reasons readable instead of fading an entire card.

## Original comparison contract (delivered in scoped Cut204)

Before broad adoption, compare Forge, Bloodlines and Journal at400×900 and
1440×900:6 baseline plus6 candidate settled screenshots. Journal baseline is the
current quest card; label any unimplemented Journal candidate as a design fixture.
Use the same long-name and large-value fixtures, plus empty and locked states.
A separate state board covers default, hover, pressed, selected, focus, disabled,
locked, busy and error across three materials and two widths:54 cells.

Measure44px hit targets, keyboard reachability and retained focus through live
updates,200% text scaling without lost content or two-axis scrolling, reduced
motion alternatives and contrast over the worst textured region. Proposed audit
thresholds are4.5:1 for important ordinary text and3:1 for inactive text, informed
by XAG102 above; measurements remain pending. Post screenshots for art and
readability review before expanding beyond these three screens. No browser or
performance claim was made for this research checkpoint.

## Reuse and licensing

No source copying is needed for the recommendation. If later copying implementation,
check the exact version and retain applicable license/notice obligations:
[Spectrum tokens](https://github.com/adobe/spectrum-tokens/blob/main/LICENSE) and
[Carbon](https://github.com/carbon-design-system/carbon/blob/main/LICENSE) use
Apache2.0. [USWDS](https://github.com/uswds/uswds/blob/develop/LICENSE.md) has a
public-domain/CC0 core with separately licensed files, including fonts and icons.
A token license does not license a vendor font or artwork. Keep the existing local
OFL-licensed Fira and Grenze assets.

## Current recommendation — 2026-10-14

Keep one Idlever system: shared control behavior, with three physical materials.
The palette and painted frame assets remain the foundation. Extend existing
`ui-foundations.css` and `sheet.ts`; do not add another theme or UI runtime.
Forge is a workshop, the hero screens are an ink-and-gilt folio, and the Journal
is marked paper. Their geometry and input rules should feel related even when
their surfaces differ. The HeroHub layout and information hierarchy belong to
the separate current HeroHub contract.

The old29-file audit above is historical. Current source already defines spacing,
body/control/detail/title roles,44px minimum targets, three material surfaces,
hover/pressed/selected/focus states and reduced-motion overrides. Cut204 records
54 specimen cells and365 measured contrast ranges; Cut207 records later scaling
fixes. Cut216 adds set controls, while Cut217/218 validate compact chrome and
actual home targets. Those proofs cover named snapshots, not every menu.
The current quest sheet remains a quest card; a full MMO-style Journal is still
product work. No design-system research should substitute for that work.

### Official sources rechecked

These primary pages were opened on2026-10-14. The adaptations below are our
design decisions; the sources do not endorse Idlever or certify its UI.

| Source | Adopt in Idlever | Boundary |
| --- | --- | --- |
| [Adobe Spectrum tokens](https://spectrum.adobe.com/page/design-tokens/) | Palette values feed semantic roles, which feed a small number of component values | Keep our palette, fonts and frames; do not copy vendor colors or component density |
| [Epic CommonUI design guidelines](https://dev.epicgames.com/documentation/en-us/unreal-engine/design-guidelines-for-using-commonui-in-unreal-engine) | Separate passive hints from input-blocking modal screens; retain clear activation and focus ownership | Useful behavior model, not an Unreal migration or browser library |
| [Xbox text display](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101) | Measure actual glyph body height, retain a sans-serif option, scale important text through200% without losing content | Its PC18px-at1080p reference measures rendered glyphs; CSS18px and device resolution alone do not prove it |
| [Xbox contrast](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102) | Important ordinary text4.5:1; inactive text3:1; test the weakest textured background | High-contrast mode, if added, needs its own7:1 checks |
| [Xbox navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) and [focus](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113) | Consistent Back/Close position, logical keyboard order and an unmistakable visible focus mark | Controller support is a separate feature; keyboard proof cannot certify it |
| [Xbox motion](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117) | Optional UI animation can be disabled; information survives without motion | Keep actual gameplay distinct from decorative menu movement |
| [W3C tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) and [modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Native semantic controls, arrow navigation within tabs, focus inside a modal, Escape and focus restoration | Automatic tab activation suits already available panels; costly panels should use explicit activation |
| [W3C focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Floating docks and sheets must not hide the focused action | Our proposed fully visible control/focus gate is stricter than this minimum criterion |

### One material and state vocabulary

| Role | Shared meaning | Material expression |
| --- | --- | --- |
| Surface / inset / text | Separate content from decoration; opaque backing behind essential text | Forge UMBRA/INK/BONE; heroes INK/UMBRA/BONE; Journal BONE paper/ink |
| Focus | Where keyboard activation will land | MIST outline on dark materials; dark DUSK outline on paper |
| Selected | Current build choice, not keyboard focus | GILT edge plus check/current label; unchanged geometry |
| Locked / unavailable | An unmet requirement, with the reason readable | Lock or reason text; no blanket opacity fade |
| Busy | An actual pending engine request | Static status plus optional bounded motion; never a cosmetic fake worker task |
| Danger / primary | Consequential reset or the main Delve action | BLOOD/CLOT sparingly; do not paint ordinary tabs red |
| Details / help | Inspect without spending or changing a build | Same44px info/disclosure action on each material |

Keep Grenze for titles and Fira for instructions, numbers and controls. Expose
hierarchy through size, weight and spacing rather than another font. Painted
bevels and rivets belong at panel boundaries. Do not put moving sheen, high
frequency hatch or strong texture behind price/requirement text. Larger text
must reflow content; decorative frames and pixel scenes need not double in size.
The Cut218 desktop576px overflow is a concrete example of why those roles differ.

### Next comparison contract

This is a proposed acceptance plan, not completed validation or code authorization.
Use actual hero/build/Forge/quest data. Label a broader Journal specimen as design
only until its Rust-owned progression exists.

- Six menu families: hero hub, Forge, Journal, companions, settings and run report.
  At320/400/1440/2560 and normal/200% text, record48 settled cases for each
  baseline/candidate. Include long names, large Gold, empty history, unavailable
  choices and an away/recovering hero without granting progression.
- Preserve the54-cell three-material/nine-state board. Every interactive action
  is at least44CSSpx in both dimensions; zero horizontal document overflow,
  zero clipped required copy and zero two-axis content scrolling.
- Measure at least20 actual words per material, including ascenders/descenders,
  prices and requirement text. Record CSS size, rendered glyph bounds, DPR and
  display reference separately. Investigate every important PC-reference body
  word below18 rendered pixels rather than claiming a CSS-token pass.
- Sample every important foreground against its weakest local background:
  ordinary text4.5:1, inactive text3:1, controls/focus boundaries3:1. Record all
  failures. A readable locked reason remains ordinary important text.
- Keyboard reaches every enabled action. Modal Tab/Shift-Tab remain inside the
  active modal; Escape returns focus to the actual opener. Tabs retain correct
  selected semantics. Across100 live refreshes, focus stays on the same logical
  action or a documented successor; zero focus jumps to hidden/offscreen items.
- Whole-frame tests include floating dock, expanded depth inspector and sheets.
  Focused controls and their outlines remain fully visible; required44px target
  centres are uncovered. Preserve zero save changes for read-only inspection.
- Reduced motion removes optional pulses, sweeping effects and panel movement.
  Selected/busy/error/locked state remains legible without animation or color.
- For any new dynamic decoration, compare150 active warm frames with the same
  actual scene/save/package on a quiet private GPU display: incremental CPU
  p95≤1ms, zero extra continuous atlas work, zero browser errors. DOM solver
  cost must be included; prior renderer-only cost proof cannot certify it.

Post matched phone and desktop screenshots for art/readability review before
rolling these roles into the remaining menus. No imported assets, new dependency,
runtime changes or new performance claims result from this research update.
