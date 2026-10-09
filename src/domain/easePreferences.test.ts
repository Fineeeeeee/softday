import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultEasePreferences, getEasePreferencesSummary, getSimplifyPreference, getSmallStartMinutes, isEasePreferences } from './easePreferences.ts';

test('minimum start follows explicit preference without inventing a profile', () => {
  assert.equal(getSmallStartMinutes(defaultEasePreferences), 5);
  assert.equal(getSmallStartMinutes({ ...defaultEasePreferences, startStyle: 'tiny' }), 2);
  assert.equal(getSmallStartMinutes({ ...defaultEasePreferences, friction: 'tired' }), 2);
});

test('only task-start preferences are sent for simplification', () => {
  const value = { wantMore: '阅读', wantLess: '刷手机', friction: 'unclear' as const, startStyle: 'prepare' as const };
  assert.deepEqual(getSimplifyPreference(value), { friction: 'unclear', startStyle: 'prepare' });
  assert.equal(getEasePreferencesSummary(value), '先把环境准备好');
});

test('ease preference validation stays small and explicit', () => {
  assert.equal(isEasePreferences(defaultEasePreferences), true);
  assert.equal(isEasePreferences({ ...defaultEasePreferences, wantMore: 'x'.repeat(81) }), false);
  assert.equal(isEasePreferences({ ...defaultEasePreferences, friction: 'always_lazy' }), false);
});
