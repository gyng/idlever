# The fun-eval harness — freeze, packet, collect, score

*2026-10-16. `tools/fun-eval.mjs`, `tools/fun-eval.test.mjs`. Reuses `eval/score.sh` (the eval-fun
scorer), `../eval-fun/tools/fun-reliability.mjs` (Krippendorff α), `eval/RATER_PROMPT.md` (the frozen
brief), the four briefed protocol documents, `vite preview` (the server `tools/ship.sh` uses) and
`tools/driver.mjs` + `tools/rater-checkpoint.mjs` (the raters' browser). It adds no rubric, no
scoring semantics and no second implementation of anything that exists.*

`docs/ITERATION_SPEED.md` §1.5 named this cut: "N agent sessions, cards collected, `eval/score.sh` +
`fun-reliability.mjs`, prints mean · sd · α · per-axis distribution", and §1.5/§1.3 make calibration
against the cohorts on record the gate on using it. This file is that harness, its brief contract,
and the calibration that says whether it reproduces what the cards already claim.

## 1. The chain

```sh
# 1. freeze the candidate and serve it on an isolated port (builds the fast wasm + preview bundle)
node tools/fun-eval.mjs freeze --candidate auto                  # --candidate <label>, --dir, --port, --no-build, --package <dist>, --no-serve, --force
node tools/fun-eval.mjs verify --candidate 796be60               # fetch the served bytes back and hash them

# 2. hand one rater their packet (the brief and nothing else)
node tools/fun-eval.mjs brief --candidate 796be60 --rater blind-a --seed 113
node tools/fun-eval.mjs packet-check --candidate 796be60         # prove the packet is only the brief

# 3. the rater plays the frozen horizon, writes its card into the packet's card/ directory
#    (tools/driver.mjs + tools/rater-checkpoint.mjs, exactly as eval/RATER_PROMPT.md says)

# 4. land the card and score it
node tools/fun-eval.mjs collect --candidate 796be60 --rater blind-a
node tools/fun-eval.mjs score   --candidate 796be60              # --cards <dir|file>, --json

# 5. re-score every cohort on record
node tools/fun-eval.mjs calibrate
node tools/fun-eval.mjs status --candidate 796be60               # identity, server, packets, collected cards
node tools/fun-eval.mjs stop   --candidate 796be60
```

Everything lives under the frozen directory (default `scratchpad/fun-eval/<candidate>/`):

| path | what it is |
|---|---|
| `dist/` | the served package, byte for byte |
| `manifest.txt` | `<sha256>  ./path` for every file in `dist/`, the recorded frozen-manifest format |
| `identity.json` | commit, dirty state, wasm sha256, package manifest sha256, artifact identity, served hash check |
| `server.json` | the live preview server (port, url, log, manifest sha256) |
| `packets/<rater>/` | `brief.txt` + byte-identical copies of the four briefed documents + `PACKET.json` |
| `packets/<rater>/card/` | where that rater writes its card and rule export |
| `cards/<candidate>.<rater>.<date>.json` | the dated immutable receipt of every collected card |
| `collected.json` | the receipts log (rater, date, sha256, total) |

## 2. Freeze — the candidate's identity and the served bytes

`freeze` builds (`tools/wasm.sh` fast + `vite build` into a staging dir, then a single rename), hashes
every file of the result, and starts `vite preview --outDir <dist> --strictPort` on a free port. It
records:

| field | what it is |
|---|---|
| `git.commit`, `git.commitShort`, `git.branch` | the source revision |
| `git.dirty`, `git.trackedChanges[]`, `git.untrackedPresent`, `git.untrackedCount` | the dirty state, per tracked path |
| `git.trackedDiffSha256`, `git.porcelainSha256` | hashes of `git diff HEAD` and `git status --porcelain` |
| `wasm.sha256`, `wasm.bytes`, `wasm.wasm` | the engine the package was built from (`web/src/engine/pkg/idlever_wasm_bg.wasm`) |
| `wasm.pkgManifestSha256` | the whole wasm package's file manifest |
| `dist.manifestSha256`, `dist.files`, `dist.bytes` | **the served package bytes**: the sha256 of `manifest.txt` |
| `dist.wasmAssets[]` | every `.wasm` inside the served package, with its sha256 and size |
| `dist.buildKind`, `dist.builtFrom` | `preview` (fast wasm + `vite build`), `existing package` (`--package <dist>`), or `reused dist` (`--no-build`) |
| `identitySha256` | `H("fun-eval-identity/v1" · commit · dirty · trackedDiffSha256 · wasmSha256 · distManifestSha256)` |
| `served.url`, `served.port`, `served.hashes`, `served.mismatches[]` | the URL raters get, and the fetch-back result |

`identitySha256` deliberately excludes the candidate label: it is a pure function of the tree and the
package bytes, so two freezes of the same source share it however they are named (`det-a`, `det-b` and
`796be60` all gave `fca598d1…` for the tree at `796be60e`). The bytes themselves are `dist.manifestSha256`.

**Identical identity ⇒ identical artifact, measured.** Three independent builds of the same clean tree
(one re-freeze plus two fresh directories) all gave `manifest.txt` =
`a6d5d54e187941f6bd674b6742519556bef1e662e740016e44cd85d61da1caf5` (367 files, 26 448 741 bytes) and
identity `fca598d1cb44a6f91d8fc2fb4f8f18b07f64fa9d758c00c98f19549e769c4e58`. Two further independent
builds of the same *dirty* tree (the three tracked files this cut edits) both gave
`12e29b662b190bb808cfbaca31c584cd41ac2620b49d9818ab45d581f85a190b` and identity
`64fb52c93e6a04464a273a968faf2227c2973323187d8f0bf4f10d78138d64bd` — the artifact and the identity move
together with the tree state, because the bundle embeds it: the served JS contains the literal
`796be60e74d2-dirty` (`web/vite.config.ts` defines `VITE_BUILD_COMMIT` from `git rev-parse --short=12 HEAD`
plus `-dirty` when `git diff HEAD` is non-empty).

One boundary worth knowing: that same `define` also injects the **UTC build date**, so a rebuild on a
later day is a *different* package with a different manifest and identity, even from an unchanged tree.
The freeze then refuses under the same candidate, which is the wanted behaviour — a cohort rates the one
directory that was frozen and served, not whatever a rebuild produces later.

**A different package must not reuse a frozen record.** Re-running `freeze` for a candidate whose
`dist/` no longer matches its `identity.json` — a tampered file, or a source change — exits 2:

```
fun-eval freeze: REFUSING to reuse the frozen artifact at …/det-a
  frozen  manifest sha256 a6d5d54e… (367 files, det)
  package manifest sha256 acd0e57e… (367 files, this run)
```

and it rewrites neither `dist/` nor `identity.json`. A rebuild from the same source heals the
directory (the produced package replaces `dist/`; the manifest returns to `a6d5d54e…`), so the refusal
is about *different bytes*, not about re-freezing at all. `tools/fun-eval.test.mjs` covers all three
behaviours.

**Byte evidence that the served artifact is the frozen one.** `manifest.txt` is the frozen package's
identity, and `serve`/`verify` fetch every entry back over HTTP (`accept-encoding: identity`), hash the
response body and compare:

```
fun-eval serve: http://127.0.0.1:37797/ (isolated port 37797, vite preview on …/796be60/dist)
  served bytes 367/367 match manifest.txt (a6d5d54e187941f6bd674b6742519556bef1e662e740016e44cd85d61da1caf5)
```

Any mismatch is listed and exits 2. The served engine is in that check: `dist.wasmAssets[0]` =
`assets/idlever_wasm_bg-5pzPnh8x.wasm`, sha256 `51d041d0f88433e9df7ca4b7511589ab3c091df80c7131f5aac702fbdf62e191`,
6 946 459 bytes — the same sha256 as the `web/src/engine/pkg/idlever_wasm_bg.wasm` the identity records.

`--package <dist>` freezes an existing build (e.g. `web/dist`) without building; `--no-build` re-records
and re-serves what is already frozen. Both still compare against `identity.json` and refuse a difference.
The freeze uses the preview path only (fast wasm, no LTO/wasm-opt, no release build, no tests, no gates),
as §3.1 of `docs/ITERATION_SPEED.md` allows for everything but a blind cohort's Build field. When the
cohort's Build field *must* be the shipping build — `tools/ship.sh`'s contract, and the recorded cells of
`eval/cohorts/*.acceptance.json` — produce it first (`tools/wasm.sh --ship && pnpm --dir web build`) and
freeze those bytes with `--package web/dist`; the harness records and serves whatever package it is given,
and the identity says which wasm and which bundle they are.

## 3. The packet — what a rater receives, and what it never receives

`brief` writes `<frozen>/packets/<rater>/` and nothing else. It contains exactly:

**In**

- `brief.txt` — `eval/RATER_PROMPT.md`, rendered: `{URL}` `{RATER}` `{PORT}` `{SEED}` `{BUILD}`
  substituted, and the two card output paths rewritten from `eval/cards/…` to `card/…` (no other edit),
  followed by a delimited harness appendix listing the frozen identity, the driver port, the seed, the
  URL and the submission path.
- `RATING.md` — `eval/RATING.md`, byte-identical.
- `FUN_EVAL_IDLE.md` — `docs/FUN_EVAL_IDLE.md`, byte-identical.
- `FRAMEWORK.md` — `../eval-fun/docs/FRAMEWORK.md` §1–3, extracted verbatim (the brief's own scope).
- `SCORECARD.template.json` — `eval/SCORECARD.template.json`, byte-identical.
- `PACKET.json` — the provenance record: candidate, rater, seed, url, driver port, each document's
  source path and sha256, the brief's source sha256 and every substitution, the frozen identity, and the
  exclusions below.
- `card/` — empty, where the rater writes `card/<candidate>.<rater>.json` (and the rule export).

**Out**, by construction and stated in the appendix: the design history (`PLAN.md`, `docs/CUT*.md`,
`docs/HANDOFF*.md`, `docs/PLATEAU.md`, `docs/WORK_QUEUE.md`, `docs/ITERATION_SPEED.md`, `research/`), any
other card, cohort acceptance record or reliability report, `eval/calibration/` and `eval/cohorts/`, the
coordinator's notes and `scratchpad/`, the source code and commit messages, and any score the build is
meant to reach or any previous card's total.

`packet-check` proves it, rather than asserting it:

1. the packet's file set is exactly the whitelist above — a stray `LEAK.md` is reported;
2. each document's sha256 matches `PACKET.json` **and** its content is a verbatim substring of the repo
   source it came from — an edited `RATING.md` is reported (and the source's own hash is compared, so a
   changed source is reported too);
3. the brief body is *reconstructed* from `eval/RATER_PROMPT.md` by replaying the recorded substitutions
   forward and compared byte for byte — an edited brief is reported;
4. the harness-authored text (substitutions, appendix, packet fields) is scanned for any score target.

`tools/fun-eval.test.mjs` runs that negative case (a stray `PLAN.md`, an edited document, an injected
"must reach a score of 85") and asserts all three are caught.

**One honest note on a pre-existing line.** `docs/FUN_EVAL_IDLE.md` §6a says "the fun ≥ 80 goal"; the
packet carries that document as-is, because the requirement is that the packet hold the protocol docs
as they are. The harness authors no target of its own: no number in `tools/fun-eval.mjs` is a desired
score (the only literals near one are `[60, 80]`/`70`, the arithmetic expectation of two mechanical
fixture cards with awards 0.6 and 0.8, and the negative-test string the guard must catch). If the owner
wants the packet's documents to stop naming a goal, that is an edit to `docs/FUN_EVAL_IDLE.md`, not to
this tool.

## 4. Rate — the horizon is unchanged

The harness does not compress or redefine the session. The brief's horizon is `eval/RATING.md`'s Tier 1:
~40 min active cold, then three simulated absences (`?dev=1&absent=20m` + ~5 min, `absent=4h` + ~5 min,
`absent=8h` + ~20 min), ≥3 deaths read, ≥2 rule edits attempted, criterion probes before awards,
checkpoints after every block through `tools/rater-checkpoint.mjs`, and `{PORT}` is a free driver port
(so two raters can run concurrently), `{SEED}` derived from `H(candidate/rater)` unless `--seed` is
given. The seed, port, URL and rater are all recorded in `PACKET.json` and in the brief.

## 5. Collect — a named place per card, and no overwrites

`collect` lands the rater's card in two places, keyed by (candidate, rater, date), and refuses if
*either* exists — `writeFileSync(..., { flag: "wx" })`, so nothing overwrites a card:

- `eval/cards/<candidate>.<rater>.json` — the canonical path the scorer and every cohort record use;
- `<frozen>/cards/<candidate>.<rater>.<YYYY-MM-DD>.json` — the dated immutable receipt;
- plus an entry in `<frozen>/collected.json` (rater, date, sha256, total, verdict, identity).

It validates before landing (JSON, ≥16 axes with `id`/`human`/`bot`, a `build` that matches the candidate)
and warns when the card's build is not a prefix of the frozen commit. The second collect prints the
existing paths and exits 2 — and lands no dated receipt for the new date.

## 6. Score — from the cards alone

```sh
node tools/fun-eval.mjs score --candidate 796be60 [--cards eval/cards/796be60.blind-a.json] [--json]
```

`score` shells out to the repo's own scorer (`eval/score.sh`, i.e. `../eval-fun/tools/fun-score.mjs`) per
card — each card's own `genre`/`presets`/`profile` decide the weights — and to
`../eval-fun/tools/fun-reliability.mjs` when there are two or more cards. It prints per-card totals,
verdicts and gates, the mean, the sample sd and α with its interpretation, **and the build identity the
number belongs to** (commit, wasm sha256, package manifest sha256, artifact identity, served URL and its
hash check). `bot` stays `na` on every axis: measured caps are the coordinator's later step
(`eval/RATING.md`), never the harness's.

Nothing but the cards feeds the number, and the output contains no timestamp, so the same cards give a
byte-identical result: three runs of `score --json` on a fixture pair hashed to the same
`c85aff3f…`/`6d3f17c0…`; `calibrate --json` twice hashed to the same `a8543ce3…`. The test asserts it
for `scoreSummary` (deep equality) rather than only for the text.

## 7. Calibration against the cohorts on record

`calibrate` finds every build with ≥2 cards in `eval/cards/`, re-scores each card with the repo's own
scorer, computes mean/sd/α, and compares against the cohort's `eval/cohorts/<candidate>.acceptance.json`
where one exists (tolerances: 0.05 on a total or mean, 0.005 on α).

**Which records were calibrated against.** 38 builds have ≥2 cards on record. Twelve of them are the
blind-instrument cohorts with a locked acceptance score (the series of `eval/RATER_PROMPT.md`'s "paste to
a fresh agent" brief); thirteen have blind pairs, one of which (`d34605e`) has no recorded score. The
other 25 are the pre-pivot / `PLATEAU.md` series. The "eight cohorts" of `docs/ITERATION_SPEED.md`
§1.3/§1.5 and the "plateau 64–69 over eight cohorts" `b58b431`'s verdict counts are a subset of the
twelve below; every one of them is in the table.

### 7.1 The twelve blind cohorts with an acceptance record — all match

`node tools/fun-eval.mjs calibrate`, `2026-10-16`. "Computed" is this harness re-scoring the frozen
cards; "recorded" is the cohort's own acceptance record. Every row agrees to the record's precision.

| build | cards (this harness) | mean | sd | α | recorded (acceptance) | agree |
|---|---|---|---|---|---|---|
| 1a7d834 | 62.7 · 72.7 | 67.7 | 7.07 | 0.5827 | 62.7 · 72.7 · mean 67.7 · α 0.583 | match |
| 1fb7786 | 65.1 · 69.7 | 67.4 | 3.25 | 0.8352 | 65.1 · 69.7 · mean 67.4 · α 0.835 | match |
| 3ab97ea | 68.3 · 63.3 | 65.8 | 3.54 | 0.7262 | 68.3 · 63.3 · mean 65.8 · α 0.726 | match |
| 5331f40 | 68.3 · 59.2 | 63.75 | 6.43 | 0.7196 | 68.3 · 59.2 · mean 63.75 · α 0.72 | match |
| 77030eb | 68.3 · 68.9 | 68.6 | 0.42 | 0.8084 | 68.3 · 68.9 · mean 68.6 · α 0.808 | match |
| 7f7fc2b | 64.4 · 67.3 | 65.85 | 2.05 | 0.8657 | 64.4 · 67.3 · mean 65.85 · α 0.866 | match |
| 8cf9050 | 70.2 · 67.6 | 68.9 | 1.84 | 0.8658 | 70.2 · 67.6 · mean 68.9 · α 0.866 | match |
| 9621b19 | 62.7 · 67.9 | 65.3 | 3.68 | 0.7054 | 62.7 · 67.9 · mean 65.3 · α 0.705 | match |
| ad71e72 | 57.1 · 56.3 | 56.7 | 0.57 | 0.6085 | 57.1 · 56.3 · α 0.608 (no mean recorded) | match |
| b58b431 | 64.8 · 69.8 | 67.3 | 3.54 | 0.8591 | 64.8 · 69.8 · mean 67.3 · α 0.859 | match |
| b8dd77c | 65.9 · 61.4 | 63.65 | 3.18 | 0.9077 | 65.9 · 61.4 · mean 63.65 · α 0.908 | match |
| c4705f9 | 61.0 · 68.3 | 64.65 | 5.16 | 0.7297 | 61.0 · 68.3 · mean 64.65 · α 0.73 | match |

**Verdict: the harness reproduces what the cards claim.** The totals, the means and α all agree, because
the harness computes them with the repo's instrument (`eval/score.sh` → eval-fun's scorer, and eval-fun's
reliability tool) rather than with a second implementation of either. What the calibration therefore
establishes is narrower and better than "the numbers look right": the *packaging* (freeze → packet →
collect → score) does not change the number a card yields.

### 7.2 One blind pair with no recorded score — not comparable

| build | cards (this harness) | mean | α | acceptance record |
|---|---|---|---|---|
| d34605e | 75.2 · 75.2 | 75.2 | 1.0 | no `score` block; status "independent cohort in progress, no locked cards yet" |

These two cards award **identical values on all sixteen axes** (different seeds 313/317, different
retellings and criterion probes) — that is why α is 1.0 and both totals are 75.2. They cannot be compared
against a recorded claim because the cohort's acceptance record carries none, and `blind-b` has no
`lockedUtc`. They are the reason to keep two things separate: the harness *can* compute a number for any
pair of cards, and that is not the same as a cohort having certified one. Nothing here should be read as
a result for `d34605e`.

### 7.3 The pre-pivot series — comparable to prose, and it agrees

The 25 other builds have no acceptance file; their recorded means live in `docs/PLATEAU.md` prose and
tables (recorded to 1 dp there, 2 dp here, so a difference of ≤0.05 is the recording's rounding, not a
disagreement). Spot-check of every cohort `PLATEAU.md` names:

| build | cohort (`docs/PLATEAU.md`) | recorded | computed | recorded α | computed α |
|---|---|---|---|---|---|
| 6e691ec | 1 (line 7) | 63.7 | 63.65 | 0.887 | 0.8866 |
| 186d0ac | 2 (line 8) | 66.0 | 65.95 | 0.809 | 0.8086 |
| 207cc0e | 3 (line 9) | 65.0 | 65.0 | 0.716 | 0.7158 |
| 1cb869d | 4 (line 108) | 69.8 | 69.75 | 0.901 | 0.9014 |
| be954f5 | 5 (line 128) | 67.9 | 67.85 | 0.855 | 0.8549 |
| 98b23c9 | 6 (line 129) | 74.6 | 74.6 | 0.969 | 0.9695 |
| a7c47e9 | 7 (line 164) | 75.5 | 75.45 | 0.878 | 0.8784 |
| eec0f3f | 8 (line 196) | 73.8 | 73.75 | 0.877 | 0.8770 |
| 39def99 | 9 (line 245) | 73.8 | 73.75 | 0.938 | 0.9385 |
| 2cb9e88 | 10 (line 294) | 72.4 | 72.4 | 0.755 | 0.7546 |

Every one agrees. Those cards declare `idle-roguelike` (the pre-pivot preset) and the harness honours
each card's own preset, which is the point of scoring from the cards alone.

### 7.4 Limits of this calibration

- It calibrates the *instrument chain*, not the rubric. Agreement here says the harness is faithful to
  the recorded cards; it says nothing about whether the rubric is right, which is
  `../eval-fun/docs/FRAMEWORK.md` §6's question and `docs/FUN_EVAL_IDLE.md` §6's title calibration
  (`eval/calibration/`), untouched here.
- The pre-pivot comparison in §7.3 is against prose, hand-read from `docs/PLATEAU.md`, not against a
  machine-readable record, because none exists for those cohorts. The twelve rows of §7.1 are the
  machine-checked ones.
- α here is eval-fun's interval α over the common human axes, as `eval/RATING.md` defines reliability. It
  does not include bot caps, which the coordinator applies afterwards.

## 8. What the harness does not establish

- **It is not a human study.** Agent raters, seeds and ports; a human player cohort is a different
  instrument (Tier 3 in `docs/FUN_EVAL_IDLE.md` §4). `docs/AUDIO.md` stays unassessed because an agent
  cannot listen.
- **It is not a release gate.** `tools/verify.sh`, the gate table and `eval/cohorts/*.acceptance.json`
  decide shipping. Nothing here blocks a commit, and `freeze` runs no test, gate or release build.
- **One rater is not a verdict.** α needs two cards on the same immutable build; `eval/RATING.md` sets
  α ≥ 0.67 tentative, ≥ 0.80 decision, and the coordinator's own card is a baseline, never a decision.
  `score` on a single card prints that reliability needs a second rater.
- **A number from the harness is not certification.** It reports the cards it was given, with the
  identity they belong to. It cannot detect that a rater played a different build, ran a shortened
  horizon, or wrote a card from memory: those are the horizon and blindness rules in
  `eval/RATING.md` / `eval/RATER_PROMPT.md`, audited by the coordinator, not by this tool.
- **Blindness is to design history, not to the goal.** The packet's `PACKET.json` excludes "any score
  the build is meant to reach", but two of the four briefed documents *are* the project's precommitted
  brief, and one of them states the target: `docs/FUN_EVAL_IDLE.md` ends with "This file's axes,
  weights and **the fun ≥ 80 goal** are unchanged." So every rater this harness briefs knows the goal
  score, exactly as the twelve recorded cohorts did. `packet-check` compares bytes and cannot see
  semantics, and changing the brief is not the harness's call — it is the owner's (drop the goal from
  the briefed copy, or accept that ratings are goal-aware). Checked on the first real packet
  (`e33d50b`, rater `blind-a`): `RATING.md`'s two "80"s are the **α ≥ 0.80 decision** threshold, not a
  score target, and no card, cohort record or coordinator note leaks in.
- **It does not judge quality or fun.** It has no opinion anywhere; the only judgement in the chain is a
  rater's award on an anchor, and the only arithmetic is eval-fun's.

## 9. What is deliberately not in it

- **No session fan-out.** `docs/ITERATION_SPEED.md` §1.5 sketches `--n 8 --mode transcript|api`
  spawning `claude -p` sessions per seed. This harness stops at the packet: it freezes, hands one
  rater the brief through `brief`, and collects what that rater files. The fan-out needs §1.2/§2 (the
  transcript walk and the tool server), and a transcript rater is a *leading indicator*, never the
  cohort (§1.3) — adding it here would change the precommitted instrument behind the twelve cohorts
  §7.1 calibrates. `brief` is the piece the fan-out would call per rater.
- **No transcript or API mode, no second brief.** `eval/RATER_PROMPT.md` is the brief, unchanged.
- **No bot caps, no gates, no release build.** Those stay `tools/gates.mjs`, `tools/verify.sh` and
  `eval/cohorts/*.acceptance.json`.
- **No reimplementation** of the scorer, the reliability tool, the brief, the driver or the
  checkpoint: `tools/fun-eval.mjs` shells out to each.

## 10. Tests

`node --test tools/fun-eval.test.mjs` (5 tests, ~2 s, no browser, no build, no network beyond
`127.0.0.1:9` which is never contacted):

1. the manifest is the recorded sha256sum format and follows the bytes;
2. `freeze` is byte-deterministic, refuses a package other than the frozen one (rewriting nothing), and
   heals a tampered `dist/` from the source package;
3. the packet is the frozen brief plus exactly the four briefed documents, and `packet-check` catches a
   stray file, an edited document and an injected score target, and a re-`brief` restores it;
4. `collect` keys the card by candidate/rater/date, lands both copies, and refuses a second collect
   without landing a new receipt;
5. the score comes from the cards alone and repeats to the byte (deep-equal two runs, no timestamp).

Tests 4 and 5 skip cleanly if `../eval-fun` is not checked out beside the repo.
