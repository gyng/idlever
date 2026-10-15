# Cut243 Savings/Bank read-only phase

Next unproved public route after the prior partial56-route census and class/
founding state proofs. `bank-check.mjs` opens the actual Savings building sprite
on unchanged earned inputs; it never deposits, withdraws, sends or simulates.
The current package is strictly checked against e62c0867…df71c. Separate old
97e8/menu-state evidence is retained and is not relabelled current e62c acceptance.

Reproduce with CI Node22 and browser temporary storage on the workspace:

```
TMPDIR=$PWD/scratchpad/cut243-browser-tmp node docs/evidence/cut243-bank/bank-check.mjs
python3 tools/menu-materials-contrast.py docs/evidence/cut243-bank/current-e62c
python3 docs/evidence/cut243-states/focus-side-contrast.py docs/evidence/cut243-bank/current-e62c
# Run text analysis before focus analysis: the shared text glob includes *-contrast.json.
# Fresh post-repair phase (new server; does not overwrite before evidence):
TMPDIR=$PWD/scratchpad/cut243-browser-tmp node docs/evidence/cut243-bank/bank-check.mjs after-e62c
python3 tools/menu-materials-contrast.py docs/evidence/cut243-bank/after-e62c
python3 docs/evidence/cut243-states/focus-side-contrast.py docs/evidence/cut243-bank/after-e62c
```

The second saved input is the untouched actually earned seed1/day8camp documented
in `docs/CUT154_EARNED_D28_DISCOVERY.md` and `cut153/diagnostic-artifacts.json`.
Current native loading determines current capacity/availability. This is UI-state
acceptance, not a present-day pacing cohort or retrofit of historic gear.

Measurement scope and explicit gates are in `REVIEW_CONTRACT.md`. All actual
failures, exact saves, native wire amounts, word coverage and pixel identities
are retained; no full56-route or full queue10/30 completion is inferred.

`STATUS.md` records the observed defect and exact before/after scope. The only
production changes are Bank balance18px→1.125rem in town.css and a scoped Forge
balance use of existing gilt ink in ui-foundations.css. Other town.css diffs belong
to the parent lantern phase and must not be attributed to this repair.

`checkpoint-files.txt` is the proposed narrow curation, not staged. `curation.json`
inventories every retained local original/duplicate/failure bySHA256 with explicit
checkpoint membership. Raw JSON gzip copies decompress byte-identically. For
reanalysis of a curated checkout, decompress phase `*.json.gz` files into a fresh
scratch directory and copy the corresponding PNG inputs there. Run text analysis
before focus analysis; exclude the generated focus-side report from a repeated
text-helper glob (it is not a text-sample record). No numeric threshold changes.
