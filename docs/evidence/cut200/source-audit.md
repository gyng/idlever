# Cut200 static source audit

Research only. No runtime changes or new browser checks. The accompanying
[CSS inventory](css-source-inventory.json) records file hashes, declaration counts
and literal sizes:29 files,17,987 lines. This is source evidence, not a computed
cascade, contrast measurement or screen acceptance result. Paths below are
implementation seams; line numbers can shift with later work.

| Source | Implemented | Gap to assess on the comparison board |
| --- | --- | --- |
| `web/src/styles.css:49` | Palette, fonts and44px tap token | Introduce semantic material/action/type roles rather than more raw colors |
| `web/src/chrome.css:41`, `:52`, `:329`, `:338` | Common parchment window,15px body and bronze Forge trim | Forge still shares parchment; materials need distinct surfaces, not only borders |
| `web/src/chrome.css:110`, `:140`, `:151`, `:157` |44px controls, hover/pressed/focus, disabled opacity | Prove contrast and readable unavailable reasons; selected and focus must stay distinct |
| `web/src/wide.css`, `web/src/chrome.css:52` | Wide-screen overrides plus centered15px body/14px controls | Reconcile desktop hierarchy across sheet layouts; do not blindly enlarge every label |
| `web/src/legacy.css:37`, `web/src/class-tree.css:77` | Existing branch/node layouts;11–12px helper text | Readability and meaningful connected branches at both widths; preserve cumulative rules |
| `web/src/bloodline-tabs.css:1` |48px tabs, selected and focus states, bounded scroll | Map states to common tokens; existing ARIA/focus behavior is not a missing feature |
| `web/src/forge-branches.css`, `web/src/works.css` | Branch controls and worker requirements | Local spacing scales and10–12px descriptions need role-based review |
| `web/src/tips.css`, `web/src/ui/tips.ts` | Hover/focus help and12–13px text | Verify reading against materials and zoom; source presence is not usability proof |
| `web/src/game-menu.css` | Prominent Continue and other large menu actions | Preserve intentional hierarchy rather than forcing every action to44px |

Reuse `openForge` in `ui/forge.ts`; `openHero` in `ui/town.ts` with
`bloodline-tabs.ts` and `bloodline-loadouts.ts`; `renderClassTree` in
`ui/class-tree.ts`; and `renderLegacy` in `ui/legacy.ts`. These already expose
real engine-owned choices and free preparation. Named saved kits, pet loadouts,
deeper Forge choices and a complete connected-tree visual remain separate work.

Journal is not implemented: `ui/quest.ts::openQuest` shows one current goal and
reward; `ui/oaths.ts`, `ui/systems.ts` and `ui/works.ts` hold separate requirements.
Use actual data for a future Journal specimen and label any fixture honestly.
Do not invent progression, rewards or core ownership APIs to demonstrate styling.

The [recommendation and official sources](../../CUT200_DESIGN_SYSTEM_RESEARCH.md)
define the next12-frame comparison and54-cell state board. Both remain pending.
