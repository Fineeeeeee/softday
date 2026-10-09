import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBehaviorRecipe, getRecommendedRecipeChoice, useLowEnergyRecipe } from './behaviorRecipe.ts';
import type { BehaviorRecipeDraft, PlanItem } from '../types/index.ts';

const item: PlanItem = { id: 'move', title: '每天运动', duration: '30 分钟', durationMinutes: 30, section: 'wanted' };
const draft: BehaviorRecipeDraft = {
  itemId: item.id,
  actionMode: 'gentle',
  intentTitle: '每天运动',
  ordinaryAction: '在家跟着一首歌活动身体',
  ordinaryMinutes: 10,
  lowEnergyAction: '在床边随便跳一会儿',
  lowEnergyMinutes: 2,
  frictionNote: '换衣服再出门很麻烦',
};

test('recent gentle mode recommends the low-energy action without labeling the person', () => {
  assert.equal(getRecommendedRecipeChoice('gentle'), 'lowEnergy');
  assert.equal(getRecommendedRecipeChoice('supported'), 'ordinary');
  assert.equal(getRecommendedRecipeChoice('flowing'), 'ordinary');
});

test('applying a recipe keeps the original intent and uses the recommended action', () => {
  const result = applyBehaviorRecipe(item, draft, undefined, new Date('2026-08-20T12:00:00.000Z'));
  assert.equal(result.title, '在床边随便跳一会儿');
  assert.equal(result.durationMinutes, 2);
  assert.equal(result.projectTitle, '每天运动');
  assert.equal(result.remainingSteps?.[0]?.title, '继续“每天运动”');
  assert.equal(result.behaviorRecipe?.ordinaryAction, '在家跟着一首歌活动身体');
});

test('a saved recipe can be reused locally on a harder day', () => {
  const ordinary = applyBehaviorRecipe(item, { ...draft, actionMode: 'flowing' }, 'ordinary');
  const low = useLowEnergyRecipe(ordinary);
  assert.equal(low.title, draft.lowEnergyAction);
  assert.equal(low.durationMinutes, draft.lowEnergyMinutes);
});

test('a recurring behavior counts the occurrence without inventing a continuation step', () => {
  const recurring = applyBehaviorRecipe({ ...item, recurrence: { frequency: 'daily' } }, draft, 'lowEnergy');
  assert.equal(recurring.remainingSteps, undefined);
  assert.equal(recurring.projectTitle, undefined);
});
