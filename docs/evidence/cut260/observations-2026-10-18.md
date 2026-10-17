# Cut260 observations — 2026-10-18

Owner amendment 2026-10-16: dated notes with identity, method, what happened, interpretation and confidence.
These are all **automated measurements**. No owner or player feedback was collected, and no visual review
was done in this pass. The notes go stale once the opening's prices, the offer order (Cut232 news), the
forge plot's unlock or the watch speed changes; check them again before reusing them.

## Identity

- Source: base f0e095a2, then 98c26fc0 and 9117a8b2 (other agents' commits) plus the uncommitted
  Cut260 diff (see the Cut260 commit). WASM fast build sha256 `a47a8817e984…` (6 974 030 bytes).
- `tuning/balance.json`: the shipping profile with `tree.rank_days` [2, 4, 8].
- Machine: 32 cores, load 30–77 from other agents throughout (affects client timing groups only).

## 1. Opening probe (native, deterministic; no browser, no viewport)

`target/fast/examples/opening --seeds 16 [--watch-x 4]`. Files: `opening-before.txt` (f0e095a2 source),
`opening-after.txt`, `opening-after-watch4x.txt`, `opening-swap-scout-first.txt`.

- What happened: with checkpoint gold paid at once, the Receptionist ($10) is affordable at 0.3–4.9 min
  (before: 4.9–16.2, the first exit). She is hired mid-run, at the first record checkpoints (D2–D4) of
  run 1. G1/G3/G6 are unchanged. G2 is unchanged at 28.9 · 38.2.
- Interpretation: the G2 gap is the window with nothing on offer (stance L4 at ~20 min, then the forge
  plot at the 4th delve, 37–58 min), not money timing. The purse idles at $200–500 there. At a 4× watch
  model, G2 is still 17.1 · 28.9.
- Confidence: high. Deterministic, 16 seeds, and every seed's timeline shows the same pattern.

## 2. PICKED stages (native dayplayer, 16 seeds × 14 days)

`DP_STAGES=1 dayplayer --rows picked-stages` before (`[2,4,6]`) and after (`[2,4,8]`); logs are in the
session scratchpad, and the summary is in CUT260 §1.

- What happened: before, rank IV fell on days 7/8. Days 9–14 opened stages on 1/3/12/1/2/4 seeds and the
  median was 9.0. After, rank IV falls on days 9/10, and the per-seed counts are 9×4, 10×8, 11×4
  (median 10.0). Days 1–6 are unchanged.
- Margin: 4/16 seeds sit at 9. The median needs ≤ 7 of them below 10. A later change that empties
  day 10 for PICKED could flip the row again.
- Confidence: high for this source (deterministic). The margin is modest.

## 3. Pacing pack

`docs/evidence/cut260/pacing.txt`: 24/24 PASS. The near-bar rows are identical to Cut258: picked-idle
1.50, tuned-picked 1.17, porter worst 13.6, scout worst 4.5 min. Targeted `picked-l-king`: median 13.5, earliest
day 9 (was 14.0 / 10). Rank IV now comes two days later, yet the King falls slightly earlier. The cause is not
traced, and the row passes its bar either way (`picked-l.txt`).

## 4. Client (headless Chromium, real WASM, 1440 widths as the groups define; no phone review)

- `pnpm -s test`, first run at load 64–77: 33/41. A forced rerun of the failed groups, alone: post-clear-town,
  watch-console, class-switch and watch-live-edge PASS. death-fix-discovery PASSES alone (it timed out under
  load). hero-hub (material contrast) and worker-first-act fail as known before this cut.
  clarity:paint still fails one timing assertion at load 36–61: an edit's first forecast paints in
  1.37–1.68 s against a 1.2 s bar.
- Interpretation: clarity:paint measures the forecast path, which runs in sims. `credit_secured` returns
  before doing anything there, so this cut does not touch that path. It is attributed to machine load,
  but it is **not proven** on a clean build this session.
- Not done: a browser look at the purse rising mid-run (the `secured D<n>` gold-transfer receipt). The
  wire path is covered (Advance.credited, ExitLine.credited, gold sheet run filter); its look is unreviewed.
