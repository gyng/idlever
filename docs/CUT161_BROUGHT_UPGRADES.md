# Cut161 — honour best-gear orders for brought ordinary gear

Prospective contract, 2026-10-11. Cut160 actual earned bank98 proves eligible
sword+2 value45 is salvaged while brought axe+1 value40 takes the only slot,
despite best_weapon. The automatic plan protects every brought item against
upgrades. Correct this ordinary-gear retention gap; do not claim the change
resolves the original automation gate until the original measurements pass.

Under best_weapon/best_armour, a strictly higher-value ordinary find may
replace brought ordinary gear of the SAME category when storage is full.
Remove the replaced pending id from keep ids; salvage it exactly once via
existing settlement. Do not add a nonexistent vault eviction. Retain ties,
weaker gear, cross-category items, forged/firearm/kit protection, none/unknown
preferences, explicit manual keep and zero slots. Newly selected finds remain
protected. Existing stored-item upgrades stay unchanged. No worker selection,
insurance, exit eligibility, coin rate, hero stats, default orders or prices.

Required checks: earned bank98 now retains sword+2 and salvages old axe once,
with preview/source immutability, save/reload and repeat-settlement equality.
Explicit preferred/secondary category, multi-slot, tie/weaker, protected gun/
forged/kit, none/zero-slot cases pass; existing manual behavior unchanged.
Synthetic42-case catalogue equals Cut156/Cut157 baseline except the3 brought
upgrade cases intentionally changed. Preserve observations and failures.
Same earned camp independent48h/72h enabled/paused comparisons and original
outpace/porter/scout/automation-pays two-seed diagnostic with UNCHANGED bars.
Quick/all-target clippy, realWASM/webbuild and existing keep UI checks pass.
Full native/client acceptance and fresh complete blind ratings remain required.
Do not deploy or silently adopt experimental dayplayer.

Component verified: earned bank98 retains sword+2, salvages old axe once/$8;
preview leaves source save unchanged; manual axe selection remains available.
Reload and repeat settlement exact. Synthetic42:39 complete outcomes unchanged,
3 brought cases intentionally upgrade; all preview/reload/idempotence checks
pass. Protected/tie/secondary/multi-slot test PASS. Quick805Rust/6ignored,
tooling14/types/copy2354zero PASS133s; all-targetclippy/build PASS. RealWASM
6371092B rebuilt; webbuild and old2keep UI checks PASS42.8s. Actual earned
pending exit native/WASM gear/currency/fates match; reload/idempotence/manual
selection pass. Native comparison excludes transport clock metadata. Initial
browser harness used step(0) as a preview on a pending exit with no snapshot:
ensure_run auto-settled it, so manual reuse errored; second attempt still
expected exit_pending from that call. Both failures/scripts preserved. Accepted
test calls autoKeep directly on actual original pending clones; preview is
verified by Rust exit_pending_wire, not falsely by browser step(0).

Same camp48h enabled/paused D24/25 (still adverse),72h D28/26 (old24/26).
Original unchanged-bar diagnostic terminalFAIL69s: outpace100%/porter11.4/
scout12.1min3sends PASS; workerD18 48/48h,mean28.43vs28.50 FAIL. This improves
the observed gap but does NOT clear acceptance. Runtime job key
src3237241c9c6bb7af/five actual completed14d jobs. Experimental dayplayer remains
unadopted. Evidence hashes docs/evidence/cut161. Full native/client acceptance,
immutable shipping freeze and TWO fresh complete blind ratings still pending.
