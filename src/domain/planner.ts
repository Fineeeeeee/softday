import type {
  DayCapacity,
  DeferDestination,
  FocusSession,
  HabitProfile,
  IdeaItem,
  PlanItem,
  PlanSuggestion,
  ReplanProposal,
  ReminderItem,
  SimpleStep,
  SimplifyDraft,
  UserPreferences,
} from '../types';

const capacityMinutes: Record<DayCapacity, number> = {
  light: 90,
  steady: 180,
  open: 300,
};

function sectionScore(item: PlanItem) {
  if (item.section === 'important') return 3;
  if (item.section === 'wanted') return 2;
  return 1;
}

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDeadlineLabel(dateKey: string, now = new Date()) {
  const [year = 0, month = 0, day = 0] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return `${dateKey} 前`;
  return year === now.getFullYear() ? `${month}月${day}日前` : `${year}年${month}月${day}日前`;
}

export function getDeadlineNotificationDate(dateKey: string, now = new Date()) {
  if (!isDateKey(dateKey)) return null;
  const [year = 0, month = 0, day = 0] = dateKey.split('-').map(Number);
  const deadlineMorning = new Date(year, month - 1, day, 9, 0, 0, 0);
  const dayBefore = new Date(deadlineMorning);
  dayBefore.setDate(dayBefore.getDate() - 1);
  if (dayBefore.getTime() > now.getTime()) return dayBefore;
  if (deadlineMorning.getTime() > now.getTime()) return deadlineMorning;
  return null;
}

export function durationFromLabel(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(分钟|小时)/);
  if (!match) return 30;
  const amount = Number(match[1]);
  return match[2] === '小时' ? Math.round(amount * 60) : Math.round(amount);
}

export function normalizePlan(items: PlanItem[]) {
  return items.map((item) => ({
    ...item,
    durationMinutes: item.durationMinutes ?? durationFromLabel(item.duration),
    timeSlot: item.timeSlot ?? 'anytime',
    attempts: item.attempts ?? 0,
    date: item.date ?? toDateKey(),
  }));
}

export function findCurrentFocus(items: PlanItem[], session: FocusSession | null = null) {
  const active = normalizePlan(items).filter((item) => !item.done && !item.waitingFor);
  return active.find((item) => item.id === session?.itemId)
    ?? active.find((item) => item.resumePoint?.status === 'in_progress')
    ?? active.find((item) => Boolean(item.deadline))
    ?? active.find((item) => item.section === 'important')
    ?? active.find((item) => item.section === 'wanted')
    ?? active[0];
}

export function normalizeIdeas(items: IdeaItem[]) {
  return items.map((item) => {
    const createdAt = item.createdAt ?? new Date().toISOString();
    const timing = item.timing ?? (item.context.includes('这周') ? 'week' : 'someday');
    let availableOn = item.availableOn;
    if (!availableOn && timing === 'tomorrow') {
      const date = new Date(createdAt);
      date.setDate(date.getDate() + 1);
      availableOn = toDateKey(date);
    }
    return { ...item, createdAt, timing, availableOn, durationMinutes: item.durationMinutes ?? 30 };
  });
}

export function formatIdeaDetail(idea: IdeaItem) {
  return [
    idea.context,
    idea.afterTitle ? `接在“${idea.afterTitle}”之后` : null,
    idea.sourceExcerpt ? `“${idea.sourceExcerpt}”` : null,
  ].filter(Boolean).join('\n');
}

export function prepareDailyTransition(items: PlanItem[], today = toDateKey()) {
  const normalized = normalizePlan(items);
  const archivedDone = normalized.filter((item) => item.done && item.date && item.date < today);
  const carryover = normalized.filter((item) => !item.done && item.date && item.date < today);
  const activePlan = normalized.filter((item) => !archivedDone.some((done) => done.id === item.id));
  return { activePlan, archivedDone, carryover };
}

export function promoteDueIdeas(plan: PlanItem[], ideas: IdeaItem[], today = toDateKey()) {
  const due = normalizeIdeas(ideas).filter((idea) => !idea.recurrence && idea.timing === 'tomorrow' && idea.availableOn && idea.availableOn <= today);
  if (!due.length) return { plan, ideas };
  const existingIds = new Set(plan.map((item) => item.id));
  const promoted = due
    .filter((idea) => !existingIds.has(`due-${idea.id}`))
    .map((idea): PlanItem => ({
      id: `due-${idea.id}`,
      title: idea.title,
      duration: idea.durationMinutes ? `${idea.durationMinutes} 分钟` : '时间还没定',
      durationMinutes: idea.durationMinutes,
      section: idea.section ?? 'wanted',
      detail: formatIdeaDetail(idea),
      deadline: idea.deadline,
      timeSlot: idea.timeSlot ?? 'anytime',
      date: today,
      attempts: 0,
      projectTitle: idea.projectTitle,
      remainingSteps: idea.remainingSteps,
      behaviorRecipe: idea.behaviorRecipe,
      resumePoint: idea.resumePoint,
    }));
  const dueIds = new Set(due.map((idea) => idea.id));
  return { plan: [...promoted, ...plan], ideas: ideas.filter((idea) => !dueIds.has(idea.id)) };
}

function ideaScore(idea: IdeaItem) {
  if (idea.availableOn && idea.availableOn <= toDateKey()) return 5;
  if (idea.timing === 'today') return 4;
  if (idea.timing === 'week') return 3;
  if (idea.timing === 'tomorrow') return 2;
  return 1;
}

export function generatePlanSuggestion(
  plan: PlanItem[],
  ideas: IdeaItem[],
  capacity: DayCapacity,
  preferences: UserPreferences,
  habitProfile?: HabitProfile,
): PlanSuggestion {
  const normalizedPlan = normalizePlan(plan).filter((item) => !item.done && !item.waitingFor);
  const usedMinutes = normalizedPlan.reduce((total, item) => total + (item.durationMinutes ?? 30), 0);
  let remaining = Math.max(0, capacityMinutes[capacity] - usedMinutes);
  const selected: PlanItem[] = [];
  const selectedIds: string[] = [];
  const inferredSlot = preferences.preferredFocusSlot === 'anytime' ? habitProfile?.preferredSlot : undefined;
  const preferredSlot = preferences.preferredFocusSlot === 'anytime' ? inferredSlot ?? 'anytime' : preferences.preferredFocusSlot;
  const suggestedSlot = preferences.keepEveningLight && preferredSlot === 'evening' ? 'anytime' : preferredSlot;
  const itemLimit = habitProfile?.status === 'ready' && habitProfile.pace === 'lighter' ? 2 : 3;

  const candidates = normalizeIdeas(ideas)
    .filter((idea) => !idea.availableOn || idea.availableOn <= toDateKey())
    .sort((left, right) => ideaScore(right) - ideaScore(left) || (left.durationMinutes ?? 30) - (right.durationMinutes ?? 30));

  for (const idea of candidates) {
    const minutes = idea.durationMinutes ?? 30;
    if (minutes > remaining || selected.length >= itemLimit) continue;
    selected.push({
      id: `planned-${idea.id}`,
      title: idea.title,
      duration: `${minutes} 分钟`,
      durationMinutes: minutes,
      section: idea.section ?? 'wanted',
      deadline: idea.deadline,
      timeSlot: idea.timeSlot && idea.timeSlot !== 'anytime' ? idea.timeSlot : suggestedSlot,
      detail: formatIdeaDetail(idea),
      projectTitle: idea.projectTitle,
      remainingSteps: idea.remainingSteps,
      resumePoint: idea.resumePoint,
      recurrence: idea.recurrence,
      recurrenceSeriesId: idea.recurrenceSeriesId,
      behaviorRecipe: idea.behaviorRecipe,
      attempts: 0,
      date: toDateKey(),
    });
    selectedIds.push(idea.id);
    remaining -= minutes;
  }

  const rhythmNote = inferredSlot && suggestedSlot === inferredSlot
    ? `最近${inferredSlot === 'morning' ? '上午' : inferredSlot === 'afternoon' ? '下午' : '晚上'}更容易顾上，这次先放在这个时段。`
    : habitProfile?.status === 'ready' && habitProfile.pace === 'lighter'
      ? '最近少放一点更顺，这次先留得轻一些。'
      : null;
  const note = selected.length && rhythmNote
    ? rhythmNote
    : selected.length
    ? `留了 ${remaining} 分钟余地，变化时不用全部重排。`
    : usedMinutes >= capacityMinutes[capacity]
      ? '今天已经装得差不多了，先不再加。'
      : '“想做”里暂时没有适合今天的事情。';

  return { items: selected, sourceIdeaIds: selectedIds, note };
}

export function deferPlanItem(item: PlanItem, destination: DeferDestination, now = new Date()): IdeaItem {
  const labels: Record<DeferDestination, string> = {
    tomorrow: '明天再看看',
    weekend: '周末再看看',
    free: '有空时再看看',
    someday: '暂时收起',
  };
  const timing = destination === 'tomorrow' ? 'tomorrow' : destination === 'weekend' ? 'week' : 'someday';
  let availableOn: string | undefined;
  if (destination === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    availableOn = toDateKey(tomorrow);
  } else if (destination === 'weekend') {
    const weekend = new Date(now);
    const daysUntilSaturday = (6 - weekend.getDay() + 7) % 7 || 7;
    weekend.setDate(weekend.getDate() + daysUntilSaturday);
    availableOn = toDateKey(weekend);
  }
  return {
    id: `deferred-${destination}-${item.id}-${now.getTime()}`,
    title: item.title,
    context: labels[destination],
    timing,
    durationMinutes: item.durationMinutes,
    createdAt: now.toISOString(),
    availableOn,
    projectTitle: item.projectTitle,
    remainingSteps: item.remainingSteps,
    resumePoint: item.resumePoint,
    recurrence: item.recurrence,
    recurrenceSeriesId: item.recurrenceSeriesId,
    behaviorRecipe: item.behaviorRecipe,
  };
}

export function suggestDeferDestination(item: PlanItem): DeferDestination {
  return item.deadline || item.section === 'important' ? 'tomorrow' : 'free';
}

export function findResurfaceIdea(ideas: IdeaItem[], capacity: DayCapacity, plan: PlanItem[], today = toDateKey()) {
  const dated = normalizeIdeas(ideas)
    .filter((idea) => Boolean(idea.availableOn && idea.availableOn <= today))
    .sort((left, right) => String(left.availableOn).localeCompare(String(right.availableOn)) || String(left.createdAt).localeCompare(String(right.createdAt)));
  if (dated[0]) return dated[0];
  const activeMinutes = normalizePlan(plan)
    .filter((item) => !item.done && !item.waitingFor)
    .reduce((sum, item) => sum + (item.durationMinutes ?? 30), 0);
  if (capacity !== 'open' || activeMinutes > 120) return undefined;
  return normalizeIdeas(ideas).find((idea) => idea.context === '有空时再看看' && (!idea.availableOn || idea.availableOn <= today));
}

export function findPlanConflicts(items: PlanItem[], maxImportantItems = 2) {
  const active = normalizePlan(items).filter((item) => !item.done && !item.waitingFor);
  const messages: string[] = [];
  const importantCount = active.filter((item) => item.section === 'important').length;
  if (importantCount > maxImportantItems) messages.push(`今天要紧的事情超过 ${maxImportantItems} 件，可能会有些挤。`);

  for (const slot of ['morning', 'afternoon', 'evening'] as const) {
    const minutes = active.filter((item) => item.timeSlot === slot).reduce((sum, item) => sum + (item.durationMinutes ?? 30), 0);
    if (minutes > 180) messages.push(`${slot === 'morning' ? '上午' : slot === 'afternoon' ? '下午' : '晚上'}安排超过三小时。`);
  }
  return messages;
}

export function generateReplanProposal(
  items: PlanItem[],
  reason: string,
  capacity: DayCapacity,
): ReplanProposal {
  const active = normalizePlan(items).filter((item) => !item.done && !item.waitingFor);
  const completedOrWaiting = normalizePlan(items).filter((item) => item.done || item.waitingFor);
  let remaining = inferRemainingMinutes(reason, capacity);
  const sorted = [...active].sort((left, right) => {
    const deadlineDelta = Number(Boolean(right.deadline)) - Number(Boolean(left.deadline));
    return deadlineDelta || sectionScore(right) - sectionScore(left) || (left.durationMinutes ?? 30) - (right.durationMinutes ?? 30);
  });
  const kept: PlanItem[] = [];
  const returnedIdeas: IdeaItem[] = [];
  const changes: ReplanProposal['changes'] = [];

  for (const item of sorted) {
    const minutes = item.durationMinutes ?? 30;
    const mustKeep = item.section === 'important' && kept.filter((entry) => entry.section === 'important').length === 0;
    if (minutes <= remaining || mustKeep) {
      kept.push({ ...item, date: toDateKey() });
      remaining = Math.max(0, remaining - minutes);
      changes.push({ itemId: item.id, title: item.title, kind: 'keep' });
      continue;
    }

    const pause = item.section === 'optional';
    returnedIdeas.push({
      id: `${pause ? 'paused' : 'later'}-${item.id}-${Date.now()}`,
      title: item.title,
      context: pause ? '以后再说' : '明天再看看',
      timing: pause ? 'someday' : 'tomorrow',
      durationMinutes: item.durationMinutes,
      createdAt: new Date().toISOString(),
      availableOn: pause ? undefined : (() => { const date = new Date(); date.setDate(date.getDate() + 1); return toDateKey(date); })(),
      projectTitle: item.projectTitle,
      remainingSteps: item.remainingSteps,
      resumePoint: item.resumePoint,
      recurrence: item.recurrence,
      recurrenceSeriesId: item.recurrenceSeriesId,
      behaviorRecipe: item.behaviorRecipe,
    });
    changes.push({ itemId: item.id, title: item.title, kind: pause ? 'pause' : 'later' });
  }

  return { reason, changes, nextPlan: [...completedOrWaiting, ...kept], returnedIdeas };
}

export function inferRemainingMinutes(reason: string, capacity: DayCapacity) {
  const base = capacityMinutes[capacity];
  const duration = reason.match(/(\d+(?:\.\d+)?)\s*(分钟|小时)/);
  const mentionedMinutes = duration ? Number(duration[1]) * (duration[2] === '小时' ? 60 : 1) : undefined;
  if (mentionedMinutes !== undefined && /(只剩|还有)/.test(reason)) return Math.max(0, Math.round(mentionedMinutes));
  if (mentionedMinutes !== undefined && /(耽误|占了|花了|晚了)/.test(reason)) return Math.max(30, Math.round(base - mentionedMinutes));
  if (/(很累|不舒服|没精神)/.test(reason)) return Math.min(base, 60);
  if (/(睡|晚了|迟了|耽误|临时|没时间|出门)/.test(reason)) return Math.min(base, 90);
  return base;
}

function daysUntil(dateKey: string, now: Date) {
  if (!isDateKey(dateKey)) return Number.POSITIVE_INFINITY;
  const deadline = new Date(`${dateKey}T12:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

export function buildReminders(items: PlanItem[], now = new Date()): ReminderItem[] {
  const reminders: ReminderItem[] = [];
  for (const item of normalizePlan(items)) {
    if (item.done) continue;
    if (item.waitingFor) {
      reminders.push({ id: `waiting-${item.id}`, title: item.title, body: `还在等：${item.waitingFor}`, kind: 'waiting', itemId: item.id });
      continue;
    }
    if (item.deadline) {
      const days = daysUntil(item.deadline, now);
      if (days <= 2) {
        reminders.push({
          id: `deadline-${item.id}`,
          title: item.title,
          body: days < 0 ? '时间已经到了，看看接下来怎么放' : days === 0 ? '今天需要留点时间' : `${days} 天后需要完成`,
          kind: 'deadline',
          itemId: item.id,
        });
      }
    }
    if ((item.attempts ?? 0) >= 2) {
      reminders.push({ id: `review-${item.id}`, title: item.title, body: '这件事放了一阵子，要不要变简单一点？', kind: 'review', itemId: item.id });
    } else if (item.date && item.date < toDateKey(now)) {
      reminders.push({ id: `older-${item.id}`, title: item.title, body: '这是之前留下的，要不要重新放一放？', kind: 'review', itemId: item.id });
    }
  }
  return reminders;
}

export function simplifyPlanItem(item: PlanItem): PlanItem {
  if (item.projectTitle) return item;
  const projectTitle = item.title;
  const title = /(求职|找工作)/.test(projectTitle)
    ? '找出一个愿意投的岗位'
    : /(旅行|旅游)/.test(projectTitle)
      ? '列出最想去的三个地方'
      : /搬家/.test(projectTitle)
        ? '确定一个大致搬家日期'
        : `写下“${projectTitle}”最先要确认的一件事`;
  return {
    ...item,
    title,
    duration: '10 分钟',
    durationMinutes: 10,
    detail: '只开始一点，不用做完',
    attempts: 0,
    projectTitle,
  };
}

export function startForMinutes(item: PlanItem, minutes: 2 | 5): PlanItem {
  return {
    ...item,
    duration: `${minutes} 分钟`,
    durationMinutes: minutes,
    detail: '先只碰一下，不用做完',
    attempts: 0,
    projectTitle: item.projectTitle ?? item.title,
    waitingFor: undefined,
    resumePoint: item.resumePoint?.status === 'in_progress' ? item.resumePoint : undefined,
  };
}

export function applySimplifyDraft(item: PlanItem, draft: SimplifyDraft): PlanItem {
  const [first, ...remainingSteps] = draft.steps;
  if (!first) return item;
  return {
    ...item,
    title: first.title,
    duration: `${first.durationMinutes} 分钟`,
    durationMinutes: first.durationMinutes,
    detail: '先做这一小步',
    attempts: 0,
    projectTitle: draft.projectTitle,
    remainingSteps,
  };
}

export function createFollowingStep(projectTitle: string, steps: SimpleStep[] = []): PlanItem {
  const [next, ...remainingSteps] = steps;
  return {
    id: `next-step-${Date.now()}`,
    title: next?.title ?? `看看“${projectTitle}”接下来要决定什么`,
    projectTitle,
    duration: `${next?.durationMinutes ?? 10} 分钟`,
    durationMinutes: next?.durationMinutes ?? 10,
    section: 'wanted',
    timeSlot: 'anytime',
    date: toDateKey(),
    attempts: 0,
    detail: '只继续一小步',
    remainingSteps,
  };
}
