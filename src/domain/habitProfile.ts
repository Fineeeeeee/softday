import type { ActionMode, DayCapacity, HabitProfile, HistoryEntry, TimeSlot } from '../types';

const observedSlots: Exclude<TimeSlot, 'anytime'>[] = ['morning', 'afternoon', 'evening'];
const slotLabels: Record<Exclude<TimeSlot, 'anytime'>, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
};

export function getObservedTimeSlot(date = new Date()): Exclude<TimeSlot, 'anytime'> {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'afternoon';
  return 'evening';
}

function relevantOutcome(entry: HistoryEntry) {
  return entry.outcome === 'done' || entry.outcome === 'moved' || entry.outcome === 'paused';
}

function successRate(entries: HistoryEntry[]) {
  if (!entries.length) return 0;
  return entries.filter((entry) => entry.outcome === 'done').length / entries.length;
}

function recentWindow(entries: HistoryEntry[], asOfDate: string) {
  const activeDates = [...new Set(entries.map((entry) => entry.date).filter((date) => date < asOfDate))]
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 28);
  const dates = new Set(activeDates);
  return entries.filter((entry) => dates.has(entry.date));
}

export function buildHabitProfile(entries: HistoryEntry[], asOfDate: string): HabitProfile {
  const windowEntries = recentWindow(entries, asOfDate);
  const outcomeEntries = windowEntries.filter(relevantOutcome);
  const base: HabitProfile = {
    status: 'learning',
    refreshedOn: asOfDate,
    sampleCount: outcomeEntries.length,
    pace: 'steady',
    prefersShorterStarts: false,
    summary: '还在慢慢了解，记录够了才会调整。',
  };
  if (outcomeEntries.length < 8) return base;

  const slotStats = observedSlots.map((slot) => {
    const slotEntries = outcomeEntries.filter((entry) => entry.plannedSlot === slot);
    return { slot, entries: slotEntries, rate: successRate(slotEntries) };
  }).filter((stat) => stat.entries.length >= 3).sort((left, right) => right.rate - left.rate);
  const bestSlot = slotStats[0];
  const nextSlot = slotStats[1];
  const preferredSlot = bestSlot && bestSlot.rate >= 0.7 && (!nextSlot || bestSlot.rate - nextSlot.rate >= 0.15)
    ? bestSlot.slot
    : undefined;

  const activeDates = new Set(outcomeEntries.map((entry) => entry.date));
  const overallRate = successRate(outcomeEntries);
  const pace = activeDates.size >= 7 && overallRate < 0.55
    ? 'lighter'
    : activeDates.size >= 7 && overallRate >= 0.8
      ? 'roomy'
      : 'steady';

  const durationEntries = outcomeEntries.filter((entry) => typeof entry.durationMinutes === 'number');
  const shortEntries = durationEntries.filter((entry) => (entry.durationMinutes ?? 0) <= 30);
  const longEntries = durationEntries.filter((entry) => (entry.durationMinutes ?? 0) > 30);
  const prefersShorterStarts = shortEntries.length >= 3
    && longEntries.length >= 3
    && successRate(shortEntries) - successRate(longEntries) >= 0.25;

  const summary = preferredSlot
    ? `最近${slotLabels[preferredSlot]}更容易顾上事情。`
    : pace === 'lighter'
      ? '最近少放一点，安排会更顺。'
      : pace === 'roomy'
        ? '最近原本的安排大多能顾上。'
        : prefersShorterStarts
          ? '最近短一点的事情更容易开始。'
          : '近期节奏比较稳定，先保持现在这样。';

  return {
    status: 'ready',
    refreshedOn: asOfDate,
    sampleCount: outcomeEntries.length,
    preferredSlot,
    pace,
    prefersShorterStarts,
    summary,
  };
}

export function getCurrentActionMode(profile: HabitProfile, capacity: DayCapacity): ActionMode {
  if (capacity === 'light' || profile.status === 'ready' && profile.pace === 'lighter') return 'gentle';
  if (profile.status === 'ready' && profile.pace === 'roomy') return 'flowing';
  return 'supported';
}

export function createHistoryContext(item: { timeSlot?: TimeSlot; durationMinutes?: number }, plan: { done?: boolean; waitingFor?: string; durationMinutes?: number }[], capacity: DayCapacity, now = new Date()) {
  return {
    observedSlot: getObservedTimeSlot(now),
    plannedSlot: item.timeSlot ?? 'anytime',
    durationMinutes: item.durationMinutes,
    dayLoadMinutes: plan.filter((entry) => !entry.done && !entry.waitingFor).reduce((sum, entry) => sum + (entry.durationMinutes ?? 30), 0),
    capacity,
  };
}
