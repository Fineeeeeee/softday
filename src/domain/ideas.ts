import type { IdeaItem } from '../types';
import { toDateKey } from './planner.ts';
import { recurrenceLabel } from './recurrence.ts';

export type IdeaReturnChoice = 'tomorrow' | 'week' | 'free' | 'someday';

const returnCopy: Record<IdeaReturnChoice, string> = {
  tomorrow: '明天再看看',
  week: '这周再看看',
  free: '有空时再看看',
  someday: '暂时收起',
};

export function applyIdeaReturnChoice(idea: IdeaItem, choice: IdeaReturnChoice, now = new Date()): IdeaItem {
  let availableOn: string | undefined;
  if (choice === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    availableOn = toDateKey(tomorrow);
  }
  return {
    ...idea,
    context: returnCopy[choice],
    timing: choice === 'tomorrow' ? 'tomorrow' : choice === 'week' ? 'week' : 'someday',
    availableOn,
  };
}

export function getIdeaReturnChoice(idea: IdeaItem): IdeaReturnChoice {
  if (idea.timing === 'tomorrow') return 'tomorrow';
  if (idea.timing === 'week' || idea.availableOn) return 'week';
  if (idea.context === returnCopy.free) return 'free';
  return 'someday';
}

function createdAtValue(idea: IdeaItem) {
  const value = idea.createdAt ? Date.parse(idea.createdAt) : 0;
  return Number.isNaN(value) ? 0 : value;
}

export function groupIdeasForDisplay(ideas: IdeaItem[]) {
  const upcoming = ideas
    .filter((idea) => idea.timing === 'tomorrow' || idea.timing === 'week' || Boolean(idea.availableOn))
    .sort((left, right) => (left.availableOn ?? '9999-12-31').localeCompare(right.availableOn ?? '9999-12-31') || createdAtValue(right) - createdAtValue(left));
  const upcomingIds = new Set(upcoming.map((idea) => idea.id));
  const later = ideas.filter((idea) => !upcomingIds.has(idea.id)).sort((left, right) => createdAtValue(right) - createdAtValue(left));
  return { upcoming, later };
}

function dateLabel(dateKey: string) {
  const [, month = '', day = ''] = dateKey.split('-');
  return `${Number(month)}月${Number(day)}日再看看`;
}

export function getIdeaDisplayMeta(idea: IdeaItem) {
  const parts = [
    idea.availableOn ? dateLabel(idea.availableOn) : idea.timing === 'week' ? '这周' : null,
    idea.recurrence ? recurrenceLabel(idea.recurrence) : null,
    idea.sourceName ? `来自 ${idea.sourceName}` : null,
    idea.durationMinutes ? `${idea.durationMinutes} 分钟` : null,
  ].filter(Boolean);
  return parts.slice(0, 2).join(' · ');
}
