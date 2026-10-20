# Seed-order validation repair — before the first inference result

Both runtime batches for the planned16seed look completed successfully, with
receipts and original packet hashes. The original collector exited during
structural validation: native stat_probe canonicalizes request.seeds in numeric
order, while the analyzer incorrectly required the caller's random input order.
The failure was at the request assertion, BEFORE record extraction/evaluateClaim.
No inference result was produced or viewed and no native observation is rerun.
Original spec, frozen sources/identity, failure stdout/stderr and all packets
remain unchanged.

Execution amendment: use separately named analyze-repaired.mjs/collect-repaired.py
and a second immutable manifest. Only normalize EXPECTED request seed order with
BigInt numeric comparison; still require exactly the same seed strings/set,
probe, balance, paired records, censoring and runtime identities. The numerical
analyze() function and bounds library remain byte-identical. Fixed16/32looks,
all32scheduled IDs, alpha, four claims and stop/adoption rules are unchanged.
Native job keys and existing packet receipts remain identical, because runtimes,
request membership, spec and observations did not change. No re-selection or
additional budget. The repaired collector reuses the two completed batches and
continues only according to the original planned-look decision.

This is an explicitly recorded validation repair, not a new hypothesis or a
silent claim that the initial frozen program ran successfully. Both program
versions and manifests are retained. Add unsorted high-u64/native-normalization
regression coverage before using the repaired analyzer.
