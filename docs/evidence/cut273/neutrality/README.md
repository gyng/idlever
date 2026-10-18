# Cut273 neutrality proof (2026-10-18)

The base is main 4adcb94a. Its core matches the branch base 7c4c9ef1 except for the Cut269 honours observer, which no
bot reads. Cut272 changed only the client. The candidate is branch `cut273-workplaces`. Both binaries were built with
`--profile fast` and run with:

    DP_NODES=1 target/fast/examples/dayplayer --bots idle,picked,tuned --seeds 16 --days 14 --threads 8
    target/fast/examples/opening --seeds 16 --threads 8

Results:

- `diff dayplayer-base-4adcb94a.txt dayplayer-cut273.txt` differs only in the wall-clock line (8036 s against
  6085 s).
- Every per-seed row matches: hours to D8, D13, D18, D23, D28, D29 and D33, best depth by day, stall, King and
  stance level. So does every `nodes:` line, which gives each worker's open, ready and hired hours.
- `diff opening-*.txt` differs only in the run's seconds. G1–G6 are identical: G1 0.0 · 0.0, G2 28.9 · 38.2 (the
  owner-approved deviation), G3 6 · 5, G4 2.6 · 4.9 and G6 0.0 · 1.0.

identical per-seed arrival hours, IDLE/PICKED/TUNED x 16 seeds: True
| Build → arrival | IDLE median h (seeds) | PICKED median h (seeds) | TUNED median h (seeds) |
|---|---|---|---|
| Haul chest → porter | 8.0 (16/16) | 0.1 (16/16) | 0.1 (16/16) |
| Guildhouse → scout | 0.0 (16/16) | 0.0 (16/16) | 0.0 (16/16) |
| Forge II → apprentice | – (0/16) | 0.8 (16/16) | 0.8 (16/16) |
| Bank II → clerk | – (0/16) | 40.0 (16/16) | 40.0 (16/16) |
| Drill tent → drillmaster | – (0/16) | 0.2 (16/16) | 0.2 (16/16) |
| Kennel II → kennel_hand | – (0/16) | 40.0 (16/16) | 40.0 (16/16) |
| Quest board II → herald | – (0/16) | 40.0 (16/16) | 40.0 (16/16) |
| Guildhouse II → guide | – (0/16) | 48.0 (16/16) | 40.0 (16/16) |
| Kennel III → kennel_keeper | – (0/16) | 48.0 (16/16) | 48.0 (16/16) |

Hours are lineage-age hours; 0.0 is within the first session. IDLE never builds the Forge, Kennel or Bank, so it never reaches their staff levels (as before).
