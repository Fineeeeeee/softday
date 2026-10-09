import assert from 'node:assert/strict';
import test from 'node:test';
import { claimInitialPendingAiJob, migrateLegacyState, parseSoftdaySnapshot, type SoftdayState } from './stateSnapshot.ts';

const initial: SoftdayState = {
  version: 7,
  hasStarted: false,
  capacity: 'steady',
  plan: [],
  ideas: [],
  preferences: { preferredFocusSlot: 'morning', keepEveningLight: true, maxImportantItems: 2, reminderLevel: 'balanced' },
  history: [],
  aiSettings: { endpoint: '', model: '' },
  pendingAiJob: null,
  historyReviews: [],
  activeFocus: null,
  focusNotificationEnabled: false,
  rewardPreferences: { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 },
  easePreferences: { wantMore: '', wantLess: '', friction: 'unspecified', startStyle: 'unspecified' },
};

test('legacy local keys migrate into one versioned snapshot', () => {
  const migrated = migrateLegacyState([
    ['softday.started', 'true'],
    ['softday.capacity', '"light"'],
    ['softday.plan', '[{"id":"a","title":"一件事","duration":"10 分钟","section":"wanted"}]'],
  ], initial);
  assert.equal(migrated?.hasStarted, true);
  assert.equal(migrated?.capacity, 'light');
  assert.equal(migrated?.plan[0]?.title, '一件事');
  assert.equal(parseSoftdaySnapshot(JSON.stringify(migrated))?.version, 7);
});

test('version two snapshots gain an empty focus session without losing data', () => {
  const previous = { ...initial, version: 2, activeFocus: undefined };
  const parsed = parseSoftdaySnapshot(JSON.stringify(previous));
  assert.equal(parsed?.version, 7);
  assert.equal(parsed?.activeFocus, null);
  assert.deepEqual(parsed?.plan, []);
});

test('version three snapshots upgrade without changing existing items', () => {
  const previous = { ...initial, version: 3, plan: [{ id: 'a', title: '散步', duration: '20 分钟', section: 'wanted' }] };
  const parsed = parseSoftdaySnapshot(JSON.stringify(previous));
  assert.equal(parsed?.version, 7);
  assert.equal(parsed?.plan[0]?.title, '散步');
  assert.equal(parsed?.plan[0]?.recurrence, undefined);
});

test('version four snapshots gain notification and reward defaults without losing data', () => {
  const previous = { ...initial, version: 4, focusNotificationEnabled: undefined, rewardPreferences: undefined };
  const parsed = parseSoftdaySnapshot(JSON.stringify(previous));
  assert.equal(parsed?.version, 7);
  assert.equal(parsed?.focusNotificationEnabled, false);
  assert.deepEqual(parsed?.rewardPreferences, { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 });
});

test('invalid reward thresholds fall back to small local defaults', () => {
  const parsed = parseSoftdaySnapshot(JSON.stringify({ ...initial, rewardPreferences: { likes: ['散步'], dislikes: [], lowGoal: 5, highGoal: 1 } }));
  assert.deepEqual(parsed?.rewardPreferences, { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 });
});

test('version five pending work migrates into the shared AI job slot', () => {
  const previous = { ...initial, version: 5, pendingAiJob: undefined, historyReviews: undefined, pendingAiAction: { mode: 'review', input: '', range: { start: '2026-08-01', end: '2026-08-08' } } };
  const parsed = parseSoftdaySnapshot(JSON.stringify(previous));
  assert.deepEqual(parsed?.pendingAiJob, { mode: 'review', range: { start: '2026-08-01', end: '2026-08-08' } });
  assert.deepEqual(parsed?.historyReviews, []);
});

test('version six snapshots gain neutral ease preferences without losing data', () => {
  const previous = { ...initial, version: 6, easePreferences: undefined };
  const parsed = parseSoftdaySnapshot(JSON.stringify(previous));
  assert.equal(parsed?.version, 7);
  assert.deepEqual(parsed?.easePreferences, { wantMore: '', wantLess: '', friction: 'unspecified', startStyle: 'unspecified' });
});

test('saved history reviews survive restart and malformed jobs are rejected', () => {
  const review = { range: { start: '2026-08-01', end: '2026-08-08' }, result: { summary: '做过一些事', observations: ['晚上有记录'], mentionedEntryIds: ['h'] }, createdAt: '2026-08-08T12:00:00.000Z' };
  assert.equal(parseSoftdaySnapshot(JSON.stringify({ ...initial, historyReviews: [review] }))?.historyReviews[0]?.result.summary, '做过一些事');
  assert.equal(parseSoftdaySnapshot(JSON.stringify({ ...initial, pendingAiJob: { mode: 'resume', itemId: 'a', selectedStatus: 'unknown', note: '' } })), null);
});

test('pending AI recovery is claimed once and ignores jobs started in the current session', () => {
  const emptyHydration = claimInitialPendingAiJob(true, false, null);
  assert.deepEqual(emptyHydration, { recoveryChecked: true, job: null });
  assert.equal(claimInitialPendingAiJob(true, emptyHydration.recoveryChecked, { mode: 'capture', input: '刚刚输入的事' }).job, null);

  const interrupted = { mode: 'capture' as const, input: '上次留下的事' };
  assert.deepEqual(claimInitialPendingAiJob(true, false, interrupted).job, interrupted);
});

test('focus sessions require a real item and timestamp', () => {
  assert.equal(parseSoftdaySnapshot(JSON.stringify({ ...initial, activeFocus: { itemId: 'a', startedAt: 'not-a-date' } })), null);
  assert.equal(parseSoftdaySnapshot(JSON.stringify({ ...initial, activeFocus: { itemId: 'a', startedAt: '2026-07-23T12:00:00.000Z' } }))?.activeFocus?.itemId, 'a');
});

test('malformed legacy data is not replaced by an empty snapshot', () => {
  assert.equal(migrateLegacyState([['softday.plan', 'not json']], initial), null);
});
