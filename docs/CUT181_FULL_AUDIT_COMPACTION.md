# Cut 181 — compact the full client audit

Owner clarification: clean up the full audit itself, rather than add another
routine tier. The original Cut180 audit took1797.246s and finished164/166;
both failed groups then passed unchanged in a sequential diagnostic. Preserve
those failures and the currently running original full retry.

## Intended result

`test:full` and the no-argument client runner audit current features. An explicit
`test:exhaustive` retains the original historical regression inventory. Future
test files join both automatically unless a named historical group is explicitly
classified. Keep `pnpm test` and `test:full` distinct; do not introduce a new
compact command or silently relabel a targeted run as full.

Start from the119 current groups identified in the prospective plan. Review
the47 historical/overlapping candidates against named current feature checks.
Their extra cases remain available in the exhaustive audit; a feature mapping
does not prove equivalence of every assertion. Keep both recent failures in
the current full audit. Do not relax assertions, fixture truth or timing limits.

## Gates

1. Record exact current/exhaustive inventories and reasons for each moved group.
   Full selection must include new future regressions and reject unknown groups.
2. Preserve all original test files and all166 exhaustive groups. Explicit
   names remain targeted; lists start neither Vite nor a browser.
3. Selection/scope tests pass. Reports distinguish current full, exhaustive,
   smoke and targeted runs and name what the full run omits.
4. Time a complete current full run on this host. Target<=359.449s (20% of the
   recorded1797.246s run). Record concurrency and hardware-load differences;
   do not claim measured80% defect detection or assertion coverage.
5. If the target or checks fail, preserve the results and improve consolidation
   or execution; do not shorten timing assertions to pass. Leave the long audit
   explicitly available and update operating documentation with measured scope.

The separate49-group wrapper prototype was discarded after the owner's
clarification; preparation and its checks remain in scratchpad/cut181. Existing
run23909 continues its original166-group inventory on unchanged inputs. Apply
the existing runner/registry changes after it reaches a terminal result.
This work does not change the game, reduce blind-play horizons, certify a fun
score, or authorize deployment.
