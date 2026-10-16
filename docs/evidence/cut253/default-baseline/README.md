# Cut253 unchanged-native baseline

2026-10-16 engineer/automated observations, not player feedback. Public JSON-line
calls compare the preserved, previously identified8879 native executable with
current Cut253 native source. No tuning, grants, frozen-mask assignment, save
editing or output normalization occurs. `summary.json` states exact scope and
remaining limits; every raw native response, including transport timing, is
preserved in losslessly gzipped records. `inventory.json` pins all local artifacts.

`responses.compact.json.gz` deduplicates136 identical raw payloads and requests,
retaining every raw transport prefix/suffix including timing. The archive
validation reconstructs all14 original gzip files byte-for-byte (42.6MB→7.2MB).
Original paired files remain local and SHA-inventoried; they are excluded from
the curated checkpoint. The summarizer automatically reads the compact archive
when originals are absent; `CUT253_COMPACT=1` forces this path. No game data is
normalized or discarded.

Three actual fresh seeds1/3/5 manually build House, send and advance600 live
ticks apiece. The genuine earned FighterL8 parent is unchanged from
`cut220/actual-next-8879/canonical-parent.session.json.gz`; its earlier README
and preparation ledger retain the origin chain. Separate forks leave Skills
unselected or learn all original six nodes through `learnClassSkill` in actual
public catalogue order. All six purchases succeed; the sent frozen mask is63.
Both branches enable the actually hired Scout, send and run the actual next8h.

Complete StepResults (events/snapshots), compiled/sent Session saves, absence
reports and post-absence saves are byte-exact across runtimes. Supplemental v2
runs also compare every newly created run's complete public replay payload:
per-floor snapshots/events, hash and ticks. All11 real capsules are available;
replay reads preserve each runtime's complete save. These reconstructed events
are not a watched/live-stream equivalence proof.

Full Lineage responses deliberately differ in the appended six nodes, canonical
budget/next_pick and Journal eventual requirements/state. Exact differences stay
in `comparisons.json`; no fields are normalized away. Every original six node
object remains identical. This is scoped unchanged-behavior evidence, not a
five-class selected-path baseline, advanced earned campaign or pacing/full pass.

Reproduction (new output directory required; current source/package does not
change):

```sh
cargo build -q --profile fast -p idlever-core --example native_dev
python3 docs/evidence/cut253/default-baseline/compare.py --case fresh1 --out NEW_DIR
python3 docs/evidence/cut253/default-baseline/compare.py --case earned-old-six --replays --out OTHER_NEW_DIR
python3 docs/evidence/cut253/default-baseline/summarize.py
```

The summarizer audits pinned existing cases, rather than running new gameplay.
Original v1 evidence remains; v2 supplements the two earned cases with actual
replays. The first two harness versions are retained. Their small changes remove
an inert local loop, enforce the preserved binary SHA and add a byte-exact count;
the final version adds actual public replay reads. No game input changes silently.

Revalidate before reusing these observations after any relevant class, combat,
scheduler, RNG, offline, Scout, save/notice or replay change, or a different
source/binary/balance identity. Installed-WASM, earned advanced progression,
all-node negatives, five-class interactions and statistical/fun gates remain
separate.

The first summary audit raised a metadata KeyError because zero class_skills
is omitted by serde. Its script/log are preserved; the summary now reads the
canonical zero default. This changed no captured response or comparison.
