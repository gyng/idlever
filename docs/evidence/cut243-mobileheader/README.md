# Compact mobile header: current earned Watch review

Run `TMPDIR=$PWD/scratchpad/cut243-browser-tmp node docs/evidence/cut243-mobileheader/header-check.mjs final-e62c` with Node22. The harness owns a fresh no-HMR Vite server and one private-display GPU browser. Existing earned input is `docs/evidence/handoff-menus/input.game.json.gz`; raw/compressed input and served source/WASM hashes are recorded. Strict expected WASM is e62c0867b3b68c2546ba316f90d901e45547f9c80e229e86c7d6d145c62df71c,6770275bytes.

Four320/400normal/200% cases exercise actual Home Gold/Legacy/Settings routes, then actual Watch init starts a native departure on that earned state. No grant or engine patch. Browser timers freeze only after actual Watch starts, isolating Settings open/Escape exact-save behavior. One17ms browser frame then permits the real deferred focus-restoration callback; save equality after that frame is recorded separately, since Watch world-clock progression is real. This is UI acceptance, not progression or performance proof.

Numeric scope: normal Home/Watch header≤112px; doubled text may wrap. Stats must actually14→28CSSpx, document overflow≤1px, Settings≥44×44px. Inspect full identity/resource text bounds and actual screenshots. Home route Escape exact-save; Watch Settings Escape exact-save during timer-isolated leg, actual Settings-opener focus after one RAF. No production changes by this harness.

All failures retained. v1/current-e62c wrongly expected RAF-deferred focus restoration while clock stayed paused (save equality passed). v2/raf-e62c future pause100ms was already past when the command reached browser, an explicit protocol scheduling failure. Final protocol uses2000ms future target; no test assertion or product rule weakened.
