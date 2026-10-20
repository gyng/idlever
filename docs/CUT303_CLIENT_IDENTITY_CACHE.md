# Cut303 — content-correct client identity with cheaper repeated reads

2026-10-21. Client run-state identity hashes every small untracked file on each
startup, while files≥32MiB use size alone. Same-size large edits can reuse old
passes. Git command failure also silently maps to unknown/empty identity.

Keep the existing coverage: HEAD, tracked binary diff, every Git-listed
nonignored untracked path/content and served WASM bytes, plus dirty status.
Hash FULL content at every size using bounded buffers. Change identity format
so old results cannot be mistaken for new evidence. Git/read failures must not
produce a reusable pretend identity. Missing WASM remains explicitly null.

Cache per-file content digests, keyed by resolved repository + path and full
stat fingerprint (device,inode,mode,size,mtimeNs,ctimeNs). File symlinks retain the
existing followed-content semantics. Directory symlinks hash their link text,
without traversing trees Git did not list (old code swallowed EISDIR). Detect replacement/edit during a fresh
read using descriptor/path checks before/after hashing. Cache is a local
performance artifact, not adversarially trusted evidence. Validate schema and
checksum; missing/corrupt/unwritable cache falls back to full reads. Atomic
unique-temp publication; concurrent writers cannot leave partial cache JSON.
Cache must live outside source coverage or in a Git-ignored path; otherwise
operate without caching. No source-path exclusions or size-only shortcuts.
WASM is freshly content-hashed each invocation. Metadata cache assumes normal
filesystem change-time behavior; it is not a security boundary against an actor
able to forge filesystem metadata or rewrite test state/cache together.

Numeric gates: three real-checkout baseline timings before implementation;
three warm optimized calls with identical identities and≥75%median wall-time
reduction. Report cold fill separately and byte/file/cache counts; retain failed
measurement attempts and actual Node/build identities. Warm calls must read zero
untracked CONTENT bytes on an unchanged checkout, while still freshly hashing
WASM and inspecting all paths/metadata. No cold-time improvement claim required.

Behavioral acceptance: small and≥32MiB same-size edits invalidate passes even
with restored mtime; rename/add/delete, symlink target changes, tracked changes,
HEAD/WASM changes invalidate; ignored-path content does not; cold/warm and
missing/corrupt/unwritable cache yield identical valid identities. Git/unreadable
source failures refuse identity, not reuse. Existing real runner --failed/
--resume/forced stale-pass labeling and hard-kill recovery self-tests remain
passing. Include a real runner large-file edit regression, with old code failing
that assertion. Targeted lint/format and relevant mechanical self-tests; no
browser/core/WASM/full-game acceptance required for runner-only change.

No game truth/default/WASM/deploy or held Bank/Vat W2/recovery/Guide gap4 change.
Inherited balance, R3/R4/player recognition/calibration/fun remain open.

## Terminal result

Full-content v2 identity/cache implemented with13passing behavioral checks.
Legacy runner3controls pass/1expected new large-file regression fails. Same-size
edits with restored mtime and edits during fresh hashing are refused correctly.
Global format/lint and shell syntax pass; quick-sidecar/Pages CI include tests.

Successful fixed-checkout comparison covers19,204paths,28directory links. Legacy
median12.005s, optimized cold16.884s, warm median1.175s (90.21%reduction). Warm
calls read0untracked content bytes, preserve exact new identities and freshly
hash7,111,856WASM bytes. Independent archived path/digest/diff reconstruction
matches dirtyHash and all count/median arithmetic. Initial first baseline had
source edits during collection; use only the later fixed-checkout comparison
for acceptance. First matched attempt failed on EISDIR; directory-link handling
was amended explicitly and all attempts retained. No source exclusions added.
Production code unchanged after accepted benchmark; one deterministic race test
was added afterward. Cache metadata assumptions and cold-fill cost remain explicit.

No game/WASM/default/deployment change or broad-game acceptance. Next: current
worker-away evidence/cause revalidation, with Cut302's failed Lich pilot and
Cut300's inconclusive confirmation preserved separately.
