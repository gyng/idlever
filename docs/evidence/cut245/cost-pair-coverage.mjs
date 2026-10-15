// Original contract pairs: duplicate rows cannot stand in for an omitted scene.
import assert from 'node:assert/strict';
export function assertSixPairCoverage(rows) {
  assert.equal(rows.length, 6, 'Exactly six original scene/width pairs');
  const keys = rows.map(r => `${r.id}:${r.width}`);
  assert.equal(new Set(keys).size, 6, 'No duplicate scene/width prerequisites');
  for (const id of ['fens', 'crypt', 'foundry']) for (const width of [400, 1440])
    assert(keys.includes(`${id}:${width}`), `Required original pair:${id}/${width}`);
}
