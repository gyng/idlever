# Cut251 — paused worker presentation

Scope: the confirmed source defect described in Cut228's dated lived-base audit.
Rust truth, worker orders, authored values, art, action receipts and simulation
remain unchanged. This is a narrow R5 correction, not full lived-base acceptance.

Before: town.ts dims a paused worker but still alternates its two role/tool
frames. The same loop ignores reduced motion and effects Off. A pending
new-hire arrival can continue after the worker is switched off.

Required behavior and numeric gates:

1. A hired worker paused by actual public `setWorker(id, false)` stays present
   at its existing post, dimmed as before, requesting only its base frame0.
   Clear its transient arrival route; no travel/hop continues while paused.
   A lit/unhired worker remains grey/still. No removed worker is resurrected.
2. An active hired worker retains the existing desynchronised two-frame
   **ambient idle pose** under Full/Low. It is not a transaction, training,
   hauling or recent-work receipt. No new activity is invented.
3. Reduced motion and effects Off show stationary base poses, without worker
   travel/hop/frame alternation. Changing presentation preference or pausing
   cancels stale worker arrival; re-enabling an existing worker does not replay
   a hire arrival. Normal active hire arrival remains supported.
4. Browser regression uses actual current8879 WASM and an unchanged earned
   Session input; all pause/resume changes use public actions. For Full/Low/Off
   and reduced motion, collect real renderer atlas requests over at least3s:
   paused IDs request0 alternate frames; active Full/Low request both frames;
   active reduced/Off request0 alternate frames. Run at402×681 and1440×900.
   Before each observation snapshot actual save; after observation require exact
   byte equality. Save mutation from deliberate pause/resume is separated.
5. Repeat pause/resume and100read-only refreshes:0save changes, no false arrival
   replay. Validate native paused flag and existing worker presence.0page errors.
   A bounded controlled scene-only arrival fixture may supplement actual public
   worker tests; label it controlled, never earned gameplay evidence.
6. Cheapest checks: changed-file formatting/lint, TypeScript, focused headless
   browser. Record exact source/package/input hashes and original red result.
   No GPU performance, painted-quality, whole-town or whole-R5 claim follows.

Revalidate after worker projection/retirement, arrival route/lifetime, atlas
selection, motion/effects, save/refresh or renderer-backend changes. Preserve
observations with date, context, confidence and revalidation triggers.
