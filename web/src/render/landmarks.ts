// Cosmetic places fitted to existing terrain. No RNG, rules or saved state.
export type LandmarkRole =
  | "stump"
  | "trap"
  | "reeds"
  | "log"
  | "urn"
  | "sarcophagus"
  | "coffin"
  | "bones"
  | "anvil"
  | "coal"
  | "crucible"
  | "rack";
export type LandmarkPiece = {
  x: number;
  y: number;
  w: number;
  h: number;
  role: LandmarkRole;
  asset: string;
};
export type LandmarkDraw = LandmarkPiece & {
  painted: boolean;
  rect: { x: number; y: number; w: number; h: number };
};
export type Landmark = {
  kind: "fishing-bank" | "burial-alcove" | "work-bay";
  x: number;
  y: number;
  pieces: readonly LandmarkPiece[];
};
type Shape = readonly (readonly [number, number, LandmarkRole, string, number?, number?])[];
const SHAPES: Record<string, { kind: Landmark["kind"]; pieces: Shape }> = {
  fens: {
    kind: "fishing-bank",
    pieces: [
      [-2, 0, "stump", "barrel"],
      [0, 0, "trap", "crate"],
      [2, 0, "urn", "pot"],
      [-1, 1, "reeds", "reeds"],
      [0, 1, "log", "log"],
      [2, 1, "reeds", "reeds_1"],
    ],
  },
  crypt: {
    kind: "burial-alcove",
    pieces: [
      [-1, 0, "sarcophagus", "barrel", 2, 2],
      [-2, 0, "urn", "pot"],
      [2, 0, "urn", "pot"],
      [-2, 1, "coffin", "crate"],
      [1, 1, "bones", "skulls"],
      [2, 1, "coffin", "crate"],
    ],
  },
  foundry: {
    kind: "work-bay",
    pieces: [
      [-1, 0, "anvil", "barrel", 2, 2],
      [-2, 0, "coal", "crate"],
      [2, 0, "coal", "crate"],
      [-2, 1, "rack", "rack"],
      [1, 1, "rack", "rack"],
      [2, 1, "crucible", "pot"],
    ],
  },
};

/** Stable floor plan: five-wide edge, two rows of dressing and a clear third-row aisle. */
export function planLandmarks(
  w: number,
  h: number,
  tiles: readonly string[],
  biome: string,
): readonly Landmark[] {
  const shape = SHAPES[biome];
  if (!shape || tiles.length !== w * h) return [];
  const candidates: { x: number; y: number; score: number }[] = [];
  for (let y = 1; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) {
      let floor = true,
        edge = 0;
      for (let dx = -2; dx <= 2 && floor; dx++) {
        for (let dy = 0; dy <= 2; dy++) if (tiles[(y + dy) * w + x + dx] !== "floor") floor = false;
        if (tiles[(y - 1) * w + x + dx] === (biome === "fens" ? "water" : "wall")) edge++;
      }
      if (!floor || edge < (biome === "fens" ? 3 : 5)) continue;
      let hash = Math.imul(x + w * y, 1597334677) ^ Math.imul(w + h, 3812015801);
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      candidates.push({ x, y, score: (hash ^ (hash >>> 13)) >>> 0 });
    }
  candidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
  const result: Landmark[] = [];
  for (const { x, y } of candidates) {
    if (result.some((p) => Math.abs(p.x - x) < 8 && Math.abs(p.y - y) < 5)) continue;
    result.push({
      kind: shape.kind,
      x,
      y,
      pieces: shape.pieces.map(([dx, dy, role, asset, w = 1, h = 1]) => ({
        x: x + dx,
        y: y + dy,
        w,
        h,
        role,
        asset,
      })),
    });
    if (result.length === 3) break;
  }
  return result;
}

/** Current items/hazards win over decoration, including during seek and live updates. */
export function visibleLandmarkPieces(
  landmarks: readonly Landmark[],
  w: number,
  tiles: readonly string[],
  seen: ArrayLike<number | boolean>,
  items: readonly { x: number; y: number }[],
  hazards: readonly { x: number; y: number }[],
  visible?: ArrayLike<number | boolean>,
): LandmarkPiece[] {
  if (!landmarks.length) return [];
  const occupied = new Set([
    ...items.map((p) => p.y * w + p.x),
    ...hazards.filter((p) => !visible || !!visible[p.y * w + p.x]).map((p) => p.y * w + p.x),
  ]);
  return landmarks.flatMap((landmark) =>
    landmark.pieces.filter((piece) => {
      for (let dy = 0; dy < piece.h; dy++)
        for (let dx = 0; dx < piece.w; dx++) {
          const i = (piece.y + dy) * w + piece.x + dx;
          if (!seen[i] || tiles[i] !== "floor" || occupied.has(i)) return false;
        }
      return true;
    }),
  );
}

/** Small shared primitives preserve silhouettes when an atlas or individual frame fails. */
export function paintLandmarkPrimitive(
  g: CanvasRenderingContext2D,
  role: LandmarkRole,
  biome: string,
  x: number,
  y: number,
  pixel = 1,
): void {
  const ink = "#0d0c14",
    shade = biome === "fens" ? "#304744" : biome === "crypt" ? "#37344e" : "#493933",
    rim = biome === "fens" ? "#7faaa0" : biome === "crypt" ? "#aaa3bd" : "#a4a5a8";
  const rect = (dx: number, dy: number, w: number, h: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(x + dx * pixel, y + dy * pixel, w * pixel, h * pixel);
  };
  if (role === "reeds") {
    for (const [dx, dy] of [
      [1, 2],
      [3, 0],
      [5, 1],
    ]) {
      rect(dx!, dy!, 1, 7 - dy!, ink);
      rect(dx! + 1, dy!, 1, 6 - dy!, rim);
    }
  } else if (role === "anvil") {
    rect(0, 2, 8, 2, ink);
    rect(1, 2, 6, 1, rim);
    rect(3, 4, 2, 2, shade);
    rect(1, 6, 6, 1, ink);
  } else if (role === "sarcophagus" || role === "coffin") {
    rect(2, 0, 4, 8, ink);
    rect(1, 2, 6, 4, ink);
    rect(2, 1, 4, 6, shade);
    rect(2, 1, 3, 1, rim);
    rect(2, 2, 1, 4, rim);
    if (role === "sarcophagus") {
      rect(3, 2, 2, 1, "#eadfc5");
      rect(3, 4, 2, 2, rim);
    } else rect(3, 3, 2, 2, ink);
  } else if (role === "trap" || role === "coal") {
    rect(0, 3, 8, 4, ink);
    rect(1, 2, 6, 4, shade);
    rect(1, 2, 6, 1, rim);
    for (const dx of [1, 3, 5]) rect(dx, 3, 1, 3, role === "trap" ? rim : ink);
    if (role === "coal") {
      rect(2, 1, 2, 2, ink);
      rect(5, 1, 2, 2, ink);
    }
  } else if (role === "stump" || role === "log") {
    rect(1, 3, 6, 4, ink);
    rect(2, 2, 4, 4, shade);
    rect(1, 2, 6, 2, rim);
    rect(3, 2, 2, 1, shade);
    if (role === "log") rect(0, 4, 8, 2, rim);
  } else if (role === "rack") {
    rect(1, 1, 1, 6, rim);
    rect(6, 1, 1, 6, rim);
    rect(1, 3, 6, 1, shade);
    rect(3, 0, 1, 6, ink);
    rect(4, 1, 1, 4, rim);
  } else if (role === "bones") {
    rect(1, 5, 6, 1, ink);
    rect(2, 3, 2, 2, "#eadfc5");
    rect(5, 4, 2, 1, rim);
    rect(3, 6, 3, 1, rim);
  } else {
    rect(1, 2, 6, 5, ink);
    rect(2, 3, 4, 3, shade);
    rect(1, 2, 6, 1, rim);
    rect(2, 1, 4, 1, ink);
    if (role === "urn") rect(3, 0, 2, 1, rim);
  }
}
