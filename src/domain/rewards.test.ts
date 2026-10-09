import assert from 'node:assert/strict';
import test from 'node:test';
import { getRewardSuggestion } from './rewards.ts';

test('reward suggestion waits for a chosen goal and never offers a disliked choice', () => {
  const preferences = { likes: ['喝一杯喜欢的茶', '刷短视频'], dislikes: ['刷短视频'], lowGoal: 2, highGoal: 4 };
  assert.equal(getRewardSuggestion(preferences, 1, '2026-08-08'), null);
  assert.equal(getRewardSuggestion(preferences, 2, '2026-08-08')?.body, '可以给自己：喝一杯喜欢的茶');
  assert.equal(getRewardSuggestion(preferences, 4, '2026-08-08')?.level, 'high');
});
