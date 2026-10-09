import type { HistoryEntry, IdeaItem, PlanItem, RecurrenceRule } from '../types';
import { toDateKey } from './planner.ts';

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

function fromDateKey(dateKey: string) {
  const [year = 0, month = 0, day = 0] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function normalizedTitle(value: string) {
  return value.replace(/[\s，。！？、,.!?：:；;（）()《》“”"']/g, '').toLocaleLowerCase();
}

export function isRecurrenceRule(value: unknown): value is RecurrenceRule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (record.frequency === 'daily' || record.frequency === 'weekdays') return keys.length === 1;
  return record.frequency === 'weekly'
    && keys.every((key) => key === 'frequency' || key === 'weekdays')
    && Array.isArray(record.weekdays)
    && record.weekdays.length > 0
    && record.weekdays.length <= 7
    && record.weekdays.every((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)
    && new Set(record.weekdays).size === record.weekdays.length;
}

export function recurrenceLabel(rule?: RecurrenceRule) {
  if (!rule) return '不重复';
  if (rule.frequency === 'daily') return '每天';
  if (rule.frequency === 'weekdays') return '工作日';
  const ordered = [...rule.weekdays].sort((left, right) => left - right);
  return `每周${ordered.map((day) => weekdayNames[day]).join('、')}`;
}

export function parseRecurrenceFromText(text: string): RecurrenceRule | undefined {
  if (/(工作日|周一到周五|星期一到星期五)/.test(text)) return { frequency: 'weekdays' };
  if (/(每天|每日|天天)/.test(text)) return { frequency: 'daily' };
  const weekly = text.match(/每(?:周|星期)([一二三四五六日天、和及至到~\-]+)/);
  if (!weekly?.[1]) return undefined;
  const days = [...weekly[1]].map((name) => '日一二三四五六'.indexOf(name === '天' ? '日' : name)).filter((day) => day >= 0);
  const unique = [...new Set(days)];
  return unique.length ? { frequency: 'weekly', weekdays: unique } : undefined;
}

export function nextRecurrenceDate(rule: RecurrenceRule, afterDateKey: string) {
  const date = fromDateKey(afterDateKey);
  for (let offset = 1; offset <= 14; offset += 1) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    const matches = rule.frequency === 'daily'
      || rule.frequency === 'weekdays' && weekday >= 1 && weekday <= 5
      || rule.frequency === 'weekly' && rule.weekdays.includes(weekday);
    if (matches) return toDateKey(date);
  }
  throw new Error('无法计算下一次重复日期');
}

export function recurrenceMatchesDate(rule: RecurrenceRule, dateKey: string) {
  const weekday = fromDateKey(dateKey).getDay();
  return rule.frequency === 'daily'
    || rule.frequency === 'weekdays' && weekday >= 1 && weekday <= 5
    || rule.frequency === 'weekly' && rule.weekdays.includes(weekday);
}

export function createNextRecurringIdea(item: PlanItem, completedOn = toDateKey(), now = new Date()): IdeaItem | null {
  if (!item.recurrence) return null;
  const seriesId = item.recurrenceSeriesId ?? `series-${item.id}`;
  const availableOn = nextRecurrenceDate(item.recurrence, completedOn);
  const tomorrow = nextRecurrenceDate({ frequency: 'daily' }, completedOn);
  return {
    id: `recurring-${seriesId}-${availableOn}`,
    title: item.behaviorRecipe?.intentTitle ?? item.title,
    context: recurrenceLabel(item.recurrence),
    createdAt: now.toISOString(),
    timing: availableOn === tomorrow ? 'tomorrow' : 'week',
    durationMinutes: item.behaviorRecipe?.ordinaryMinutes ?? item.durationMinutes,
    availableOn,
    projectTitle: item.projectTitle,
    remainingSteps: item.remainingSteps,
    deadline: item.deadline,
    timeSlot: item.timeSlot,
    section: item.section,
    recurrence: item.recurrence,
    recurrenceSeriesId: seriesId,
    behaviorRecipe: item.behaviorRecipe,
  };
}

export function createPausedRecurringIdea(item: PlanItem, availableOn?: string, now = new Date()): IdeaItem | null {
  if (!item.recurrence) return null;
  const seriesId = item.recurrenceSeriesId ?? `series-${item.id}`;
  return {
    id: `paused-${seriesId}-${availableOn ?? now.getTime()}`,
    title: item.behaviorRecipe?.intentTitle ?? item.title,
    context: availableOn ? `暂停到 ${availableOn}` : '暂时停一停',
    createdAt: now.toISOString(),
    timing: availableOn ? 'week' : 'someday',
    durationMinutes: item.behaviorRecipe?.ordinaryMinutes ?? item.durationMinutes,
    availableOn,
    projectTitle: item.projectTitle,
    remainingSteps: item.remainingSteps,
    timeSlot: item.timeSlot,
    section: item.section,
    recurrence: item.recurrence,
    recurrenceSeriesId: seriesId,
    behaviorRecipe: item.behaviorRecipe,
  };
}

export function applyRecurringEdit(original: PlanItem, edited: PlanItem, scope: 'once' | 'series', today = toDateKey(), now = new Date()) {
  if (scope === 'series' || !original.recurrence) return { item: edited, nextIdea: null };
  return {
    item: { ...edited, recurrence: undefined, recurrenceSeriesId: undefined },
    nextIdea: createNextRecurringIdea(original, today, now),
  };
}

export function promoteDueRecurrences(plan: PlanItem[], ideas: IdeaItem[], today = toDateKey()) {
  const due = ideas.filter((idea) => idea.recurrence && idea.availableOn && idea.availableOn <= today);
  if (!due.length) return { plan, ideas };
  const existingSeries = new Set(plan.filter((item) => !item.done).map((item) => item.recurrenceSeriesId).filter(Boolean));
  const promoted: PlanItem[] = [];
  const promotedIds = new Set<string>();
  for (const idea of due) {
    if (!idea.recurrence || !idea.recurrenceSeriesId || existingSeries.has(idea.recurrenceSeriesId)) continue;
    existingSeries.add(idea.recurrenceSeriesId);
    promotedIds.add(idea.id);
    promoted.push({
      id: `recurring-${idea.recurrenceSeriesId}-${today}`,
      title: idea.behaviorRecipe?.ordinaryAction ?? idea.title,
      duration: idea.durationMinutes ? `${idea.durationMinutes} 分钟` : '时间还没定',
      durationMinutes: idea.durationMinutes,
      section: idea.section ?? 'wanted',
      detail: idea.behaviorRecipe ? '换成现在更方便的做法' : idea.context,
      date: today,
      timeSlot: idea.timeSlot ?? 'anytime',
      attempts: 0,
      projectTitle: idea.projectTitle,
      remainingSteps: idea.remainingSteps,
      recurrence: idea.recurrence,
      recurrenceSeriesId: idea.recurrenceSeriesId,
      behaviorRecipe: idea.behaviorRecipe,
    });
  }
  return { plan: [...promoted, ...plan], ideas: ideas.filter((idea) => !promotedIds.has(idea.id)) };
}

export function suggestRecurrenceFromHistory(title: string, history: HistoryEntry[], now = new Date()): { rule: RecurrenceRule; message: string } | null {
  const key = normalizedTitle(title);
  const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  firstDay.setDate(firstDay.getDate() - 27);
  const dates = [...new Set(history
    .filter((entry) => entry.outcome === 'done' && entry.date >= toDateKey(firstDay) && normalizedTitle(entry.itemTitle) === key)
    .map((entry) => entry.date))]
    .sort();
  if (dates.length < 3) return null;
  const weekdays = [...new Set(dates.map((date) => fromDateKey(date).getDay()))];
  const workdaysOnly = weekdays.every((day) => day >= 1 && day <= 5);
  const gaps = dates.slice(1).map((date, index) => Math.round((fromDateKey(date).getTime() - fromDateKey(dates[index]!).getTime()) / 86_400_000));
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (averageGap <= 2.2) {
    const rule: RecurrenceRule = workdaysOnly && dates.length >= 5 ? { frequency: 'weekdays' } : { frequency: 'daily' };
    return { rule, message: '最近常记这件事，要不要让它继续出现？' };
  }
  if (averageGap >= 5 && averageGap <= 9 && weekdays.length <= 3) {
    return { rule: { frequency: 'weekly', weekdays }, message: '这件事最近会隔几天出现，要不要按星期放好？' };
  }
  return null;
}
