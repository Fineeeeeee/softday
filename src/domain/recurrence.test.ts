import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRecurringEdit, createNextRecurringIdea, createPausedRecurringIdea, nextRecurrenceDate, parseRecurrenceFromText, promoteDueRecurrences, recurrenceLabel, suggestRecurrenceFromHistory } from './recurrence.ts';
import type { HistoryEntry, PlanItem } from '../types/index.ts';

test('recurrence parser recognizes daily weekdays and selected weekdays', () => {
  assert.deepEqual(parseRecurrenceFromText('每天晚上散步'), { frequency: 'daily' });
  assert.deepEqual(parseRecurrenceFromText('工作日背单词'), { frequency: 'weekdays' });
  assert.deepEqual(parseRecurrenceFromText('每周一三五跑步'), { frequency: 'weekly', weekdays: [1, 3, 5] });
  assert.equal(recurrenceLabel({ frequency: 'weekly', weekdays: [1, 3, 5] }), '每周一、三、五');
});

test('next recurrence skips weekends and respects selected weekdays', () => {
  assert.equal(nextRecurrenceDate({ frequency: 'weekdays' }, '2026-07-31'), '2026-08-03');
  assert.equal(nextRecurrenceDate({ frequency: 'weekly', weekdays: [1, 4] }, '2026-07-30'), '2026-08-03');
});

test('completion creates one future idea and due promotion never backfills missed days', () => {
  const item: PlanItem = { id: 'walk', title: '散步', duration: '20 分钟', section: 'wanted', recurrence: { frequency: 'daily' }, recurrenceSeriesId: 'walk-series' };
  const idea = createNextRecurringIdea(item, '2026-07-29', new Date('2026-07-29T12:00:00'));
  assert.equal(idea?.availableOn, '2026-07-30');
  const promoted = promoteDueRecurrences([], [idea!], '2026-08-02');
  assert.equal(promoted.plan.length, 1);
  assert.equal(promoted.plan[0]?.date, '2026-08-02');
  assert.equal(promoted.ideas.length, 0);
});

test('a confirmed easier behavior stays with a recurring series', () => {
  const item: PlanItem = {
    id: 'move',
    title: '在家跟着一首歌活动身体',
    duration: '10 分钟',
    durationMinutes: 10,
    section: 'wanted',
    recurrence: { frequency: 'daily' },
    recurrenceSeriesId: 'move-series',
    behaviorRecipe: {
      intentTitle: '每天运动',
      ordinaryAction: '在家跟着一首歌活动身体',
      ordinaryMinutes: 10,
      lowEnergyAction: '在床边随便跳一会儿',
      lowEnergyMinutes: 2,
      frictionNote: '换衣服再出门麻烦',
      updatedAt: '2026-08-20T12:00:00.000Z',
    },
  };
  const next = createNextRecurringIdea(item, '2026-08-20', new Date('2026-08-20T12:00:00.000Z'));
  assert.equal(next?.title, '每天运动');
  assert.equal(next?.behaviorRecipe?.lowEnergyAction, '在床边随便跳一会儿');
  const promoted = promoteDueRecurrences([], next ? [next] : [], '2026-08-21');
  assert.equal(promoted.plan[0]?.title, '在家跟着一首歌活动身体');
  assert.equal(promoted.plan[0]?.behaviorRecipe?.ordinaryMinutes, 10);
});

test('a recurring item can pause without creating another active occurrence', () => {
  const item: PlanItem = { id: 'walk', title: '散步', duration: '20 分钟', section: 'wanted', recurrence: { frequency: 'daily' }, recurrenceSeriesId: 'walk-series' };
  const paused = createPausedRecurringIdea(item, '2026-08-05', new Date('2026-07-30T12:00:00'));
  assert.equal(paused?.availableOn, '2026-08-05');
  assert.equal(paused?.recurrenceSeriesId, 'walk-series');
  assert.equal(promoteDueRecurrences([], [paused!], '2026-08-04').plan.length, 0);
  assert.equal(promoteDueRecurrences([], [paused!], '2026-08-05').plan.length, 1);
});

test('editing only this occurrence keeps the following recurrence unchanged', () => {
  const original: PlanItem = { id: 'walk', title: '散步', duration: '20 分钟', section: 'wanted', recurrence: { frequency: 'daily' }, recurrenceSeriesId: 'walk-series' };
  const result = applyRecurringEdit(original, { ...original, title: '今天只走十分钟' }, 'once', '2026-07-30', new Date('2026-07-30T12:00:00'));
  assert.equal(result.item.recurrence, undefined);
  assert.equal(result.nextIdea?.title, '散步');
  assert.equal(result.nextIdea?.availableOn, '2026-07-31');
});

test('local habit hint waits for repeated evidence and stays optional', () => {
  const history: HistoryEntry[] = ['2026-07-25', '2026-07-26', '2026-07-27'].map((date, index) => ({ id: String(index), itemTitle: '散步', date, outcome: 'done' }));
  assert.equal(suggestRecurrenceFromHistory('散步', history.slice(0, 2), new Date('2026-07-29T12:00:00')), null);
  assert.equal(suggestRecurrenceFromHistory('散步', history, new Date('2026-07-29T12:00:00'))?.rule.frequency, 'daily');
});
