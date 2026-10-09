import assert from 'node:assert/strict';
import test from 'node:test';
import { getArtworkPeriod, getArtworkScene } from './dailyArtwork.ts';

test('artwork follows local morning daytime and evening periods', () => {
  assert.equal(getArtworkPeriod(new Date(2026, 6, 15, 5)), 'morning');
  assert.equal(getArtworkPeriod(new Date(2026, 6, 15, 11)), 'daytime');
  assert.equal(getArtworkPeriod(new Date(2026, 6, 15, 18)), 'evening');
});

test('artwork keeps one scene per date and rotates on following dates', () => {
  const today = getArtworkScene(new Date(2026, 6, 15, 8));
  assert.equal(getArtworkScene(new Date(2026, 6, 15, 21)), today);
  assert.notEqual(getArtworkScene(new Date(2026, 6, 16, 8)), today);
});
