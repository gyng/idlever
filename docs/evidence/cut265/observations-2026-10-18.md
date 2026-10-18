# Vat and building panels — 2026-10-18

Agent visual review and automated interaction evidence; no owner/player feedback
or independent fun rating is included.

## Identity and setup

Base source: `37d8b63fe4756637ba25bf60e6ff08459ba96de6` with integrated
Cut264/Cut265 changes. GPU screenshots used the fast real-WASM package
`8adf55b4…`; final shipping package is
`23599d852fb0a86deebc17099d79a9eadb5d1acd1aeccfb37f1f2306f12e4257`.
Shipping settlement replay matched the fast package in all four cases.
These captures precede any further pricing changes and require revalidation if
relevant presentation or rules change.

Controlled native defeat fixture:
`docs/evidence/cut230/fixtures/controlled-reincarnating-600.game.json.gz`.
Vat journey raises purse to50000; upgrade journey raises purse to100000,
record depth to23, last-night net to1000, builds Bank and hires Clerk.
These are interaction fixtures, not naturally earned campaign progression.

Private-Xvfb Chromium GPU captures, mouse input, text scale100%, visible
viewport only:402×681 CSSpx (primary phone browser-content approximation)
and1440×900 desktop. This is not real Safari acceptance. Captures are in
`../cut264/gpu-screens/` and `gpu-screens/`; panel images show the scrolled
visible viewport, not a full-page inventory.

## Observed

The vat growing/ready states were captured by day and night at both geometries.
The timer and progress ring were readable, the ready outline remained visible
after moving the pointer away, and night treatment appeared cool blue. The
Bank/Vat upgrade rows fit the primary phone width. The Vat row explained the
next discount as `hurry cost −25%`; transaction labels distinguished upgrades
and hurry from supplies.

Automated checks covered one-time callout, price refusal, actual purse debit,
multiple residents growing/ready simultaneously, readiness clearing on tap,
and reduced-motion suppression. Vat GPU journey passed42 checks; upgrade GPU
journey passed28 checks. Logs preserve earlier harness failures as well as the
successful reruns. No frame-time or performance claim is made.

## Interpretation and limits

High confidence in the checked authoritative transactions and the displayed
controls at these two geometries. Moderate confidence in the visual treatment
from this limited agent review. Affordable controlled purchases do not certify
campaign affordability, useful bank payback, sink balance or fun. Current
pricing diagnostics fail the upgrade sink gate; those limits remain separate
from the visual evidence.
