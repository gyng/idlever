# Statistical tuning: cut283-guide-protected

**INCONCLUSIVE** · winner gap8 · canonical gates **NOT RUN**

Discovery is exploratory. Confirmation covers only the declared population estimands at the planned looks.

Study-family alpha 0.05; inference alpha 0.04999999999981811 after collision reserve 3.637978807091713e-12; total two-sided alpha per claim/look 0.004166666666651509, divided equally between tails. This budget applies within this immutable study, not repeated new studies.

Unreached arrival is imputed as horizon (14 days × 24 hours) plus one effective check-in (24 / effective_checkins_per_day hours for each bot). Ratios and paired differences use these finite imputed values; they do not estimate uncensored arrival times or reproduce canonical ratio missing-value rules.
Censor counts below count seeds with any capped metric component; capped observations are retained, never dropped.

Total 3297.49 s; native build/preparation 0.58 s; study 3296.91 s.
New probe calls 9; new seed/profile observations 76; unique observations 76; unpruned search with identical winner-confirmation work 88; 13.6% fewer observations on this study. This is an observation-count comparison, not measured wall time of an exhaustive campaign.

| claim | metric / comparison | estimand / threshold | estimate | interval | capped candidate / baseline | status |
|---|---|---|---:|---|---|---|
| picked-d23-no-regression | `{"bot":"PICKED","field":"arrival_hours","depth":23}`; paired candidate minus baseline | median ≤ 0 hours | 0 | [-8, 8] | 0/32 / 0/32 | INCONCLUSIVE |
| picked-d33-no-regression | `{"bot":"PICKED","field":"arrival_hours","depth":33}`; paired candidate minus baseline | median ≤ 0 hours | 8 | [0, 24] | 0/32 / 0/32 | INCONCLUSIVE |
| tuned-d33-no-regression | `{"bot":"TUNED","field":"arrival_hours","depth":33}`; paired candidate minus baseline | median ≤ 0 hours | 8 | [0, 16] | 0/32 / 0/32 | INCONCLUSIVE |
| pen-advantage | `{"ratio":[{"bot":"PICKED","field":"arrival_hours","depth":33},{"bot":"TUNED","field":"arrival_hours","depth":33}]}`; absolute candidate | median ≥ 1.15 (hours) / (hours) | 1.1833333333333333 | [1, 1.3333333333333333] | 0/32 / 0/32 | INCONCLUSIVE |
