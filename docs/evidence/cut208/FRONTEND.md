# Journal frontend checkpoint

`createJournal` in `web/src/ui/journal.ts` consumes the authoritative Journal wire via a reader and routes actions through callbacks. Root supplies an identity that distinguishes the engine instance, seed, selected bloodline and heir. `refresh()` rereads actual facts; `dispose()` invalidates pending reads. No gameplay mutations are implemented here.

One recommended objective is visible. Town/Builds/Delving chapters retain their open state. Later entries and completed discoveries start folded. Rust supplies the objective, progress, reason, effect, requirements, disabled reason and real quest reward meaning. The quest uses the existing reward art and progress bar; a real swap callback is followed by a new read. There is no claim control.

Detached actions capture their original identity. A fresh read blocks changed identities, completed objectives and disabled actions before routing; late reads cannot replace a newer refresh. Scroll and keyed focus are restored through refresh for the same hero. The parchment panel uses existing material/type roles and 44px targets. No sweeping effect is added.

## Focused validation

The explicitly synthetic DOM-contract test passed 39 assertions at 320/400/1440px and normal/exact doubled root text size. It checks one recommendation, folded later/discoveries, no Claim, chapter/focus retention, detached stale action refusal, quest callback reread, disabled swap and horizontal/target bounds. It does not certify actual Rust progression or real quest settlement. The headless browser closed normally.

Two initial failed bounds logs are preserved. They measured controls during the sheet's real unfolding animation (30.36px visual height); the final harness waits for finite animations and fonts to finish before measuring. No target requirement was relaxed. TypeScript, scoped Oxlint, format and copy-lint passed. `frontend-source-sha256.json` pins this checkpoint.

## Integrated acceptance still required

Root owns camp/frame/watch/quest entry routing, engine identity, actual mutations, fresh package and genuine earned-state browser proof. Real House/delve/Porter/Scout progress, locked/away/refused/successful actions, selected-hero changes and real quest swap/completion must be checked after integration. Settled real-WASM screenshots at three widths and 200% text are pending; synthetic fixture images would not prove those states.

## Keyboard completion refinement

After an action completes, focus returns to the same enabled visible key if present; otherwise it moves to the next recommended action, a visible chapter summary, or the focusable status. A synthetic House-to-Delve transition verifies that completing House removes its control and moves focus to Delve. Fixture reads leave their resource value unchanged; this remains a DOM routing test, not proof of Rust read purity.

The expanded test passed 48 checks on fresh no-HMR port 5266. The old5254 cache retained the pre-refinement module and failed the new focus assertion; that raw failure is preserved. `frontend-focus-served-journal.txt` and `frontend-focus-delivery.json` pin the actual new module, and `frontend-focus-source-sha256.json` pins source. Browser closed with exit0. Scoped format/lint pass. Final integrated TypeScript initially failed solely on root's unused camp.ts questShown import (TS6133); Journal itself had no error, and root owns that glue fix.
