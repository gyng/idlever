# Package-eval evidence (2026-10-15)

This is the evidence for `eval/package/idlever.3823eb8b.coordinator.json` and for
`docs/research/PACKAGE_GRADES_2026-10.md`. The build was main `3823eb8b`, compiled as fast WASM
(`tools/wasm.sh`) and served by a worktree Vite dev server on :5391.

- `walk-seed7/`: `node tools/playtest.mjs --url http://localhost:5391/ --seed 7 --absent 8h --headless`.
  It holds the text dumps, `summary.txt`, `checkpoints.json`, `walk.log` (no console or page errors)
  and screenshots re-encoded as WebP (800×1600, from the 2× headless PNGs).
- `gpu/`: `gpu-capture.mjs`, run with `tools/browser.mjs` `launchGpu()` on its private Xvfb display
  (never the desktop). The renderer was ANGLE D3D12 (NVIDIA GeForce RTX 3080), at a 400×800 viewport
  and 3× scale. The script runs a fresh seed-7 session at `speed=1`, then `absent=8h` on the same
  lineage. The second session was pre-Scout, so its absence finished only the run in flight. Frames
  were re-encoded to 600×1200 WebP. `gpu-capture.json` holds the rAF intervals and the viewer's own
  CPU and GPU frame ms.
  - **Host load average was about 60 on 32 cores** during the capture, so the fps figures are not a
    measure of cost. The viewer itself took 5.7 ms of JS per frame (p95 11.8) and 2.3 ms of GPU time
    (p95 19).
