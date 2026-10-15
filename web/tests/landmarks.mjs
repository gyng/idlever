// Layout and knowledge invariants on preserved genuine replay geometry.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import ts from "typescript";
const source = readFileSync(new URL("../src/render/landmarks.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { planLandmarks, visibleLandmarkPieces } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const replay = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("../../docs/evidence/handoff-content/run131.replay.json.gz", import.meta.url),
    ),
  ),
);
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
};
const kinds = new Set();
const rows = [];
for (const { snapshot: s } of replay.floors) {
  const before = JSON.stringify(s);
  const plan = planLandmarks(s.w, s.h, s.tiles, s.biome);
  assert.deepEqual(planLandmarks(s.w, s.h, s.tiles, s.biome), plan);
  checks++;
  check(plan.length <= 3, "bounded compositions");
  if (!["fens", "crypt", "foundry"].includes(s.biome))
    check(plan.length === 0, "unrelated biome unchanged");
  const allSeen = new Uint8Array(s.w * s.h).fill(1);
  const pieces = visibleLandmarkPieces(plan, s.w, s.tiles, allSeen, [], []);
  check(pieces.length <= 18, "bounded pieces");
  check(
    visibleLandmarkPieces(plan, s.w, s.tiles, new Uint8Array(allSeen.length), [], []).length === 0,
    "unseen geometry never draws",
  );
  for (const place of plan) {
    kinds.add(place.kind);
    check(place.pieces.length === 6, "complete composed treatment");
    const occupied = new Set();
    for (const piece of place.pieces)
      for (let dy = 0; dy < piece.h; dy++)
        for (let dx = 0; dx < piece.w; dx++) {
          const x = piece.x + dx,
            y = piece.y + dy,
            i = y * s.w + x;
          check(
            x >= place.x - 2 && x <= place.x + 2 && y >= place.y && y <= place.y + 1,
            "all pieces fit declared composition area",
          );
          check(!occupied.has(i), "piece footprints never overlap");
          occupied.add(i);
        }
    for (let dx = -2; dx <= 2; dx++)
      check(s.tiles[(place.y + 2) * s.w + place.x + dx] === "floor", "actual clear aisle");
    const edge = Array.from(
      { length: 5 },
      (_, i) => s.tiles[(place.y - 1) * s.w + place.x + i - 2],
    );
    check(
      s.biome === "fens"
        ? edge.filter((t) => t === "water").length >= 3
        : edge.every((t) => t === "wall"),
      "place follows actual water or wall edge",
    );
  }
  for (const piece of pieces) {
    check(piece.w >= 1 && piece.h >= 1 && piece.w <= 2 && piece.h <= 2, "bounded footprint");
    for (let dy = 0; dy < piece.h; dy++)
      for (let dx = 0; dx < piece.w; dx++) {
        const x = piece.x + dx,
          y = piece.y + dy;
        check(x >= 0 && x < s.w && y >= 0 && y < s.h, "whole footprint inside map");
        check(s.tiles[y * s.w + x] === "floor", "mechanical tiles remain uncovered");
      }
  }
  if (pieces.length) {
    const one = pieces[0];
    const seen = new Uint8Array(allSeen.length);
    for (let dy = 0; dy < one.h; dy++)
      for (let dx = 0; dx < one.w; dx++) seen[(one.y + dy) * s.w + one.x + dx] = 1;
    assert.deepEqual(visibleLandmarkPieces(plan, s.w, s.tiles, seen, [], []), [one]);
    checks++;
    const edge = { x: one.x + one.w - 1, y: one.y + one.h - 1 };
    check(
      visibleLandmarkPieces(plan, s.w, s.tiles, allSeen, [edge], []).length === pieces.length - 1,
      "actual item anywhere in footprint wins over dressing",
    );
    check(
      visibleLandmarkPieces(plan, s.w, s.tiles, allSeen, [], [edge]).length === pieces.length - 1,
      "actual hazard anywhere in footprint wins over dressing",
    );
    check(
      visibleLandmarkPieces(plan, s.w, s.tiles, allSeen, [], [one], new Uint8Array(allSeen.length))
        .length === pieces.length,
      "unseen live hazards cannot change remembered decoration",
    );
    const changed = s.tiles.slice();
    changed[edge.y * s.w + edge.x] = "stairs_down";
    check(
      visibleLandmarkPieces(plan, s.w, changed, allSeen, [], []).length === pieces.length - 1,
      "live terrain changes win over dressing",
    );
    seen[edge.y * s.w + edge.x] = 0;
    check(
      visibleLandmarkPieces(plan, s.w, s.tiles, seen, [], []).length === 0,
      "one unseen footprint cell hides the whole piece",
    );
  }
  check(JSON.stringify(s) === before, "input snapshot remains exact");
  rows.push({ depth: s.depth, biome: s.biome, places: plan.length });
}
assert.deepEqual([...kinds].sort(), ["burial-alcove", "fishing-bank", "work-bay"]);
checks++;
check(planLandmarks(1, 1, [], "crypt").length === 0, "incomplete maps do not invent a place");
check(
  planLandmarks(7, 7, Array(49).fill("floor"), "crypt").length === 0,
  "no wall means no burial alcove",
);
console.log(JSON.stringify({ checks, floors: rows }, null, 2));
console.log(`${checks} landmark layout/knowledge checks PASS`);
