# Cut231 item 4 — unlock timeline evidence (2026-10-15, base main 3ee50b3e)

- `timeline-16x14.json` — `dayplayer --bots idle,picked,daily,away --seeds 16 --days 14 --threads 24 --timeline …`
  (the final binary; `IDLEVER_CACHE_FRESH=1`). `new-idle-picked-daily-away-16x14.log` is its table.
- `summary-16x14.md` / `.json` — `node tools/timeline-summary.mjs timeline-16x14.json --bots IDLE,PICKED,DAILY,AWAY`.
- `base-idle-picked-16x14.log` — the base binary (3ee50b3e's dayplayer) on IDLE/PICKED 16 × 14.
- `invariance.log` — `node tools/timeline-invariance.mjs d020eba71131bbbe c6641255c1cd6a33 --labels IDLE,IDLE30,PICKED`:
  the two job caches (base vs timeline binary) hold identical SeedOut for all 48 jobs once `timeline`/`session_m` are
  dropped. The per-seed tables in the two logs are identical (IDLE30 prints in a different position).
- `gates-rows-cadence30-16.log` — `GATES_THREADS=16 node tools/gates.mjs --full --rows cadence30`: FAIL (gap med 6.4 ·
  worst 9.1 min, decisions worst 5, 0/16).
