import test from 'node:test';
import assert from 'node:assert/strict';
import { ODDS, chooseResult, isJackpot } from '../src/game.js';

test('every odds setting selects a triple exactly on the winning branch', () => {
  for (let index = 0; index < ODDS.length; index++) {
    for (let bucket = 0; bucket < ODDS[index]; bucket++) {
      const randoms = [(bucket+0.5)/ODDS[index], 0.01, 0.25, 0.6];
      const result = chooseResult(index, () => randoms.shift());
      assert.equal(isJackpot(result), bucket === 0);
      assert.ok(result.every((symbol) => Number.isInteger(symbol) && symbol >= 0 && symbol < 7));
    }
  }
});
test('a losing roll that accidentally forms a triple is rerolled', () => {
  const values = [0.9, 0.01, 0.01, 0.01, 0.01, 0.25, 0.6];
  assert.deepEqual(chooseResult(2, () => values.shift()), [0, 1, 4]);
  assert.equal(values.length, 0);
});
