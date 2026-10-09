import type { CaptureBatchDraft, CaptureDraft, CaptureTiming, HistoryEntry, IdeaItem, PlanItem, PlanSection } from '../types';
import { nextRecurrenceDate, parseRecurrenceFromText, recurrenceMatchesDate, suggestRecurrenceFromHistory } from './recurrence.ts';

export const captureLimits = { maxItems: 8, maxCharacters: 2000 } as const;

const timingRules: { timing: CaptureTiming; label: string; pattern: RegExp }[] = [
  { timing: 'today', label: '今天', pattern: /(今天|今晚|一会儿|待会儿)/ },
  { timing: 'tomorrow', label: '明天', pattern: /(明天|明早|明晚)/ },
  { timing: 'week', label: '这周', pattern: /(这周|本周|周末|星期[一二三四五六日天]|周[一二三四五六日天])/ },
];

const importantPattern = /(必须|务必|截止|一定要|得把|得去|要交|要还|别忘|记得)/;
const optionalPattern = /(有空|顺便|不急|可以的话|改天)/;

function parseDuration(text: string) {
  const durationMatch = text.match(/(?:大概|大约|差不多|预计)?\s*(\d+(?:\.\d+)?)\s*(分钟|小时)/);
  if (!durationMatch) return { label: '时间还没定', minutes: undefined };
  const amount = Number(durationMatch[1]);
  const minutes = durationMatch[2] === '小时' ? Math.round(amount * 60) : Math.round(amount);
  return { label: `${durationMatch[1]} ${durationMatch[2]}`, minutes };
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDeadline(text: string) {
  if (!/(截止|前交|之前)/.test(text)) return undefined;
  const base = new Date();
  if (/明天/.test(text)) base.setDate(base.getDate() + 1);
  else if (/后天/.test(text)) base.setDate(base.getDate() + 2);
  else {
    const weekday = text.match(/(?:周|星期)([一二三四五六日天])/);
    if (!weekday) return undefined;
    const weekdayName = weekday[1];
    if (!weekdayName) return undefined;
    const target = '日一二三四五六'.indexOf(weekdayName === '天' ? '日' : weekdayName);
    const offset = (target - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + offset);
  }
  return toDateKey(base);
}

function cleanTitle(text: string) {
  const cleaned = text
    .replace(/(?:大概|大约|差不多|预计)?\s*\d+(?:\.\d+)?\s*(?:分钟|小时)/g, '')
    .replace(/^(今天|今晚|明天|明早|明晚|这周|本周|周末|一会儿|待会儿)[，,、\s]*/g, '')
    .replace(/^(早上|上午|下午|晚上|早晨|午后|夜里)[，,、\s]*/g, '')
    .replace(/^(每天|每日|天天|工作日|每个工作日|周一到周五|星期一到星期五)[，,、\s]*/g, '')
    .replace(/^每(?:周|星期)[一二三四五六日天、和及至到~\-]+[，,、\s]*/g, '')
    .replace(/^(早上|上午|下午|晚上|早晨|午后|夜里)[，,、\s]*/g, '')
    .replace(/^(我|我想|想要|想|需要|得|必须|记得|别忘了?|有空|顺便)[，,、\s]*/g, '')
    .replace(/[。！!，,、]+$/g, '')
    .trim();
  return cleaned || text.trim();
}

export function parseCapture(text: string, defaultTiming: CaptureTiming = 'someday'): CaptureDraft {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const recurrence = parseRecurrenceFromText(normalized);
  const timingRule = timingRules.find((rule) => rule.pattern.test(normalized));
  const recurrenceTiming: CaptureTiming = recurrence && recurrenceMatchesDate(recurrence, toDateKey(new Date())) ? 'today' : recurrence ? 'week' : defaultTiming;
  const timing: CaptureTiming = timingRule?.timing ?? recurrenceTiming;
  let section: PlanSection = 'wanted';
  if (importantPattern.test(normalized)) section = 'important';
  if (optionalPattern.test(normalized)) section = 'optional';
  const duration = parseDuration(normalized);
  const timeSlot = /(早上|上午|早晨)/.test(normalized)
    ? 'morning'
    : /(下午|午后)/.test(normalized)
      ? 'afternoon'
      : /(晚上|今晚|夜里)/.test(normalized)
        ? 'evening'
        : 'anytime';

  return {
    originalText: normalized,
    title: cleanTitle(normalized),
    timing,
    timingLabel: timingRule?.label ?? '以后再说',
    destination: timing === 'today' ? 'today' : 'ideas',
    section,
    duration: duration.label,
    durationMinutes: duration.minutes,
    deadline: parseDeadline(normalized),
    timeSlot,
    recurrence,
    recurrenceSuggestion: recurrence ? '听起来会重复，要不要这样放？' : undefined,
  };
}

export function parseCaptureBatch(text: string, defaultTiming: CaptureTiming = 'someday'): CaptureBatchDraft {
  const originalText = text.trim();
  const segments = originalText
    .split(/\r?\n|[；;]/)
    .map((segment) => segment.replace(/^\s*(?:[-•]|\d+[.、)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, captureLimits.maxItems);
  return { originalText, items: (segments.length ? segments : [originalText]).map((segment) => parseCapture(segment, defaultTiming)) };
}

function normalizedTitle(value: string) {
  return value.replace(/[\s，。！？、,.!?：:；;（）()《》“”"']/g, '').toLocaleLowerCase();
}

export function filterNewCaptureDrafts(items: CaptureDraft[], existingTitles: string[]) {
  const seen = new Set(existingTitles.map(normalizedTitle));
  return items.filter((item) => {
    const key = normalizedTitle(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function addLocalRecurrenceSuggestions(items: CaptureDraft[], history: HistoryEntry[], now = new Date()) {
  return items.map((item) => {
    if (item.recurrence) return item;
    const suggestion = suggestRecurrenceFromHistory(item.title, history, now);
    return suggestion ? { ...item, recurrenceProposal: suggestion.rule, recurrenceSuggestion: suggestion.message } : item;
  });
}

export function createCaptureCommit(items: CaptureDraft[], now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const planItems = items.filter((item) => item.destination === 'today').map((item, index): PlanItem => ({
    id: `capture-${now.getTime()}-${index}`,
    title: item.title.trim(),
    duration: item.duration,
    durationMinutes: item.durationMinutes,
    section: item.section,
    detail: item.originalText,
    deadline: item.deadline,
    timeSlot: item.timeSlot,
    date: toDateKey(now),
    attempts: 0,
    projectTitle: item.projectTitle,
    remainingSteps: item.remainingSteps,
    recurrence: item.recurrence,
    recurrenceSeriesId: item.recurrence ? `capture-series-${now.getTime()}-${items.indexOf(item)}` : undefined,
  }));
  const ideaItems = items.filter((item) => item.destination === 'ideas').map((item, index): IdeaItem => ({
    id: `capture-idea-${now.getTime()}-${index}`,
    title: item.title.trim(),
    context: item.timingLabel,
    timing: item.timing,
    durationMinutes: item.durationMinutes,
    createdAt: new Date(now.getTime() + index).toISOString(),
    availableOn: item.timing === 'tomorrow'
      ? toDateKey(tomorrow)
      : item.recurrence && item.timing === 'week'
        ? nextRecurrenceDate(item.recurrence, toDateKey(now))
        : undefined,
    projectTitle: item.projectTitle,
    remainingSteps: item.remainingSteps,
    deadline: item.deadline,
    timeSlot: item.timeSlot,
    section: item.section,
    sourceExcerpt: item.originalText,
    recurrence: item.recurrence,
    recurrenceSeriesId: item.recurrence ? `capture-series-${now.getTime()}-${items.indexOf(item)}` : undefined,
  }));
  return { planItems, ideaItems };
}
