# Cut273 workplaces: observations, 2026-10-18

Build and source identity:

- Branch `cut273-workplaces`, based on main 7c4c9ef1 (Cut272 town-glow merged).
- Fast WASM sha256 `71dfe43e…` (7,487,464 bytes), the same package as the repin `settlements-inputs-71df.json`.
- Vite dev server on :5491, headless Chromium (SwiftShader). These are not GPU captures, and no frame timing was taken.
- Text scale 100%, deviceScaleFactor 1, input by mouse click through Playwright.

These notes are the agent's own visual review. No owner or player saw this build, so there is no owner or player feedback
to report. Revalidate these findings before relying on them if the town layout, the art or Cut272's glow changes.

## Captures (`screens/`, primary visible viewport, not full-page)

| File | Viewport | Save / state | What it shows |
|---|---|---|---|
| `guildhouse-plot-402.png`, `-1440.png` | both | a fresh town (`?fresh=1&seed=1`) after the House | the Guildhouse plot, the lit target from the first look; no hall and no name |
| `haul-chest-plot-402.png`, `-1440.png` | 402×681, 1440×900 | cut208 earned `seed-1-manual3` (three hand sends; the Porter lit) | the staked Haul chest plot by the mouth, shimmering, with one lantern marker; no greyed porter |
| `guildhouse-plot-earned-402.png`, `-1440.png` | same | after a tap on the chest plot | `LILI ARRIVES` over the well, the chest standing; the Guildhouse plot (bottom left) shimmering; Tasks reads `Build the Guildhouse · auto runs` |
| `guildhouse-arrives-402.png`, `-1440.png` | same | after a tap on the Guildhouse plot | `ARINA ARRIVES`; the guild hall stands; its tip names "Arina, the Receptionist". The purse drop reads `−$20 · build`. The ledger keeps `hire scout`, and only the display words change. |
| `town-late-*.png` | both | the fixture `earned-first-ascension-clear` (scout, guide, apprentice, clerk, drillmaster and herald hired) | Guildhouse L2 (signpost), Quest board L2 (red pennant), Drill tent with dummy, Haul chest, Forge, Bank |
| `town-kennel3-*.png` | both | the same save, with `kennel_hand` and `kennel_keeper` added to `hired` and the kennel built. This is a **constructed** state, not earned. | Kennel L3 (level-3 look), plus everything above |
| `art-review.png` | n/a | Codex output beside the L1 masters | guild L1 / L2, board L1 / L2, drill dummy |

## What happened, and how I read it (confidence in brackets)

- Building is the hire. Tapping the plot builds it, the worker arrives and the ledger line stays `hire <id>`. Gold,
  ledger and settlements match byte for byte (the native repin settled 4/4 unchanged, and the browser
  `gold-settlements` gate passed 564/564). (high)
- The names-after-hire rule holds. Before the build the wire's `person` is empty. The tooltip reads
  `Guildhouse · receptionist arrives · $N`, and the name shows only in the arrive beat and in later tips. (high)
- Plot legibility at 402×681. The staked plot is small (16 texels, about 33 CSS px) but the Cut272 shimmer and the
  lantern make it findable. The Guildhouse plot at the bottom left of the clearing is farther from the action than
  the chest plot. (medium)
- The Drill tent sits west of the south path, beside the Guildhouse. It is readable at 1440, but at 402 it is cramped
  against the guild and the resident walkers, and the dummy reads as a small cross. The spot is a first placement. A
  layout pass with the owner or the UI owner may want to move it. (medium)
- Guildhouse L2's signpost is subtle at game size; the hall itself is unchanged. Quest board L2's red pennant reads
  clearly. (medium)
- The level looks for the Forge and Bank are unchanged. The core keeps `BuildingWire.level` as the old derived look,
  so goldens and looks do not move. The worker level lives in `town.workplaces[].level`. (high)
