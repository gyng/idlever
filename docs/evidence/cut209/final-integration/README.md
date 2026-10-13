# Final package integration

Command: `pnpm --dir web exec node tests/run.mjs combat-cues ctxloss`.
The runner creates a fresh no-HMR suite server and closes it after the run.
Package: real WASM6442546 bytes, SHA-256
`802c54f2f1a3b7142386b0620a86753046b4845be26110bad25f479172ed4fe1`.

`client.log` records the terminal result. `hashes.txt` records this package,
renderer source and focused test identities. This is integration regression
coverage, not a new performance measurement. The combat model proves cue
semantics; the existing context-loss journey covers watch clock continuation,
Canvas pixels, restore and completion, plus town recovery. It does not separately
assert the new class mark's pixels during an actual GL context-loss transition.
Earlier GL and direct Canvas class/outcome checks remain in the parent evidence
folder and retain their original package/baseline identity.
