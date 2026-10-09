import assert from 'node:assert/strict';
import test from 'node:test';
import { addLocalRecurrenceSuggestions, createCaptureCommit, filterNewCaptureDrafts, parseCapture, parseCaptureBatch } from './parseCapture.ts';

test('capture extracts today, importance, duration and afternoon slot', () => {
  const draft = parseCapture('今天下午必须提交报销，大约 20 分钟');
  assert.equal(draft.destination, 'today');
  assert.equal(draft.section, 'important');
  assert.equal(draft.durationMinutes, 20);
  assert.equal(draft.timeSlot, 'afternoon');
  assert.equal(draft.title, '提交报销');
});

test('capture keeps a weekly idea out of today', () => {
  const draft = parseCapture('这周找时间理发');
  assert.equal(draft.destination, 'ideas');
  assert.equal(draft.timing, 'week');
});

test('capture reads a relative deadline', () => {
  const draft = parseCapture('材料明天截止，预计 30 分钟');
  assert.match(draft.deadline ?? '', /^\d{4}-\d{2}-\d{2}$/);
});

test('capture recognizes an explicit daily task but keeps it confirmable', () => {
  const draft = parseCapture('每天晚上散步 20 分钟');
  assert.equal(draft.title, '散步');
  assert.equal(draft.destination, 'today');
  assert.deepEqual(draft.recurrence, { frequency: 'daily' });
  assert.match(draft.recurrenceSuggestion ?? '', /要不要/);
});

test('local history can suggest recurrence without changing an explicit choice', () => {
  const history = ['2026-07-25', '2026-07-26', '2026-07-27'].map((date, index) => ({ id: String(index), itemTitle: '散步', date, outcome: 'done' as const }));
  const [suggested] = addLocalRecurrenceSuggestions([parseCapture('散步')], history, new Date('2026-07-29T12:00:00'));
  assert.equal(suggested?.recurrence, undefined);
  assert.equal(suggested?.recurrenceProposal?.frequency, 'daily');
  assert.match(suggested?.recurrenceSuggestion ?? '', /要不要/);
});

test('local capture keeps multiple lines as one confirmable batch', () => {
  const batch = parseCaptureBatch('今天下午买猫粮\n明天给妈妈打电话；有空整理照片');
  assert.equal(batch.items.length, 3);
  assert.equal(batch.items[0]?.destination, 'today');
  assert.equal(batch.items[1]?.timing, 'tomorrow');
  assert.equal(batch.items[2]?.section, 'optional');
});

test('capture opened from Today keeps unspecified tasks in Today', () => {
  const batch = parseCaptureBatch('选定一个岗位；分析岗位需要的技能；和简历对比', 'today');
  assert.deepEqual(batch.items.map((item) => item.destination), ['today', 'today', 'today']);
});

test('local capture limits a batch to eight items', () => {
  const batch = parseCaptureBatch(Array.from({ length: 10 }, (_, index) => `事情 ${index}`).join('\n'));
  assert.equal(batch.items.length, 8);
});

test('batch capture removes repeated and already stored titles', () => {
  const batch = parseCaptureBatch('今天买猫粮\n今天买猫粮\n明天取快递');
  const fresh = filterNewCaptureDrafts(batch.items, ['买猫粮']);
  assert.deepEqual(fresh.map((item) => item.title), ['取快递']);
});

test('batch capture commits today and later items with their context intact', () => {
  const batch = parseCaptureBatch('今天下午买猫粮\n明天准备搬家');
  batch.items[1] = { ...batch.items[1]!, title: '列出搬家日期', projectTitle: '准备搬家' };
  const commit = createCaptureCommit(batch.items, new Date('2026-07-29T12:00:00'));
  assert.equal(commit.planItems[0]?.detail, '今天下午买猫粮');
  assert.equal(commit.ideaItems[0]?.availableOn, '2026-07-30');
  assert.equal(commit.ideaItems[0]?.projectTitle, '准备搬家');
  assert.equal(commit.ideaItems[0]?.sourceExcerpt, '明天准备搬家');
});

test('capture commit preserves explicit remaining project steps', () => {
  const draft = parseCapture('今天选定一个岗位');
  draft.projectTitle = '岗位与简历差距分析';
  draft.remainingSteps = [
    { title: '分析岗位需要的技能', durationMinutes: 20 },
    { title: '和简历对比查缺补漏', durationMinutes: 30 },
  ];
  const commit = createCaptureCommit([draft], new Date('2026-08-08T12:00:00'));
  assert.equal(commit.planItems[0]?.remainingSteps?.length, 2);
});

test('capture commit preserves a confirmed recurrence rule and series identity', () => {
  const draft = parseCapture('每天散步');
  const commit = createCaptureCommit([draft], new Date('2026-07-29T12:00:00'));
  assert.equal(commit.planItems[0]?.recurrence?.frequency, 'daily');
  assert.match(commit.planItems[0]?.recurrenceSeriesId ?? '', /^capture-series-/);
});
