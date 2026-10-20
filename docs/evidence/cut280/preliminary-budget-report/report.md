# Statistical tuning: cut280-scout-benchmark

**STATISTICALLY_ACCEPTED** · winner price12 · canonical gates **NOT RUN**

Discovery is exploratory. Confirmation covers only the declared population estimands at the planned looks.

Study-family alpha 0.05; total two-sided alpha per claim/look 0.008333333333333333, divided equally between tails. This budget applies within this immutable study, not repeated new studies.

Unreached arrival is imputed as horizon (1 days × 24 hours) plus one effective check-in (24 / effective_checkins_per_day hours for each bot). Ratios and paired differences use these finite imputed values; they do not estimate uncensored arrival times or reproduce canonical ratio missing-value rules.
Censor counts below count seeds with any capped metric component; capped observations are retained, never dropped.

New probe calls 8; new seed/profile observations 40; unique observations 40; exhaustive-budget observations 144; 72.2% fewer observations on this study.

| claim | metric / comparison | estimand / threshold | estimate | interval | capped candidate / baseline | status |
|---|---|---|---:|---|---|---|
| d8-within-day | `{"bot":"IDLE","field":"arrival_hours","depth":8}`; absolute candidate | median ≤ 24 hours | 8 | [8, 8] | 0/8 / 0/8 | PASS |
| d8-no-regression | `{"bot":"IDLE","field":"arrival_hours","depth":8}`; paired candidate minus baseline | median ≤ 0 hours | 0 | [0, 0] | 0/8 / 0/8 | PASS |
