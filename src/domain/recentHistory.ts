import type { HistoryEntry } from '../types';
import { toDateKey } from './planner.ts';

export type HistoryRange = { start: string; end: string };
export type HistoryTrail = { title: string; count: number; lastDate: string; timingLabel?: string };

function normalizedTitle(value: string) {
  return value.replace(/[\s，。！？、,.!?：:；;（）()《》“”"']/g, '').toLocaleLowerCase();
}

function completionMoment(entry: HistoryEntry) {
  return entry.occurredAt ?? `${entry.date}T00:00:00`;
}

export function getCompletedHistory(entries: HistoryEntry[], range?: HistoryRange) {
  return entries
    .filter((entry) => entry.outcome === 'done'
      && (!range || (entry.date >= range.start && entry.date <= range.end)))
    .sort((left, right) => completionMoment(right).localeCompare(completionMoment(left)));
}

export function getRecentCompletedHistory(entries: HistoryEntry[], now = new Date(), days = 28) {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  firstDay.setDate(firstDay.getDate() - Math.max(0, days - 1));
  const firstKey = toDateKey(firstDay);
  return getCompletedHistory(entries, { start: firstKey, end: toDateKey(now) });
}

export function getYearHistoryRange(year: number): HistoryRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function summarizeCompletedHistory(entries: HistoryEntry[], range: HistoryRange) {
  const completed = getCompletedHistory(entries, range);
  const countsByDate = completed.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.date] = (counts[entry.date] ?? 0) + 1;
    return counts;
  }, {});
  return {
    entries: completed,
    total: completed.length,
    activeDays: Object.keys(countsByDate).length,
    countsByDate,
  };
}

export function summarizeHistoryTrails(entries: HistoryEntry[], range: HistoryRange, limit = 3): HistoryTrail[] {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of getCompletedHistory(entries, range)) {
    const key = normalizedTitle(entry.itemTitle);
    if (!key) continue;
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
  }
  return [...groups.values()]
    .filter((items) => items.length >= 2)
    .map((items) => {
      const hours = items.map((item) => item.occurredAt ? new Date(item.occurredAt).getHours() : Number.NaN).filter(Number.isFinite);
      const buckets = hours.reduce<[number, number, number]>((counts, hour) => {
        counts[hour < 12 ? 0 : hour < 18 ? 1 : 2] += 1;
        return counts;
      }, [0, 0, 0]);
      const largest = Math.max(...buckets);
      const bucketIndex = buckets.indexOf(largest);
      const timingLabel = hours.length >= 2 && largest / hours.length >= 0.6 ? `多在${['上午', '下午', '晚上'][bucketIndex]}` : undefined;
      return { title: items[0]!.itemTitle, count: items.length, lastDate: items[0]!.date, timingLabel };
    })
    .sort((left, right) => right.count - left.count || right.lastDate.localeCompare(left.lastDate))
    .slice(0, limit);
}
