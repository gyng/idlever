# Statistical tuning: cut280-scout-final

**STATISTICALLY_ACCEPTED** · winner price12 · canonical gates **NOT RUN**

Discovery is exploratory. Confirmation covers only the declared population estimands at the planned looks.

Study-family alpha 0.05; inference alpha 0.04999999999981811 after collision reserve 3.637978807091713e-12; total two-sided alpha per claim/look 0.008333333333303017, divided equally between tails. This budget applies within this immutable study, not repeated new studies.

Unreached arrival is imputed as horizon (1 days × 24 hours) plus one effective check-in (24 / effective_checkins_per_day hours for each bot). Ratios and paired differences use these finite imputed values; they do not estimate uncensored arrival times or reproduce canonical ratio missing-value rules.
Censor counts below count seeds with any capped metric component; capped observations are retained, never dropped.

Total 10.65 s; native build/preparation 0.32 s; study 10.33 s.
New probe calls 8; new seed/profile observations 40; unique observations 40; unpruned search with identical winner-confirmation work 64; 37.5% fewer observations on this study. This is an observation-count comparison, not measured wall time of an exhaustive campaign.

| claim | metric / comparison | estimand / threshold | estimate | interval | capped candidate / baseline | status |
|---|---|---|---:|---|---|---|
| d8-within-day | `{"bot":"IDLE","field":"arrival_hours","depth":8}`; absolute candidate | median ≤ 24 hours | 8 | [8, 8] | 0/8 / 0/8 | PASS |
| d8-no-regression | `{"bot":"IDLE","field":"arrival_hours","depth":8}`; paired candidate minus baseline | median ≤ 0 hours | 0 | [0, 0] | 0/8 / 0/8 | PASS |
