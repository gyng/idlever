# Cut 277 polish: observations, 2026-10-18

Build and source identity:

- Branch `cut277-polish`, based on main c34db992 (Cut273 merged, repin e85d). The diff touches the client only;
  no Rust changed.
- Fast WASM sha256 `e85d8e0c287c…`, the same package as the e85d repin.
- Vite dev server on :5501.
- Captures are headed Chromium on the GPU (`tools/browser.mjs` `launchGpu`, private Xvfb). deviceScaleFactor is 1 and
  text scale is 100%. Phone captures are 402×681 with touch; desktop captures are 1440×900. Each is the visible
  viewport, not a full page. The `-zoom` files are nearest-neighbour crops of those captures.
- The town hour is pinned to noon (`__town.setHour(12)`) so the layout reads. Without the pin, the evening light hid
  it.

These notes are the agent's own visual review and automated measurements. No owner or player saw this build, so
there is no owner or player feedback to report. Revalidate these findings before relying on them if the town
layout, the art, the residents' resting spots or the chest wire changes.

## Captures (`screens/`)

| File | State | What it shows |
|---|---|---|
| `drill-yard-guild2-402.png`, `-1440.png` (+ `-zoom`) | The fixture `earned-first-ascension-clear`, loaded through the Town button. The Drill tent is built and the Guildhouse is at L2. | The Drill tent's new yard west of the Guildhouse: the tent, the dummy beside it, and the drillmaster before it. A gilt level pip caps the Guildhouse's finial. |
| `drill-plot-lit-402.png`, `-1440.png` | The same fixture with `["drillmaster",1]` removed from the hired list. This is a **constructed** state: it lights the drillmaster and leaves the Drill tent at L0. | The staked plot and its lantern in the yard, clear of the hall. |
| `nodrop-kill-402.png`, `-1440.png` | Real WASM, from `boss-kill-beat`'s set-up: a watched re-climb to the Foundry Master (D23), which has no `boss_drop`. | `FOUNDRY MASTER DOWN` and `SLAIN` with no chest. Rust's step carried `chests: [{boss: foundry_master, items: [], gold: 0}]`. The client showed no reveal (0 `.chest-reveal` mutations) and logged no chest milestone. |

The pre-change layout is in `docs/evidence/cut273/screens/town-late-*.png`.

## Hit targets (measured, the drill-plot-lit state)

| Viewport | Drill plot (worker) | Guildhouse | Pool |
|---|---|---|---|
| 402×681 | 74,368 44×44 | 122,361 44×44 | 92,307 44×44 |
| 1440×900 | 516,622 44×44 | 598,605 72×67 | 541,500 65×44 |

Every visible town target is at least 44×44 at 402. None overlaps another; the gap between the drill plot and the
Guildhouse is 4 px at 402. The Drill tent, once built, has no target of its own, as on main.

## What happened, and how I read it (confidence in brackets)

- **No-drop kills.** A kill with no pattern, piece or gold now plays only its kill beat, and the beat's timing is
  unchanged. On the real engine, a Foundry Master kill gives an empty chest record, and nothing shows. On the fake
  engine, `live-decisions` part `nodrop` checks the same. Kills that drop something still open the chest: the
  `chest` part passes, showing Crownsplitter. (high)
- **Drill tent.** In the yard west of the hall, the tent, dummy and drillmaster read as one place at both sizes. They
  no longer touch the Guildhouse, its spur or the south path. The pool's resting row (y 420) passes south of the tent's
  foot. With three or more residents resting, one may stand near the drillmaster, which is a transient overlap of
  two figures. (medium)
- **Guildhouse L2.** The L2 art is the same hall with a signpost and lantern, and that difference is lost at game
  size. The gilt pip on the finial is small (about 4 px at 402, 8 px at 1440). It is visible on a look and follows
  the workers' rank-pip convention, so it stays quiet. I would not call it loud. If the owner wants more, the next
  step up is a larger hall at L2 (a level look), which needs the hit rect to follow. (medium)
- The Guildhouse in these captures carries Cut272's gilt "ready" outline in every state. It is not part of this
  change. (high)
