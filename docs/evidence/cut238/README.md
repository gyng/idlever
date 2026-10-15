# Cut238 continuous-clock earned first-rank diagnostic

Completed native-only evidence, not a selected/default policy, canonical dayplayer check-in result, PICKED comparison or whole Cut238 acceptance. No production source, tuning, WASM or UI changes. See [protocol](IDLE_FIRST_RANK_PROTOCOL.md).

Sixteen fresh real Sessions used the public free house, exactly two manual sends and earned Scout, then no baseline picks/edits. Three diagnostic copies each bought one actual 15-point health/damage/armour rank at a naturally eligible home state. The no-spend arm bought nothing. Orders remained off; later Legacy spending was forbidden. Acquisition and post-fork windows were each bounded to 48 hours. All checkpoints and all 64 endpoints were reached; no censored case was omitted.

All first 15-point observations happened at home. Seeds 1, 2, 11 and 13 earned 15 before their first death, so the explicitly post-death intervention waited for a later genuine home opportunity. Common forks matched that earliest post-death opportunity in all seeds. Home purchase eligibility does not imply recovery is finished: owed recovery/rest remained in the saves and in elapsed D13 time.

Times below are seconds from the fresh Session; death uses the actual exit clock, balance/home/fork use one-second observations. Ratios are no-spend elapsed / treatment elapsed after the common fork, including recovery and all future runs. A ratio below 1 is a slower treatment. Exact one-second brackets, departure waits and conservative climb components are retained in `continuous-idle-16/independent-proof.json` and every raw result.

|Seed|First death|First 15|Home/fork|No-spend next D13 elapsed|Health ratio|Damage ratio|Armour ratio|
|---:|---:|---:|---:|---:|---:|---:|---:|
|1|22531|10338|22532|3608|0.223433|0.307221|0.391451|
|2|12196|9830|12197|30790|1.012130|3.864692|2.952344|
|3|7529|8175|8175|7481|1.041777|1.078420|4.050352|
|4|2877|7532|7532|26831|0.990403|0.910977|1.475366|
|5|5474|9367|9367|19253|2.695743|2.369600|0.830229|
|6|403|8366|8366|37817|2.360759|1.472453|2.392118|
|7|2589|8796|8796|53051|0.978747|3.783951|2.153219|
|8|6956|9571|9571|16345|0.489269|0.456106|0.906796|
|9|6061|14047|14047|9836|0.738716|0.569378|0.807288|
|10|2893|9540|9540|30107|1.053613|1.836577|1.842759|
|11|34257|13241|34258|30062|6.710268|3.632431|6.869744|
|12|5290|13609|13609|46215|7.688405|5.861872|9.981641|
|13|15661|11246|15662|13188|1.061836|6.439453|1.330508|
|14|792|9613|9613|8257|1.001091|1.929206|0.781543|
|15|2473|8245|8245|26637|2.221972|3.347198|3.288925|
|16|2850|10215|10215|35738|2.004375|1.273401|1.663316|

Across all 16 finite pairs, descriptive medians are health 1.047695, damage 1.882891 and armour 1.753037; respectively 6/16, 9/16 and 9/16 ratios reach 1.5. These summaries do not establish a chosen policy or a universal benefit. Health is slower on seeds 1, 4, 7, 8, 9; damage on 1, 4, 8, 9; armour on 1, 5, 8, 9, 14. Seed 1 is particularly adverse: no-spend next D13 takes 3,608s, versus 16,148/11,744/9,217s for health/damage/armour. Historical best at its fork was already D13, and was correctly excluded.

Independent read-only raw-save proof passes: 16 seeds, 64 arms, 48 paid purchases, 579 completed exit receipts, zero sampled exits/endpoints and zero proof failures. Actual first future run IDs, turn-zero replay capsules, paid private ownership and exact +3 HP/+1 damage/+1 armour effects are checked. Paid before/after saves differ only in the private bloodline allocation; all other Session content, shared Gold/accounting, replay history and identity remain identical. Final spent totals prove no subsequent spend. This checks serialized capsule evidence; it does not execute a Replay event-hash replay.

The full run identity reports unchanged bound source and native binary. `CARGO_BUILD_JOBS=4 cargo clippy --profile fast -p idlever-core --example legacy_first_rank -- -D warnings` passes. Seed-1 sanity passed before the four-worker sixteen-seed run. Build, sanity, full logs and terminal exit codes are adjacent. No render or timing-performance claim is made.

All 336 actual checkpoint saves are losslessly archived under `continuous-idle-16/seed-*/*.game.json.gz` (354,478,869 raw bytes; 43,683,237 gzip bytes). `checkpoints.json` records every raw/gzip SHA256 and original local path; decompression was checked byte-for-byte. Raw originals remain under `target/cut238/idle-first-rank-16`. Use `gzip -dc SAVE.game.json.gz > /tmp/SAVE.game.json` for native loading. Sixteen raw results, runtime identity, progress, summary and independent proof are retained alongside them. Sanity identities are under `sanity/`.

Two evidence-preparation errors are preserved separately: the independent parser initially assumed wrapped replay capsules, then was corrected to accept the actual flat encoding; the archive enumerator initially included seed log filenames, then was restricted to directories. Neither changed the game or reran/replaced native outcomes. Final proof/archive logs are separate from those original failures.
