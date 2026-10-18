# Hero Hub audit tooltip handover — 2026-10-19

Agent investigation and automated measurement; no player feedback or game-rule defect is claimed.
Final shipping WASM SHA-256 `97afc855272bd3900fad9e937dad265ea40d661602d6f9886ec5a1e8ea880ccf`.
Fresh Vite5522, Node22.18, repository private-Xvfb headed GPU. Immutable earned-hybrid-saved-kit fixture,
1440×1000 CSSpx, root32px (200% text), automated mouse hover.

The first full compact audit stopped at `hero-hub.mjs:978` while reading a worker tooltip before opening the second fixture's Hub.
Expected apprentice/arrives; read graveyard Yara/D28 instead. Its failure/31 completed records are preserved under `hero-hub/`.
The game was not found to have advanced to a death. The displayed graveyard is pre-existing earned history.

`tooltip-owner.mjs` reproduces the exact issue without advancing game time: hover graveyard, wait for its ownership, then hover
apprentice. Immediately after the second hover, pointer is over apprentice but the tooltip still belongs to the graveyard and
contains Yara/D28. After the documented350ms hover delay (`ui/tips.ts:HOVER_MS`), its owner changes to the apprentice button and
text is `Forge II · apprentice arrives · $600`. Persistent phase is ready throughout and the save before/after is byte-identical.
See `tooltip-owner.json`, log, and the visible1440×1000 `worker-tooltip-settled.png` capture. Confidence: high.

The audit previously waited only for any visible `#kw-tip`, which the old plate satisfied. The sole harness change waits for the
hovered worker's `aria-describedby=kw-tip`, then keeps every existing name/arrives/workplace/price assertion. No material sampler,
4.5/3 contrast threshold, fixture, acceptance filter or production behavior changed. Node syntax, scoped Oxlint and Oxfmt pass.

The complete compact GPU audit rerun under `hero-hub-final/` passed10628 checks/30 views/8 cases with exit0 and zero page errors.
That completed result supersedes this synchronization failure for acceptance. The first failure remains preserved.
No WASM/core rebuild was performed by this investigation.
