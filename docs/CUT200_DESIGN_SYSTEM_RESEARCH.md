# Cut200 — an Idlever design system

## Decision and status

Use a small Idlever-owned token and component system. Adapt external conventions,
not an external visual theme or runtime library. Official-source research and a
static CSS audit are complete. The visual comparison, measured accessibility
checks and token adoption remain pending; this document does not certify them.
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

## Existing gaps and smallest scope

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

## Deferred comparison contract

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
