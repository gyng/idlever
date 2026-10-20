# Cut303 — full-content identity, cached repeat reads

Automated local measurements/agent interpretation,2026-10-21. No player/blind,
browser, game-rule or fun claim. This changes client test identity collection,
not game code/WASM/defaults or deployment.

run-state.mjs now streams full untracked content at ALL sizes instead of using
size alone above32MiB. Local per-file digests use device/inode/mode/size plus
nanosecond mtime/ctime; files changed/replaced during a fresh read are refused.
HEAD, full tracked binary diff, every Git-listed nonignored untracked path and
fresh served-WASM content remain covered. Identity v2 invalidates legacy-format
passes; resumed passes still print ok* and never count as fresh evidence.
Git/source-read errors fail closed rather than becoming unknown/empty identity.
Missing WASM remains explicit null. No cache or source-path exclusions added.

Default optional cache: target/client-tests/identity-cache-v1.json, only written
when Git-ignored (or an explicitly supplied external path). Schema/checksum and
root binding guard accidental damage; missing/corrupt/unwritable cache means full
reads. Unique temporary file plus rename handles concurrent writers. File
symlinks retain followed-content semantics; directory symlinks hash their own
link text without traversing dependency trees Git did not enumerate. Previous
code silently swallowed EISDIR on these links. Metadata reuse assumes normal
filesystem ctime/mtime behavior. This is a local performance cache, not a security
boundary against an actor forging filesystem metadata or rewriting test state.

Matched fixed-checkout Node22.18.0 measurement, AMD Ryzen9 5950X/WSL Linux ext
filesystem,19,204untracked paths, including28directory links. Three legacy calls
and then one cold fill/three warm optimized calls, no source edits during this
successful comparison. Source paths were not narrowed.

| Collection | Times | Median |
|---|---|---|
| Legacy |22.391s,10.482s,12.005s|12.005s|
| Optimized cold fill |16.884s|single observation|
| Optimized warm |1.175s,1.166s,1.215s|1.175s|

Warm median reduction90.21%, exceeding≥75%. Cold fill read11,446,753,074bytes
(regular content plus directory-link text), using bounded buffers. Every warm
call checked all19,204paths/metadata, read ZERO untracked content bytes, and
freshly read7,111,856WASM bytes. Cold/warm new identities equal; all legacy
identities equal. Different algorithm formats deliberately differ. OS cache,
other local work and filesystem affect timings; this is three repeated warm
observations on one checkout, not a hardware-independent speed guarantee.
The raw legacy coverage size-sum includes28directory stat sizes whose reads
failed EISDIR; it is not an exact count of bytes the old reader consumed.

Initial baseline before implementation:19,202paths,143.806s/19.401s/15.274s,
with source work occurring after the first collection; retain as initial cost
observation, not the fixed-checkout acceptance comparison. The first matched
attempt completed three legacy calls but failed at the new reader's first
directory symlink. Its stderr/empty result are retained; directory-link handling
was explicitly amended before rerunning. Initial diagnostic attempts also hit
Node maxBuffer/EPERM; sandboxed Node Git calls were not accepted as measurements.
Verified measurements/self-tests use functioning Git subprocesses outside that
restriction. No automatic approval rejection occurred.

Thirteen behavioral checks pass: small/33MiB same-size edits with restored mtime,
path/tracked/HEAD/WASM changes, file/directory symlinks, ignored content,
missing/corrupt/unwritable/source-visible cache, Git/unreadable-source errors,
edit during hashing, concurrent writers, actual --failed/--resume/forced-stale
labels and hard-kill recovery. Preserved legacy runner passes three controls and
fails exactly the added same-size large-file refusal. The final deterministic
edit-during-read test was added after timing; production implementation did not
change after the successful matched benchmark. All earlier failed/successful
logs are retained separately. Tests are in verify.sh quick sidecar and Pages CI.
Global formatting/lint and verify.sh shell syntax pass. No browser/core/full/
exhaustive acceptance is claimed for this runner-only change.

The archive contains the exact coverage path list, full per-path digest cache,
tracked binary diff, benchmark drivers/raw observations and original runner.
Benchmark drivers are exact copies from target/cut303; restore them there to
rerun their relative imports. Independent verifier reconstructs the new dirtyHash, checks every covered path,
read/cache counts, median/reduction arithmetic, source hashes and red/green logs:

```sh
python3 docs/evidence/cut303/verify.py
```

Main WASM remains Cut296 d5dd4c18…; live dev423fe45a, no deployment. Held Bank/Vat
W2/recovery/Guide gap4 unchanged. Next: inherited worker-away cause diagnosis,
with current evidence revalidation before another balance candidate; no new
Lich confirmation follows Cut302's failed discovery pilot. R3/R4/recognition,
calibration, independent fun and explicit broader audits remain open.
