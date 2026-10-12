# Cut182 — earned QA clarity fixes

Source: completed scoreless b60d282 QA, eleven findings preserved in
`eval/qa/b60d282.qa_cut179_interactive.md` and its complete evidence archive.
No verified fun score yet. No deployment.

This increment fixes the confirmed money/restock/badge display gaps and missing
companion units. Rust truth and resource amounts remain unchanged:

- A net wallet decrease must never be labelled as the total for one spend when
  income offsets it or multiple spend categories contribute. Actual ledger
  spend amounts stay in the tooltip. Regression:17287+243-1800=15730.
- An unpaid repeat can lack gold or pack space: say Restock limited. Away income
  capping is cumulative: income limit, not a claim that all final income was
  spent. Regression:income7778/spent448/left7330.
- Companion card fractions explicitly name hp and rows.
- Next-worker town badges contain their whole status inside the background.
  Reproduce deposit0/3 or19h at320/400/1440.

Gates: relevant existing client groups with strengthened regressions; types and
copy lint; complete current124-group client audit; private-GPU screenshot of
restored earned town, explicitly scope restoration/elapsed time; all failures
preserved. No further blind release until all eleven findings have individual
fix/deviation dispositions and the final accepted game is frozen.

Actor identities are already fixed by Cut180 with original166-group acceptance.
Remaining headline/run-scope, condition-versus-action target, Savings meaning,
Quartermaster source and entrance wording findings remain open for the next
increment; do not call them resolved by this contract.

Validation in progress: types and copy lint pass. Original focused50463
finished4/5; the added supply case incorrectly queried a notice inside
collapsed details. Preserve that failure. Corrected full original-width supply
and companion groups55643 pass2/2,10.3s; money/qa778/Cut117 already pass.
Private GPU diagnostic restores the earned save plus its own town seen/opened
preferences through the existing import API, with runs0 and no absence.
Wallet15730 and bestD22 remain exact; Clerk deposit0/3 or19h text is contained
at320/400/1440. Initial attempts omitted the original town preferences, adding
unseen-building markers that used the three-marker budget and suppressed the
Clerk badge; both failures are preserved as harness failures, not game defects.
Complete current full78113 remains live; guard562shared inputs. No source
edits during that run. No new gameplay/score credit from diagnostic screenshots.

Accepted complete current full78113 TERMINAL0:124/124 in369.475seconds,
all562 guarded inputs match. Types/copy pass; corrected original-width supply
and companion checks pass, other focused groups pass. GPU earned-save3/3
passes with original preferences; diagnostic scope explicitly excludes new
play. Evidence cut182/qa-clarity/. No source edits after full acceptance.
All five display fixes are accepted for the next game build; not a final
freeze or a fun score. Other six findings remain open.
