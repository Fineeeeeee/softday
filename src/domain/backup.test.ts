import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackupText, mergeBackupPayload, parseBackupText } from './backup.ts';

const validPayload = {
  plan: [{ id: 'a', title: '一件事', duration: '20 分钟', section: 'wanted' as const, recurrence: { frequency: 'weekdays' as const }, recurrenceSeriesId: 'series-a', resumePoint: { status: 'in_progress' as const, progressSummary: '做到一半', nextAction: '继续下一段', recordedAt: '2026-07-14T20:10:00.000Z' } }],
  ideas: [{ id: 'b', title: '提交报名表', context: '这周 · 来自 报名.md', deadline: '2026-07-20', timeSlot: 'morning' as const, section: 'important' as const, sourceName: '报名.md', sourceExcerpt: '请在 7 月 20 日前提交报名表。', afterTitle: '准备证件照' }],
  capacity: 'steady' as const,
  history: [{ id: 'h', itemTitle: '一件事', date: '2026-07-14', occurredAt: '2026-07-14T20:30:00.000Z', projectTitle: '准备材料', outcome: 'removed' as const, observedSlot: 'evening' as const, plannedSlot: 'afternoon' as const, durationMinutes: 30, dayLoadMinutes: 120, capacity: 'steady' as const }],
  preferences: { preferredFocusSlot: 'morning' as const, keepEveningLight: true, maxImportantItems: 2, reminderLevel: 'balanced' as const },
  rewardPreferences: { likes: ['散步'], dislikes: ['熬夜'], lowGoal: 2, highGoal: 4 },
  easePreferences: { wantMore: '阅读', wantLess: '刷手机', friction: 'unclear' as const, startStyle: 'tiny' as const },
};

test('backup text round-trips valid local data', () => {
  const parsed = parseBackupText(createBackupText(validPayload));
  assert.equal(parsed?.plan[0]?.title, '一件事');
  assert.equal(parsed?.history[0]?.outcome, 'removed');
  assert.equal(parsed?.history[0]?.observedSlot, 'evening');
  assert.equal(parsed?.ideas[0]?.sourceName, '报名.md');
  assert.equal(parsed?.ideas[0]?.deadline, '2026-07-20');
  assert.equal(parsed?.plan[0]?.resumePoint?.nextAction, '继续下一段');
  assert.equal(parsed?.history[0]?.occurredAt, '2026-07-14T20:30:00.000Z');
  assert.equal(parsed?.plan[0]?.recurrence?.frequency, 'weekdays');
  assert.deepEqual(parsed?.rewardPreferences.likes, ['散步']);
  assert.equal(parsed?.easePreferences.startStyle, 'tiny');
});

test('version one backups remain readable with neutral reward defaults', () => {
  const legacy = JSON.parse(createBackupText(validPayload));
  legacy.version = 1;
  delete legacy.rewardPreferences;
  assert.deepEqual(parseBackupText(JSON.stringify(legacy))?.rewardPreferences, { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 });
  assert.equal(parseBackupText(JSON.stringify(legacy))?.easePreferences.startStyle, 'unspecified');
});

test('version two backups remain readable with neutral ease preferences', () => {
  const legacy = JSON.parse(createBackupText(validPayload));
  legacy.version = 2;
  delete legacy.easePreferences;
  assert.equal(parseBackupText(JSON.stringify(legacy))?.easePreferences.friction, 'unspecified');
});

test('backup parser rejects malformed recurrence rules', () => {
  const malformed = JSON.parse(createBackupText(validPayload));
  malformed.plan[0].recurrence = { frequency: 'weekly', weekdays: [] };
  assert.equal(parseBackupText(JSON.stringify(malformed)), null);
});

test('backup parser rejects invalid imported task metadata', () => {
  const text = createBackupText(validPayload).replace('2026-07-20', '2026-02-31');
  assert.equal(parseBackupText(text), null);
});

test('backup parser rejects structurally incomplete content', () => {
  assert.equal(parseBackupText('{"version":1,"plan":[]}'), null);
  assert.equal(parseBackupText('not json'), null);
});

test('backup merge adds new records without replacing local records or duplicating imports', () => {
  const local = {
    plan: [{ id: 'local-plan', title: '保留本机任务', duration: '20 分钟', section: 'wanted' as const, date: '2026-08-08' }],
    ideas: [{ id: 'local-idea', title: '保留本机想法', context: '本机' }],
    history: [{ id: 'local-history', itemTitle: '已经做过', date: '2026-08-08', outcome: 'done' as const }],
  };
  const incoming = {
    plan: [local.plan[0]!, { id: 'imported-plan', title: '另一台设备的任务', duration: '30 分钟', section: 'important' as const, date: '2026-08-08' }],
    ideas: [{ id: 'imported-idea', title: '另一台设备的想法', context: '导入' }],
    history: [{ id: 'imported-history', itemTitle: '另一台做过的事', date: '2026-08-07', outcome: 'done' as const }],
    capacity: validPayload.capacity,
    preferences: validPayload.preferences,
    rewardPreferences: validPayload.rewardPreferences,
    easePreferences: validPayload.easePreferences,
  };
  const merged = mergeBackupPayload(local, incoming);
  assert.deepEqual(merged.added, { plan: 1, ideas: 1, history: 1 });
  assert.equal(merged.skipped, 1);
  assert.equal(merged.plan.some((item) => item.id === 'local-plan'), true);
  assert.equal(merged.plan.some((item) => item.id === 'imported-plan'), true);
  assert.equal(merged.adoptedSettings, null);
});

test('an empty device adopts non-secret backup preferences after preview', () => {
  const merged = mergeBackupPayload(
    { plan: [], ideas: [], history: [] },
    { plan: [], ideas: [], history: [], capacity: 'light', preferences: validPayload.preferences, rewardPreferences: validPayload.rewardPreferences, easePreferences: validPayload.easePreferences },
  );
  assert.deepEqual(merged.adoptedSettings, { capacity: 'light', preferences: validPayload.preferences, rewardPreferences: validPayload.rewardPreferences, easePreferences: validPayload.easePreferences });
});
