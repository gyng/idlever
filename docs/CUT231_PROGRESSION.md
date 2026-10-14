# Cut231 — progression improvements (owner-queued 2026-10-14)

Source: docs/research/PROGRESSION_COMPETITORS_2026-10.md §5 (22 comparables). Owner: "queue up progression
improvements". Cut230 (earlier Scout after 2 sends + depth-scaled death recovery) covers proposals 1 and 3 and
lands first. Every item keeps the hard invariants (Rust owns truth; nothing punishes absence; IDLE taps only until
the Scout; offline uncapped after the Scout) and is gated at **16 seeds** on the rows it touches, not only the
routine 2-seed gate.

| # | Item | Gate (numeric) | Status |
|---|------|----------------|--------|
| 1 | First automation ≤5 min; Scout ≤8 min every seed (Cut230) | `scout` worst ≤8 min 16/16; `porter` ≤5 min | in progress (Cut230) |
| 3 | Depth-scaled death recovery; short early waits (Cut230) | runs in first 30 min ≥4 every seed; tuned-picked ≥1.15; picked-idle; idle-* | in progress (Cut230) |
| 5 | Next-worker progress on its trigger ("2/3 sends"); later rungs from counts to feats (time fallback for IDLE kept) | worker-first-act/journal journeys show live progress; `nodes-lit` ≤48 h | queued — client part started now |
| 2 | Pre-Scout absence pays: a small capped camp chest (≤2 h of first-floor gold), no sends; cap vanishes with the Scout | new row "IDLE absent pre-Scout returns gold > 0"; `conserved`; return-pick journey shows the line | queued after Cut230 |
| 4 | Explicit unlock cadence: a beat every 3–5 min for 30 min, then ~1 h, 3 h, 8 h, d1, d2, d4, d7; never two decisions at once | dayplayer unlock-timestamp dump; row: max gap in first 30 min ≤6 min, simultaneous decisions ≤1; `picked-stages`/`idle-stages` | queued after Cut230 |
| 6 | A second hero on day 1–2 (IdleOn's idle lever) | bloodline founding median ≤ day 2 on IDLE/PICKED; no pacing regressions | queued |
| 7 | Away forecast names where the hero will stall (Stone Story †) | forecast journey shows the stall floor; matches real stall ≥80% | queued |
| 8 | Faster replays of cleared floors after a death | time to regain previous best after death ↓ ≥30%; King guard holds | queued |
| 9 | Automation never gold-walled (earned, not bought) audit | audit table; no automation rung behind a pure price | queued |
| 10 | Early first-Legacy payoff +50–200% (Pecorella prestige rule) | first Legacy spend measurably speeds the next D13 | queued |
| 11 | Offline stays uncapped: add rationale line to AGENTS.md invariant | doc only | queued |

After Cut230 lands: measure Idlever's own timeline (first automation, core loop fully automated, first reset,
first new mechanic, offline unlock) from dayplayer/client runs, fill §6 of the research doc, and re-rank.
