import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { selectSuite, expand, SMOKE } from '../web/tests/lib/suites.mjs';
const files = readdirSync(new URL('../web/tests/', import.meta.url)).filter(f => f.endsWith('.mjs') && !['run.mjs', 'screen-time.mjs', 'town-gpu.mjs'].includes(f)).map(f => f.slice(0, -4));
const all = files.sort().flatMap(expand);
test('full default and explicit full retain every discovered group, including future tests', () => {
  const augmented = [...all, 'future-regression'];
  assert.deepEqual(selectSuite([], augmented).names, augmented);
  assert.deepEqual(selectSuite(['--full'], augmented).names, augmented);
  assert.equal(selectSuite(['--full'], augmented).suite, 'full');
});
test('routine list runs existing groups and declares partial coverage', () => {
  const s = selectSuite(['--smoke'], all);
  assert.equal(s.suite, 'smoke'); assert.deepEqual(s.names, SMOKE);
  assert.ok(s.names.length < all.length / 3);
  assert.ok(s.names.includes('game-menu') && s.names.includes('routine-keep') && s.names.includes('clarity:paint'));
});
test('explicit diagnostic names override routine selection and cannot be labelled full acceptance', () => {
  const s = selectSuite(['--smoke', 'ui', 'ui:frame', 'fights:break'], all);
  assert.equal(s.suite, 'targeted');
  assert.equal(s.names.filter(n => n === 'ui:frame').length, 1);
  assert.ok(s.names.includes('ui:keep') && s.names.includes('fights:break'));
  assert.equal(selectSuite(['--full', 'game-menu'], all).suite, 'targeted');
  assert.equal(selectSuite(['--smoke', '--', '--report', 'results.json'], all).report, 'results.json');
});
test('ambiguous flags, missing report paths and unknown groups fail before a browser starts', () => {
  for (const args of [['--smoke', '--full'], ['--report'], ['--report', '--list'], ['--unknown'], ['missing-test']])
    assert.throws(() => selectSuite(args, all));
});
test('list command reveals exact coverage without starting Vite or Chromium', () => {
  const cwd = new URL('../web/', import.meta.url);
  for (const [flag, suite, count] of [['--smoke', 'smoke', SMOKE.length], ['--full', 'full', all.length]]) {
    const out = JSON.parse(execFileSync(process.execPath, ['tests/run.mjs', flag, '--list'], { cwd, encoding: 'utf8', timeout: 5000 }));
    assert.equal(out.suite, suite); assert.equal(out.names.length, count);
    assert.equal(out.fullCount, all.length);
  }
});
