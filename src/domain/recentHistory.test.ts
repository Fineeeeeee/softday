import assert from 'node:assert/strict';
import test from 'node:test';
import { getRecentCompletedHistory, getYearHistoryRange, summarizeCompletedHistory, summarizeHistoryTrails } from './recentHistory.ts';
import type { HistoryEntry } from '../types/index.ts';

test('recent timeline shows completed work only and sorts exact moments newest first', () => {
  const entries: HistoryEntry[] = [
    { id: 'old', itemTitle: '旧事项', date: '2026-06-01', outcome: 'done' },
    { id: 'moved', itemTitle: '换了时间', date: '2026-07-20', outcome: 'moved' },
    { id: 'early', itemTitle: '早一点', date: '2026-07-20', occurredAt: '2026-07-20T10:00:00.000Z', outcome: 'done' },
    { id: 'late', itemTitle: '晚一点', date: '2026-07-20', occurredAt: '2026-07-20T12:00:00.000Z', outcome: 'done' },
  ];
  assert.deepEqual(getRecentCompletedHistory(entries, new Date(2026, 6, 20, 20)).map((entry) => entry.id), ['late', 'early']);
});

test('year review keeps only completed work inside the calendar year', () => {
  const entries: HistoryEntry[] = [
    { id: 'last-year', itemTitle: '去年', date: '2025-12-31', outcome: 'done' },
    { id: 'jan', itemTitle: '一月', date: '2026-01-02', outcome: 'done' },
    { id: 'moved', itemTitle: '改期', date: '2026-01-02', outcome: 'moved' },
    { id: 'jul', itemTitle: '七月', date: '2026-07-20', outcome: 'done' },
    { id: 'next-year', itemTitle: '明年', date: '2027-01-01', outcome: 'done' },
  ];
  const review = summarizeCompletedHistory(entries, getYearHistoryRange(2026));
  assert.deepEqual(review.entries.map((entry) => entry.id), ['jul', 'jan']);
  assert.equal(review.total, 2);
  assert.equal(review.activeDays, 2);
  assert.deepEqual(review.countsByDate, { '2026-07-20': 1, '2026-01-02': 1 });
});

test('date range review includes both boundary dates and daily density', () => {
  const entries: HistoryEntry[] = [
    { id: 'before', itemTitle: '之前', date: '2026-07-09', outcome: 'done' },
    { id: 'start-a', itemTitle: '开始一', date: '2026-07-10', outcome: 'done' },
    { id: 'start-b', itemTitle: '开始二', date: '2026-07-10', outcome: 'done' },
    { id: 'end', itemTitle: '结束', date: '2026-07-12', outcome: 'done' },
  ];
  const review = summarizeCompletedHistory(entries, { start: '2026-07-10', end: '2026-07-12' });
  assert.equal(review.total, 3);
  assert.equal(review.activeDays, 2);
  assert.equal(review.countsByDate['2026-07-10'], 2);
});

test('recent trails group the same completed title without judging gaps', () => {
  const entries = [
    { id: '1', itemTitle: '散步', date: '2026-07-28', occurredAt: '2026-07-28T20:00:00', outcome: 'done' as const },
    { id: '2', itemTitle: '散 步。', date: '2026-07-29', occurredAt: '2026-07-29T21:00:00', outcome: 'done' as const },
    { id: '3', itemTitle: '散步', date: '2026-07-30', occurredAt: '2026-07-30T19:00:00', outcome: 'done' as const },
  ];
  const trails = summarizeHistoryTrails(entries, { start: '2026-07-01', end: '2026-07-31' });
  assert.equal(trails[0]?.count, 3);
  assert.equal(trails[0]?.timingLabel, '多在晚上');
});
