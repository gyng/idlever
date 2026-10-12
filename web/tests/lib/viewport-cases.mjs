// State-oriented cases keep their original data/assertions at the primary
// phone width in the current audit. Exhaustive, smoke and explicitly targeted
// runs retain every original variant.
export function stateWidths(original, scope = process.env.RIDDLE_CLIENT_AUDIT_SCOPE) {
  if (scope !== "full") return original;
  return original.includes(400) ? [400] : original;
}

// Responsive triples use both endpoints in current full; original intermediate
// checks remain in exhaustive/smoke/targeted runs. Other matrices are unchanged.
export function responsiveWidths(original, scope = process.env.RIDDLE_CLIENT_AUDIT_SCOPE) {
  if (
    scope !== "full" ||
    original.length !== 3 ||
    ![320, 400, 1440].every((w) => original.includes(w))
  )
    return original;
  return original.filter((w) => w !== 400);
}
