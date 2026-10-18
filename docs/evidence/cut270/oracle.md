# Cut 270 decisions oracle · 180 saves · 3 runs each · horizon 2 h
runs 540 · with ≥ 1 decision 496 (92 %) · max per run 3 · decisions 1134

| kind | n | differ | best non-default | top option share | oracle Δ best depth (mean) | oracle Δ purse (mean, %) |
|---|---|---|---|---|---|---|
| cache | 652 | 515 | 285 (55 %) | 45 % | +0.06 | +161.9 (+0.3 %) |
| boss | 477 | 398 | 148 (37 %) | 63 % | +0.01 | +137.8 (+0.3 %) |
| hurt | 5 | 4 | 2 (50 %) | 50 % | +0.00 | +7.2 (+0.3 %) |

all: oracle Δ best depth +0.04 floors/decision · Δ purse +151.1 (+0.3 %)

Command: `target/fast/examples/decisions --runs 3 --threads 8 <180 dayplayer camp saves>` (`DP_SAVE_DIR`, `dayplayer --bots picked,idle --seeds 6 --days 10`, first check-in of each day; IDLE, IDLE30 and PICKED). Repin 879b WASM source.
