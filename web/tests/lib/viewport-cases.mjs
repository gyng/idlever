// State-oriented cases keep their original data/assertions at the primary
// phone width in the current audit. Exhaustive, smoke and explicitly targeted
// runs retain every original variant.
export function stateWidths(original, scope = process.env.IDLEVER_CLIENT_AUDIT_SCOPE) {
  if (scope !== "full") return original;
  return original.includes(400) ? [400] : original;
}

// Responsive triples use both endpoints in current full; original intermediate
// checks remain in exhaustive/smoke/targeted runs. Other matrices are unchanged.
export function responsiveWidths(original, scope = process.env.IDLEVER_CLIENT_AUDIT_SCOPE) {
  if (
    scope !== "full" ||
    original.length !== 3 ||
    ![320, 400, 1440].every((w) => original.includes(w))
  )
    return original;
  return original.filter((w) => w !== 400);
}

// Owner2026-10-16: one primary current iPhone Pro browser-content geometry.
// The installed Playwright iPhone17Pro profile supplies402×681 CSSpx with
// browser bars visible (its screen is402×874). Current18Pro has the same
// display resolution; this is geometry emulation, not real-device Safari proof.
// See docs/DEV_VALIDATION_TIERS.md for provenance and targeted edge cases.
export function phoneReviewViewport() {
  return { width: 402, height: 681 };
}

export function phoneReviewViewports() {
  return [{ id: "iphone-pro-browser", ...phoneReviewViewport() }];
}
