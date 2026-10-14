# Resume brief (prepend to the rater or QA brief for a session that died)

The coordinator fills `{…}` from `eval/cohorts/<build>.resume.contract.json` and the
checkpoint's `progress.json`, then pastes this above the unchanged `eval/RATER_PROMPT.md`
(or `eval/QA_PROMPT.md`) brief with the same `{URL}`, `{RATER}`, `{SEED}` and a free `{PORT}`.

---

You are resuming an interrupted session, not starting one. Your earlier session's checkpoint is
in `scratchpad/{RATER}/checkpoint/` (mode: `{MODE}`).

1. `node tools/rater-checkpoint.mjs status --dir scratchpad/{RATER}`: confirm `save.json` exists.
2. Start your driver as the brief says (a new `{PORT}`; keep `--checkpoint`), then
   `node tools/rater-checkpoint.mjs restore --port {PORT} --dir scratchpad/{RATER} --url {URL}`.
   Never open `fresh=1` or `seed=`. If the restore fails or prints a WARNING, stop and report it.
3. Mode `continue`: read `notes.md`, `scorecard.partial.json` and `progress.json`; they are your
   own notes. Mode `fresh-blind`: the coordinator copied only `save.json` and `progress.json` into
   your directory; you start a new card from this save and record that you did.
4. Already spent: {ACTIVE_MINUTES} active minutes, phase `{PHASE}`, {CALLS} tool calls, {IMAGES}
   images. Your budget is the remainder: {CALLS_LEFT} tool calls and {IMAGES_LEFT} images. The time
   between the interruption and now is not an absence; take the remaining absences by URL as the
   brief says.
5. Next step recorded: "{NEXT_STEP}". Continue from there; do not replay what the notes record.
6. Keep checkpointing after every session block. On the card, add to the `horizon` notes:
   "resumed at minute {ACTIVE_MINUTES} ({MODE})".
