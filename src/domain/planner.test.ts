import assert from 'node:assert/strict';
import test from 'node:test';
import { applySimplifyDraft, buildReminders, createFollowingStep, deferPlanItem, findCurrentFocus, findPlanConflicts, findResurfaceIdea, formatDeadlineLabel, generatePlanSuggestion, generateReplanProposal, getDeadlineNotificationDate, inferRemainingMinutes, isDateKey, prepareDailyTransition, promoteDueIdeas, simplifyPlanItem, startForMinutes, suggestDeferDestination } from './planner.ts';
import type { HabitProfile, IdeaItem, PlanItem, UserPreferences } from '../types/index.ts';

const preferences: UserPreferences = {
  preferredFocusSlot: 'morning',
  keepEveningLight: true,
  maxImportantItems: 2,
  reminderLevel: 'balanced',
};

test('deadline labels stay short without hiding the date', () => {
  assert.equal(formatDeadlineLabel('2026-07-15', new Date('2026-07-13T12:00:00')), '7月15日前');
  assert.equal(formatDeadlineLabel('2027-01-02', new Date('2026-07-13T12:00:00')), '2027年1月2日前');
});

test('deadline notifications prefer the previous morning and never schedule in the past', () => {
  assert.equal(getDeadlineNotificationDate('2026-07-15', new Date('2026-07-13T12:00:00'))?.toISOString(), new Date(2026, 6, 14, 9).toISOString());
  assert.equal(getDeadlineNotificationDate('2026-07-15', new Date('2026-07-14T12:00:00'))?.toISOString(), new Date(2026, 6, 15, 9).toISOString());
  assert.equal(getDeadlineNotificationDate('2026-07-15', new Date('2026-07-15T10:00:00')), null);
});

test('plan suggestion respects light capacity and prefers this-week ideas', () => {
  const ideas: IdeaItem[] = [
    { id: 'later', title: '整理照片', context: '以后', timing: 'someday', durationMinutes: 60 },
    { id: 'week', title: '理发', context: '这周', timing: 'week', durationMinutes: 30 },
  ];
  const result = generatePlanSuggestion([], ideas, 'light', preferences);
  assert.equal(result.items[0]?.title, '理发');
  assert.equal(result.items.length, 2);
});

test('current focus prefers work already in progress, then deadlines and importance', () => {
  const items: PlanItem[] = [
    { id: 'important', title: '要紧', duration: '20 分钟', section: 'important' },
    { id: 'started', title: '已经开始', duration: '20 分钟', section: 'wanted', resumePoint: { status: 'in_progress', progressSummary: '做到一半', nextAction: '继续下一段', recordedAt: '2026-07-20T12:00:00.000Z' } },
  ];
  assert.equal(findCurrentFocus(items)?.id, 'started');
  assert.equal(findCurrentFocus(items, { itemId: 'important', startedAt: '2026-07-23T12:00:00.000Z' })?.id, 'important');
});

test('plan suggestion does not overfill remaining capacity', () => {
  const plan: PlanItem[] = [{ id: 'fixed', title: '已有安排', duration: '70 分钟', durationMinutes: 70, section: 'important' }];
  const ideas: IdeaItem[] = [{ id: 'long', title: '长事情', context: '这周', timing: 'week', durationMinutes: 30 }];
  const result = generatePlanSuggestion(plan, ideas, 'light', preferences);
  assert.equal(result.items.length, 0);
});

test('plan suggestion uses a learned slot only when manual timing is open', () => {
  const openPreferences = { ...preferences, preferredFocusSlot: 'anytime' as const, keepEveningLight: false };
  const habit: HabitProfile = { status: 'ready', refreshedOn: '2026-07-15', sampleCount: 12, preferredSlot: 'evening', pace: 'steady', prefersShorterStarts: false, summary: '最近晚上更容易顾上事情。' };
  const result = generatePlanSuggestion([], [{ id: 'read', title: '看一会书', context: '这周', timing: 'week', durationMinutes: 20 }], 'steady', openPreferences, habit);
  assert.equal(result.items[0]?.timeSlot, 'evening');
  assert.match(result.note, /晚上/);
});

test('manual evening-light preference outranks a learned evening rhythm', () => {
  const openPreferences = { ...preferences, preferredFocusSlot: 'anytime' as const, keepEveningLight: true };
  const habit: HabitProfile = { status: 'ready', refreshedOn: '2026-07-15', sampleCount: 12, preferredSlot: 'evening', pace: 'steady', prefersShorterStarts: false, summary: '最近晚上更容易顾上事情。' };
  const result = generatePlanSuggestion([], [{ id: 'read', title: '看一会书', context: '这周', timing: 'week', durationMinutes: 20 }], 'steady', openPreferences, habit);
  assert.equal(result.items[0]?.timeSlot, 'anytime');
});

test('plan suggestion keeps explicit timing and importance from an imported idea', () => {
  const idea: IdeaItem = {
    id: 'imported',
    title: '提交报名表',
    context: '这周 · 来自 报名.md',
    timing: 'week',
    durationMinutes: 20,
    deadline: '2026-07-20',
    timeSlot: 'afternoon',
    section: 'important',
  };
  const planned = generatePlanSuggestion([], [idea], 'steady', preferences).items[0];
  assert.equal(planned?.deadline, '2026-07-20');
  assert.equal(planned?.timeSlot, 'afternoon');
  assert.equal(planned?.section, 'important');
});

test('planned imported work keeps its source excerpt and order note', () => {
  const idea: IdeaItem = { id: 'source', title: '提交报名表', context: '这周 · 来自 报名.md', sourceExcerpt: '请先准备证件照，再提交报名表。', afterTitle: '准备证件照', durationMinutes: 20 };
  const planned = generatePlanSuggestion([], [idea], 'steady', preferences).items[0];
  assert.match(planned?.detail ?? '', /来自 报名\.md/);
  assert.match(planned?.detail ?? '', /接在“准备证件照”之后/);
  assert.match(planned?.detail ?? '', /请先准备证件照/);
});

test('an idea saved for tomorrow is not scheduled early', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const ideas: IdeaItem[] = [{ id: 'later', title: '明天的事', context: '明天', timing: 'tomorrow', durationMinutes: 20, availableOn: dateKey }];
  assert.equal(generatePlanSuggestion([], ideas, 'steady', preferences).items.length, 0);
});

test('a tomorrow idea moves into Today when its date arrives without pulling snoozed ideas', () => {
  const ideas: IdeaItem[] = [
    { id: 'tomorrow', title: '明天的事', context: '明天', timing: 'tomorrow', availableOn: '2026-08-08', durationMinutes: 20 },
    { id: 'snoozed', title: '以后再看', context: '有空时', timing: 'someday', availableOn: '2026-08-08', durationMinutes: 20 },
  ];
  const result = promoteDueIdeas([], ideas, '2026-08-08');
  assert.deepEqual(result.plan.map((item) => item.title), ['明天的事']);
  assert.deepEqual(result.ideas.map((item) => item.title), ['以后再看']);
  assert.equal(result.plan[0]?.date, '2026-08-08');
});

test('conflict check notices a crowded time slot', () => {
  const items: PlanItem[] = [
    { id: 'a', title: 'A', duration: '120 分钟', section: 'wanted', timeSlot: 'evening' },
    { id: 'b', title: 'B', duration: '90 分钟', section: 'wanted', timeSlot: 'evening' },
  ];
  assert.match(findPlanConflicts(items)[0] ?? '', /晚上/);
});

test('simplifying the same item twice does not stack prefixes', () => {
  const item: PlanItem = { id: 'a', title: '准备搬家', duration: '时间还没定', section: 'wanted' };
  const simplified = simplifyPlanItem(simplifyPlanItem(item));
  assert.equal(simplified.title, '确定一个大致搬家日期');
  assert.equal(simplified.projectTitle, '准备搬家');
});

test('minimum start keeps the original task as a continuing project', () => {
  const item: PlanItem = { id: 'hard', title: '整理房间', duration: '1 小时', durationMinutes: 60, section: 'wanted' };
  const started = startForMinutes(item, 2);
  assert.equal(started.title, '整理房间');
  assert.equal(started.durationMinutes, 2);
  assert.equal(started.projectTitle, '整理房间');
});

test('starting again clears a waiting point but keeps real in-progress context', () => {
  const item: PlanItem = { id: 'resume', title: '确认出行时间', duration: '20 分钟', section: 'wanted' };
  const waiting = startForMinutes({ ...item, waitingFor: '朋友回复', resumePoint: { status: 'waiting', progressSummary: '在等朋友回复', nextAction: '确认时间', waitingFor: '朋友回复', recordedAt: '2026-07-20T10:00:00.000Z' } }, 5);
  assert.equal(waiting.waitingFor, undefined);
  assert.equal(waiting.resumePoint, undefined);

  const inProgress = startForMinutes({ ...item, resumePoint: { status: 'in_progress', progressSummary: '已经列好提纲', nextAction: '写第一段', recordedAt: '2026-07-20T10:00:00.000Z' } }, 5);
  assert.equal(inProgress.resumePoint?.nextAction, '写第一段');
});

test('deferred work gets a real return date without changing the task content', () => {
  const item: PlanItem = { id: 'later', title: '整理照片', duration: '30 分钟', durationMinutes: 30, section: 'wanted' };
  const now = new Date(2026, 6, 15, 12);
  const tomorrow = deferPlanItem(item, 'tomorrow', now);
  const weekend = deferPlanItem(item, 'weekend', now);
  assert.equal(tomorrow.availableOn, '2026-07-16');
  assert.equal(weekend.availableOn, '2026-07-18');
  assert.equal(weekend.title, item.title);
});

test('default defer choice protects important work without asking another question', () => {
  const important: PlanItem = { id: 'important', title: '交材料', duration: '20 分钟', section: 'important' };
  const wanted: PlanItem = { id: 'wanted', title: '整理照片', duration: '30 分钟', section: 'wanted' };
  assert.equal(suggestDeferDestination(important), 'tomorrow');
  assert.equal(suggestDeferDestination(wanted), 'free');
});

test('resurfacing waits for its date and only shows free-time work on an open day', () => {
  const dated: IdeaItem = { id: 'dated', title: '买花', context: '明天再看看', timing: 'tomorrow', availableOn: '2026-07-16' };
  const free: IdeaItem = { id: 'free', title: '整理相册', context: '有空时再看看', timing: 'someday' };
  assert.equal(findResurfaceIdea([dated, free], 'steady', [], '2026-07-15'), undefined);
  assert.equal(findResurfaceIdea([dated, free], 'open', [], '2026-07-15')?.id, 'free');
  assert.equal(findResurfaceIdea([dated, free], 'steady', [], '2026-07-16')?.id, 'dated');
});

test('following step keeps its parent project', () => {
  assert.equal(createFollowingStep('准备搬家').projectTitle, '准备搬家');
});

test('AI steps are revealed one at a time', () => {
  const item: PlanItem = { id: 'move', title: '准备搬家', duration: '时间还没定', section: 'wanted' };
  const simplified = applySimplifyDraft(item, { itemId: item.id, projectTitle: item.title, steps: [
    { title: '列出三个日期', durationMinutes: 10 },
    { title: '问房东退租时间', durationMinutes: 5 },
    { title: '确认搬家公司', durationMinutes: 15 },
  ] });
  assert.equal(simplified.title, '列出三个日期');
  const following = createFollowingStep(simplified.projectTitle ?? '', simplified.remainingSteps);
  assert.equal(following.title, '问房东退租时间');
  assert.deepEqual(following.remainingSteps, [{ title: '确认搬家公司', durationMinutes: 15 }]);
});

test('project continuation survives planning and replanning', () => {
  const projectIdea: IdeaItem = {
    id: 'project-step',
    title: '问房东退租时间',
    context: '准备搬家的下一步',
    durationMinutes: 5,
    projectTitle: '准备搬家',
    remainingSteps: [{ title: '确认搬家公司', durationMinutes: 15 }],
  };
  const planned = generatePlanSuggestion([], [projectIdea], 'steady', preferences).items[0];
  assert.equal(planned?.projectTitle, '准备搬家');
  const replanned = generateReplanProposal([{ ...planned!, durationMinutes: 300, section: 'wanted' }], '今天只剩 10 分钟', 'light');
  assert.equal(replanned.returnedIdeas[0]?.remainingSteps?.[0]?.title, '确认搬家公司');
});

test('reminders surface near deadlines without judgement copy', () => {
  const items: PlanItem[] = [{ id: 'a', title: '提交材料', duration: '20 分钟', section: 'important', deadline: '2026-07-14' }];
  const reminders = buildReminders(items, new Date('2026-07-13T12:00:00'));
  assert.equal(reminders[0]?.kind, 'deadline');
  assert.equal(reminders[0]?.body, '1 天后需要完成');
  assert.doesNotMatch(reminders[0]?.body ?? '', /失败|逾期/);
});

test('replan proposal keeps a real important item and never invents titles', () => {
  const items: PlanItem[] = [
    { id: 'must', title: '给房东回消息', duration: '20 分钟', durationMinutes: 20, section: 'important' },
    { id: 'optional', title: '整理书架', duration: '90 分钟', durationMinutes: 90, section: 'optional' },
  ];
  const proposal = generateReplanProposal(items, '睡过头了', 'steady');
  assert.equal(proposal.changes[0]?.title, '给房东回消息');
  assert.equal(proposal.changes.some((change) => change.title === '提交报销材料'), false);
  assert.equal(proposal.returnedIdeas[0]?.title, '整理书架');
});

test('daily transition archives completed work and asks about unfinished work', () => {
  const items: PlanItem[] = [
    { id: 'done', title: '已经做完', duration: '10 分钟', section: 'wanted', done: true, date: '2026-07-12' },
    { id: 'left', title: '还没做', duration: '10 分钟', section: 'wanted', date: '2026-07-12' },
  ];
  const transition = prepareDailyTransition(items, '2026-07-13');
  assert.deepEqual(transition.archivedDone.map((item) => item.id), ['done']);
  assert.deepEqual(transition.carryover.map((item) => item.id), ['left']);
  assert.equal(transition.activePlan.some((item) => item.id === 'done'), false);
});

test('date validation rejects calendar dates that roll into another month', () => {
  assert.equal(isDateKey('2026-02-28'), true);
  assert.equal(isDateKey('2026-02-31'), false);
});

test('replan budget reads explicit remaining time and delays', () => {
  assert.equal(inferRemainingMinutes('今天只剩 45 分钟', 'open'), 45);
  assert.equal(inferRemainingMinutes('被临时的事耽误了 2 小时', 'steady'), 60);
  assert.equal(inferRemainingMinutes('今天很累', 'open'), 60);
});
