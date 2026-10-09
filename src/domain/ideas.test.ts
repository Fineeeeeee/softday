import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIdeaReturnChoice, getIdeaDisplayMeta, getIdeaReturnChoice, groupIdeasForDisplay } from './ideas.ts';

const idea = { id: 'a', title: '读一会儿书', context: '之前留下', timing: 'someday' as const, durationMinutes: 20 };

test('tomorrow return choice changes real scheduling fields', () => {
  const scheduled = applyIdeaReturnChoice(idea, 'tomorrow', new Date(2026, 7, 19, 12));
  assert.equal(scheduled.availableOn, '2026-08-20');
  assert.equal(scheduled.timing, 'tomorrow');
  assert.equal(getIdeaReturnChoice(scheduled), 'tomorrow');
});

test('quiet return choices clear stale dates', () => {
  const dated = { ...idea, timing: 'tomorrow' as const, availableOn: '2026-08-20' };
  assert.equal(applyIdeaReturnChoice(dated, 'free').availableOn, undefined);
  assert.equal(applyIdeaReturnChoice(dated, 'someday').context, '暂时收起');
});

test('idea groups use typed timing instead of display copy', () => {
  const misleading = { ...idea, id: 'later', context: '明天两个字只是备注', timing: 'someday' as const };
  const upcoming = { ...idea, id: 'soon', context: '普通备注', timing: 'week' as const };
  const groups = groupIdeasForDisplay([misleading, upcoming]);
  assert.deepEqual(groups.upcoming.map((item) => item.id), ['soon']);
  assert.deepEqual(groups.later.map((item) => item.id), ['later']);
});

test('idea metadata hides generic storage copy', () => {
  assert.equal(getIdeaDisplayMeta(idea), '20 分钟');
  assert.equal(getIdeaDisplayMeta({ ...idea, availableOn: '2026-08-20', sourceName: '计划.txt' }), '8月20日再看看 · 来自 计划.txt');
});

test('an existing explicit return date stays visible as a scheduled choice', () => {
  assert.equal(getIdeaReturnChoice({ ...idea, availableOn: '2026-08-24' }), 'week');
});
