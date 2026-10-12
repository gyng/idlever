# Tooltip fixture disposition

The full state-viewport run failed on Mother: `Traits Not learned / Counter Not learned`. The original test passed unchanged in an isolated run at all three widths (13.9 seconds); that diagnostic does not clear the failed full invocation.

The controlled watch fixture assigns known facts and a counter only to the mounted UI lineage. Watch initialization subsequently reads `engine.lineage()` through `syncWatchLineage`; the fake engine regenerates its ledger. Thus the fixture does not guarantee that its authored known-enemy state survives the read. The correction supplies the same authored lineage from that controlled engine read, as it already supplies controlled send/step snapshots. No game code, expected tooltip, owner-unavailable check, numeric assertion, width or timeout changes. A corrected all-width run and full benchmark are required.

The private-display GPU probe reports D3D12/NVIDIA RTX 3080. This proves the launcher backend, not an audit runtime improvement.
