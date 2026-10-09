import assert from 'node:assert/strict';
import test from 'node:test';
import { createBehaviorRecipeDraftFromAi, createCaptureBatchDraftFromAi, createHistoryReviewFromAi, createReplanProposalFromAi, createResumePointDraftFromAi, createSimplifyDraftFromAi } from './aiResponse.ts';

test('AI capture response becomes a source-grounded batch', () => {
  const draft = createCaptureBatchDraftFromAi({ items: [
    { title: '给妈妈打电话', sourceExcerpt: '晚上给妈妈打电话', projectTitle: null, timing: 'today', section: 'wanted', durationMinutes: 15, deadline: null, timeSlot: 'evening' },
    { title: '修改简历', sourceExcerpt: '周五前把简历改完', projectTitle: null, timing: 'week', section: 'important', durationMinutes: null, deadline: null, timeSlot: 'anytime' },
  ] }, '晚上给妈妈打电话\n周五前把简历改完');
  assert.equal(draft?.items.length, 2);
  assert.equal(draft?.items[0]?.destination, 'today');
  assert.equal(draft?.items[0]?.duration, '15 分钟');
});

test('behavior recipe keeps the item intent and validates both action sizes', () => {
  const item = { id: 'move', title: '每天运动', duration: '30 分钟', section: 'wanted' as const };
  const draft = createBehaviorRecipeDraftFromAi({
    ordinaryAction: '在家跟着一首歌活动身体',
    ordinaryMinutes: 10,
    lowEnergyAction: '在床边随便跳一会儿',
    lowEnergyMinutes: 2,
  }, item, '换衣服再出门很麻烦，我喜欢听歌', 'gentle');
  assert.equal(draft?.intentTitle, '每天运动');
  assert.equal(draft?.lowEnergyMinutes, 2);
  assert.equal(createBehaviorRecipeDraftFromAi({ ordinaryAction: '活动一下', ordinaryMinutes: 5, lowEnergyAction: '活动一下', lowEnergyMinutes: 2 }, item, '不方便', 'supported'), null);
});

test('AI capture response rejects malformed dates', () => {
  const draft = createCaptureBatchDraftFromAi({ items: [{ title: '提交材料', sourceExcerpt: '月底交材料', projectTitle: null, timing: 'today', section: 'important', durationMinutes: null, deadline: '2026-02-30', timeSlot: 'anytime' }] }, '月底交材料');
  assert.equal(draft, null);
});

test('AI capture accepts a valid recurrence proposal and rejects malformed weekdays', () => {
  const base = { title: '散步', sourceExcerpt: '每天散步', projectTitle: null, timing: 'today', section: 'wanted', durationMinutes: 20, deadline: null, timeSlot: 'evening' };
  const accepted = createCaptureBatchDraftFromAi({ items: [{ ...base, recurrence: { frequency: 'daily' } }] }, '每天散步');
  assert.equal(accepted?.items[0]?.recurrence?.frequency, 'daily');
  assert.match(accepted?.items[0]?.recurrenceSuggestion ?? '', /要不要/);
  const rejected = createCaptureBatchDraftFromAi({ items: [{ ...base, recurrence: { frequency: 'weekly', weekdays: [] } }] }, '每天散步');
  assert.equal(rejected, null);
});

test('AI capture rejects invented sources and more than eight items', () => {
  const invented = createCaptureBatchDraftFromAi({ items: [{ title: '预约体检', sourceExcerpt: '预约体检', projectTitle: null, timing: 'today', section: 'wanted', durationMinutes: null, deadline: null, timeSlot: 'anytime' }] }, '今天买猫粮');
  assert.equal(invented, null);
  const tooMany = { items: Array.from({ length: 9 }, (_, index) => ({ title: `事情${index}`, sourceExcerpt: '事情', projectTitle: null, timing: 'someday', section: 'wanted', durationMinutes: null, deadline: null, timeSlot: 'anytime' })) };
  assert.equal(createCaptureBatchDraftFromAi(tooMany, '事情'), null);
});

test('AI capture keeps one next step attached to its complex goal', () => {
  const draft = createCaptureBatchDraftFromAi({ items: [{ title: '列出搬家日期', sourceExcerpt: '准备搬家', projectTitle: '准备搬家', timing: 'someday', section: 'wanted', durationMinutes: 10, deadline: null, timeSlot: 'anytime' }] }, '准备搬家');
  assert.equal(draft?.items[0]?.projectTitle, '准备搬家');
  assert.equal(draft?.items[0]?.title, '列出搬家日期');
});

test('AI capture preserves only user-authored remaining steps for an explicit sequence', () => {
  const input = '分三步：选定某个岗位，在招聘软件上搜索多个高薪该岗位；分析岗位所需要的技能与条件；将得出来的结论与自己的简历对比，查缺补漏。';
  const draft = createCaptureBatchDraftFromAi({ items: [{
    title: '选定岗位并搜索多个高薪岗位',
    sourceExcerpt: input,
    projectTitle: '岗位与简历差距分析',
    remainingSteps: [
      { title: '分析岗位所需要的技能与条件', durationMinutes: 20 },
      { title: '将结论与简历对比，查缺补漏', durationMinutes: 30 },
    ],
    timing: 'today',
    section: 'wanted',
    durationMinutes: 20,
    deadline: null,
    timeSlot: 'anytime',
    recurrence: null,
  }] }, input);
  assert.equal(draft?.items[0]?.remainingSteps?.length, 2);
  assert.equal(draft?.items[0]?.destination, 'today');
});

test('AI replan keeps deadline tasks and rejects unknown task ids', () => {
  const items = [
    { id: 'deadline', title: '提交材料', duration: '20 分钟', section: 'important' as const, deadline: '2026-07-15' },
    { id: 'later', title: '整理桌面', duration: '20 分钟', section: 'optional' as const },
  ];
  assert.equal(createReplanProposalFromAi({ changes: [{ itemId: 'deadline', action: 'keep' }, { itemId: 'later', action: 'tomorrow' }] }, items, '今天被耽误了', 'light')?.changes[1]?.kind, 'later');
  assert.equal(createReplanProposalFromAi({ changes: [{ itemId: 'missing', action: 'keep' }, { itemId: 'later', action: 'tomorrow' }] }, items, '今天被耽误了', 'light'), null);
});

test('AI replan cannot keep more flexible work than the remaining time', () => {
  const items = [
    { id: 'one', title: '整理桌面', duration: '30 分钟', durationMinutes: 30, section: 'wanted' as const },
    { id: 'two', title: '整理照片', duration: '30 分钟', durationMinutes: 30, section: 'optional' as const },
  ];
  const oversized = createReplanProposalFromAi({ changes: [{ itemId: 'one', action: 'keep' }, { itemId: 'two', action: 'keep' }] }, items, '我现在只剩 30 分钟', 'steady');
  assert.equal(oversized, null);
});

test('AI simplification accepts only a short concrete step sequence', () => {
  const item = { id: 'move', title: '准备搬家', duration: '时间还没定', section: 'wanted' as const };
  const draft = createSimplifyDraftFromAi({ steps: [
    { title: '列出三个可搬家的日期', durationMinutes: 10 },
    { title: '问房东退租时间', durationMinutes: 5 },
  ] }, item);
  assert.equal(draft?.steps[0]?.title, '列出三个可搬家的日期');
  assert.equal(createSimplifyDraftFromAi({ steps: [{ title: '准备搬家', durationMinutes: 90 }] }, item), null);
});

test('AI replan preserves project continuation when moving a step', () => {
  const items = [{
    id: 'step',
    title: '问房东退租时间',
    duration: '5 分钟',
    section: 'wanted' as const,
    projectTitle: '准备搬家',
    remainingSteps: [{ title: '确认搬家公司', durationMinutes: 15 }],
  }];
  const proposal = createReplanProposalFromAi({ changes: [{ itemId: 'step', action: 'tomorrow' }] }, items, '今天没时间了', 'light');
  assert.equal(proposal?.returnedIdeas[0]?.projectTitle, '准备搬家');
  assert.equal(proposal?.returnedIdeas[0]?.remainingSteps?.length, 1);
});

test('AI resume point keeps the selected status and rejects an invented waiting state', () => {
  const item = { id: 'form', title: '提交报名表', duration: '20 分钟', section: 'wanted' as const };
  const draft = createResumePointDraftFromAi({ status: 'in_progress', progressSummary: '照片已经准备好', nextAction: '上传照片', waitingFor: null }, item, 'in_progress');
  assert.equal(draft?.nextAction, '上传照片');
  assert.equal(createResumePointDraftFromAi({ status: 'waiting', progressSummary: '做到一半', nextAction: '继续填写', waitingFor: '老师回复' }, item, 'in_progress'), null);
});

test('AI history review can only cite records from the selected range payload', () => {
  const entries = [{ id: 'done-1', itemTitle: '整理简历', date: '2026-08-08', outcome: 'done' as const }];
  const review = createHistoryReviewFromAi({ summary: '这段时间完成了简历整理。', observations: ['记录集中在求职准备。'], mentionedEntryIds: ['done-1'], question: '接下来最想延续哪一部分？' }, entries);
  assert.equal(review?.mentionedEntryIds[0], 'done-1');
  assert.equal(createHistoryReviewFromAi({ summary: '内容', observations: [], mentionedEntryIds: ['invented'], question: null }, entries), null);
});
