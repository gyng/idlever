# Cut 191 — real WASM worker preparation check

`node web/tests/free-preparation.mjs` passed 73 assertions using headless
Chromium and a separate real WASM worker. This is a controlled unlocked-state
fixture; it does not prove earned unlock pacing or visual quality.

The test loads its fixture through the actual worker's save/load API. It
prepares unlocked healing potions, mapping scrolls, leashes and swords at zero
Gold, checks their zero catalogue prices, then removes/clears them without a
Gold transaction. A locked long gun is refused without changing saved state.

Three automatic two-heal refills retain automatic ownership at zero Gold,
with a stale million-Gold quote ignored. Preparing a heal by name first teaches
the kind to the stance through the real API; the test does not invent an
identification fact or replace preparation methods.

Three authored delves then consume an actual heal with a real use event,
retreat through the engine, and replenish exactly one authored healing slot
at zero Gold. Each settled loadout survives an exact save/load round trip.
The controlled combat edit sets HP to one, through save/load; consumption and
settlement are not simulated by the test.

Permanent forge advancement remains paid: its first weapon upgrade refuses
zero Gold, charges exactly 100 Gold when funded and records the spending.

Final raw output is `scratchpad/cut191/client-free-preparation.log`:
WASM version `0.1.0`, 73 checks, three delves each ending with zero Gold and
one healing item, and forge price 100. An earlier fixture advanced 64 ticks
past consumption and collected legitimate dungeon Gold; the final fixture
stops at the actual consumption event before retreating. No engine or WASM
package files were changed for this check.
