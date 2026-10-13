# Cut194 — heroes in the town

Owner queue5/15: actual home hero sprites open their matching details. Delving
heroes appear as portraits above the cave; portrait activation watches that
bloodline. House/tent details remain available separately.

Acceptance: at400/1440px, three actual slots have ID-bound44px scene targets,
two actual simultaneous delves have two matching cave portraits/depths, and
neither delving hero appears as a home resident. Keyboard Enter and pointer
activation select the right bloodline; actual offline completion refreshes
all slot states/heirs without stale portraits. Mouse hover/focus/pressed
feedback is visible. DOM data always follows Rust slots; town walking is
presentation, not invented training/stat gain. No fake actor/pet state.

Verified against rebuilt Cut191 free-preparation WASM: targeted GPU group set
`home-heroes home-building-help town-save` passes3/3 in32.7s. Actor test completes
at400/1440px; full output is retained in `docs/evidence/cut194/client-final.json`.
Existing39 construction-persistence checks remain green. Source/binary hashes
and phone/desktop home/cave screenshots accompany that evidence. Scoped TSC,
Oxlint and copy-lint pass (88files,2437tagged literals).

Three bloodlines are created through actual public worker operations from the
imported earned Gunner town. Every actor is opened by keyboard and by physical
touch400/mouse1440 at its rendered center. Exact selected ID and visible hero
sheet are asserted. Two actual send+step operations produce two cave portraits
with matching depths; home targets for those IDs disappear. Portrait navigation
opens the correct watch. Actual8h offline completion reconciles each ID's
home/live target and current heir. No synthetic live/slot wire fields are used.

GPU normal-motion mode additionally observes genuine movement and checks every
target center within1CSSpx of its rendered actor. Reduced-motion help/persistence
checks run alongside it. Camera-fit updates now synchronize targets immediately,
not only on the next draw. Small presentation lane offsets separate residents;
overlapping touch areas resolve to the nearest actual sprite. Keyboard keeps its
focused ID. Current actor help closes when the actor list changes or details open.

Limits: ordinary current return/death/offline outcomes are tested, not every
special ending or replay/migration permutation. Persistent reincarnation, actual
training/recovery/base needs remain separate queued mechanics; walking is visual
presentation, not fabricated stat progress. Broader320/1920/2560 layout and full
client/core balance audits are not certified by this scoped checkpoint. Full
queue completion and fun rating remain unproven.

Final integrated recheck after construction polish: Cut195 focused set passes
4/4 against final6414194-byte real-WASM package. Updated settled phone/desktop
home and cave screenshots are in `docs/evidence/cut194/settled-screenshots/`;
the earlier checkpoint captures/raw evidence remain preserved. Live cave depth
updates retain home target nodes/focus instead of rebuilding the actor controls.
See Cut195 source hashes and full raw outputs for the final combined checkpoint.
