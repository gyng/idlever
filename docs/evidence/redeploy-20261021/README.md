# Owner-requested redeployment — 2026-10-21

After parking, owner requested deployment. Redeployed the unchanged alpha.3
product source `510bd647c137447ca19c7ffcb9664c1dd340aeec` to both sites.
Parking commit `b63347b9` contains documentation only; no new release was needed.

- Cloudflare: https://dev.idlever.awoo.party/ ; Worker version
  `5729f8d6-bc48-4711-b997-b0b0fcbe6c23`. Clean shipping build and upload pass.
  Temporary worktree used workspace disk to avoid /tmp pressure and was removed
  by the deployment helper after success.
- Pages: https://gyng.github.io/idlever/ ; release workflow
  https://github.com/gyng/idlever/actions/runs/39535708405 attempt 2.
  Engine/tooling/lint/shipping build and deployment succeed.
- Both fresh public browser checks pass source metadata, public CORS/preview,
  real WASM, new-town creation and hero/seed persistence after reload. No page
  errors, failed requests or HTTP errors. Captured WASM hashes match each site's
  previously archived shipping artifact: CF `88e9309a8def175f…`, Pages
  `4292bdc83c0cd519…`. Full hashes are in the smoke receipts.

Each site's `smoke.json` records time, seed, metadata and hashes; its original
new-town save and visible screenshots are retained. Geometry is 402×681 CSSpx,
headless Chromium with reduced motion and Playwright mouse, root font 17px;
this is a browser-content approximation, not Safari or GPU acceptance. These
checks establish functional startup/reload, not independent visual/fun review.
The probe is unchanged from `../deploy-20261021/live-smoke.mjs.txt`.
`manifest.json` binds the raw receipts, logs, screenshots and saves by SHA-256.

Backlog remains paused. The prior 144/175 client audit (31 failures), isolated
Bank/Vat status and progression/fun acceptance limits remain unchanged; the
redeployment does not certify those checks.
