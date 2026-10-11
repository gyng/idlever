# Cut168 — preserve the King's late wall after sustain improvements

Cut166's original 22-row, 16-seed targeted plan failed only `picked-l-king`: median clear day6.5, minimum4, all16 slain. Its worker-value row passed (mean best29.00 versus28.35), as did engagement, stall, porter and scout requirements. Preserve that complete failure; the experimental actor remains unadopted.

Candidate: increase only the Mirror King's attack range from21–27 to22–28. Keep his700HP, speed, defences, rhythm/counter rules and all earlier monsters unchanged. This adjusts the final fight's sustain requirement without making the early path or useful counter packing worse. Cut121's measured Legacy experiments found that attack, rather than more boss HP, determines the clear threshold.

Unchanged acceptance: `picked-l-king` median>=7, minimum>=4 over16 seeds; `picked-l-purse` spending>=50% of earned income at day3. First tune those two rows with `tools/tune.sh picked-l-king,picked-l-purse`. A targeted success is diagnostic until the original22-row16-seed plan, full native/build/routine18/wire acceptance and complete shipping client pass. Existing Mirror counter and death tests must pass; do not replace failed thresholds with weaker ones. Preserve source/runtime identities and all failures. Rebuild real WASM before client checks.

Complete QA, immutable freeze and two fresh independent complete blind ratings remain required for the fun-score goal. No deployment.
