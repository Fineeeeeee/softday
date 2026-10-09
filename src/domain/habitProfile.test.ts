import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHabitProfile, getCurrentActionMode, getObservedTimeSlot } from './habitProfile.ts';
import type { HistoryEntry } from '../types/index.ts';

function entry(id: string, date: string, outcome: HistoryEntry['outcome'], plannedSlot: HistoryEntry['plannedSlot'], durationMinutes = 30): HistoryEntry {
  return { id, itemTitle: id, date, outcome, plannedSlot, durationMinutes };
}

test('time slots use local morning daytime and evening boundaries', () => {
  assert.equal(getObservedTimeSlot(new Date(2026, 6, 1, 5)), 'morning');
  assert.equal(getObservedTimeSlot(new Date(2026, 6, 1, 11)), 'afternoon');
  assert.equal(getObservedTimeSlot(new Date(2026, 6, 1, 18)), 'evening');
});

test('habit profile waits for enough completed days before changing pace', () => {
  const sparse = Array.from({ length: 7 }, (_, index) => entry(`s-${index}`, `2026-07-${String(index + 1).padStart(2, '0')}`, 'moved', 'evening'));
  assert.equal(buildHabitProfile(sparse, '2026-07-15').status, 'learning');
});

test('habit profile can learn an evening rhythm without assuming mornings', () => {
  const entries: HistoryEntry[] = [];
  for (let day = 1; day <= 8; day += 1) {
    const date = `2026-07-${String(day).padStart(2, '0')}`;
    entries.push(entry(`evening-${day}`, date, 'done', 'evening'));
    entries.push(entry(`morning-${day}`, date, day <= 2 ? 'done' : 'moved', 'morning'));
  }
  const profile = buildHabitProfile(entries, '2026-07-15');
  assert.equal(profile.status, 'ready');
  assert.equal(profile.preferredSlot, 'evening');
  assert.match(profile.summary, /晚上/);
});

test('habit profile ignores the current day until the next daily refresh', () => {
  const earlier = Array.from({ length: 8 }, (_, index) => entry(`old-${index}`, `2026-07-${String(index + 1).padStart(2, '0')}`, 'done', 'morning'));
  const today = Array.from({ length: 8 }, (_, index) => entry(`today-${index}`, '2026-07-15', 'moved', 'morning'));
  assert.equal(buildHabitProfile([...earlier, ...today], '2026-07-15').pace, 'roomy');
});

test('current action mode uses recent evidence and explicit day capacity, not a permanent label', () => {
  const learning = buildHabitProfile([], '2026-07-15');
  assert.equal(getCurrentActionMode(learning, 'steady'), 'supported');
  assert.equal(getCurrentActionMode(learning, 'light'), 'gentle');

  const completed = Array.from({ length: 8 }, (_, index) => entry(`done-${index}`, `2026-07-${String(index + 1).padStart(2, '0')}`, 'done', 'evening'));
  assert.equal(getCurrentActionMode(buildHabitProfile(completed, '2026-07-15'), 'steady'), 'flowing');
});
