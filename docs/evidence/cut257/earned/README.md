# Cut257 earned continuations (gate 4)

`bash docs/evidence/cut257/earned-run.sh` resumes the genuine parent chains in
`docs/evidence/cut253/earned-cohorts-v2` with each chain's exact remaining
requested seconds and runs the `advanced_campaign` example (public actions only,
no grants, no policy edits). `summary.json` holds the per-branch receipt counts;
`../receipts-count.mjs` re-derives them from the raw bundles.

The raw campaign dumps (~180 MB of per-run sessions, reports and reconstructions)
stay **local and untracked**; the committed evidence is `summary.json` plus each
branch's `receipts.json` and `result.json`, with the receipts hashes recorded in
`summary.json`.
