import type { AiSettings, DayCapacity, EasePreferences, FocusSession, HistoryEntry, IdeaItem, PendingAiJob, PlanItem, RewardPreferences, SavedHistoryReview, UserPreferences } from '../types';
import { defaultEasePreferences, isEasePreferences } from './easePreferences.ts';

export type SoftdayState = {
  version: 7;
  hasStarted: boolean;
  capacity: DayCapacity;
  plan: PlanItem[];
  ideas: IdeaItem[];
  preferences: UserPreferences;
  history: HistoryEntry[];
  aiSettings: AiSettings;
  pendingAiJob: PendingAiJob | null;
  historyReviews: SavedHistoryReview[];
  activeFocus: FocusSession | null;
  focusNotificationEnabled: boolean;
  rewardPreferences: RewardPreferences;
  easePreferences: EasePreferences;
};

export const legacyStateKeys = [
  'softday.started',
  'softday.capacity',
  'softday.plan',
  'softday.ideas',
  'softday.preferences',
  'softday.history',
  'softday.ai-settings',
] as const;

export function claimInitialPendingAiJob(
  ready: boolean,
  recoveryChecked: boolean,
  pendingAiJob: PendingAiJob | null,
) {
  if (!ready || recoveryChecked) return { recoveryChecked, job: null };
  return { recoveryChecked: true, job: pendingAiJob };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isDateRange(value: unknown) {
  return isRecord(value) && typeof value.start === 'string' && typeof value.end === 'string';
}

function isPendingAiJob(value: unknown): value is PendingAiJob {
  if (!isRecord(value) || typeof value.mode !== 'string') return false;
  if (value.mode === 'capture' || value.mode === 'adjust') return typeof value.input === 'string';
  if (value.mode === 'review') return isDateRange(value.range);
  if (value.mode === 'simplify') return typeof value.itemId === 'string';
  if (value.mode === 'behavior') return typeof value.itemId === 'string' && typeof value.frictionNote === 'string' && value.frictionNote.length <= 160;
  if (value.mode === 'resume') return typeof value.itemId === 'string'
    && ['not_started', 'in_progress', 'waiting'].includes(String(value.selectedStatus))
    && typeof value.note === 'string';
  if (value.mode === 'file') return Array.isArray(value.fileNames) && value.fileNames.every((name) => typeof name === 'string');
  return false;
}

function isSavedHistoryReview(value: unknown): value is SavedHistoryReview {
  if (!isRecord(value) || !isDateRange(value.range) || !isRecord(value.result) || typeof value.createdAt !== 'string') return false;
  const result = value.result;
  return typeof result.summary === 'string'
    && Array.isArray(result.observations) && result.observations.every((item) => typeof item === 'string')
    && Array.isArray(result.mentionedEntryIds) && result.mentionedEntryIds.every((item) => typeof item === 'string')
    && (result.question === undefined || typeof result.question === 'string');
}

export function parseSoftdaySnapshot(text: string): SoftdayState | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)
      || ![2, 3, 4, 5, 6, 7].includes(Number(value.version))
      || typeof value.hasStarted !== 'boolean'
      || !['light', 'steady', 'open'].includes(String(value.capacity))
      || !Array.isArray(value.plan)
      || !Array.isArray(value.ideas)
      || !Array.isArray(value.history)
      || !isRecord(value.preferences)
      || !isRecord(value.aiSettings)
      || typeof value.aiSettings.endpoint !== 'string'
      || typeof value.aiSettings.model !== 'string') return null;
    if (Number(value.version) >= 3 && value.activeFocus !== null && (!isRecord(value.activeFocus)
      || typeof value.activeFocus.itemId !== 'string'
      || typeof value.activeFocus.startedAt !== 'string'
      || Number.isNaN(Date.parse(value.activeFocus.startedAt)))) return null;
    const legacyPending = Number(value.version) < 6 ? value.pendingAiAction : undefined;
    const pendingAiJob = Number(value.version) >= 6
      ? value.pendingAiJob
      : isRecord(legacyPending) && (legacyPending.mode === 'capture' || legacyPending.mode === 'adjust') && typeof legacyPending.input === 'string'
        ? { mode: legacyPending.mode, input: legacyPending.input }
        : isRecord(legacyPending) && legacyPending.mode === 'review' && isDateRange(legacyPending.range)
          ? { mode: 'review' as const, range: legacyPending.range }
          : null;
    if (pendingAiJob !== null && !isPendingAiJob(pendingAiJob)) return null;
    const historyReviews = Number(value.version) >= 6 ? value.historyReviews : [];
    if (!Array.isArray(historyReviews) || !historyReviews.every(isSavedHistoryReview)) return null;
    const easePreferences = Number(value.version) >= 7 ? value.easePreferences : defaultEasePreferences;
    if (!isEasePreferences(easePreferences)) return null;
    return {
      ...(value as Omit<SoftdayState, 'version' | 'activeFocus' | 'pendingAiJob' | 'historyReviews' | 'easePreferences'>),
      version: 7,
      activeFocus: Number(value.version) >= 3 ? value.activeFocus as FocusSession | null : null,
      pendingAiJob,
      historyReviews,
      focusNotificationEnabled: Number(value.version) >= 5 && typeof value.focusNotificationEnabled === 'boolean' ? value.focusNotificationEnabled : false,
      rewardPreferences: Number(value.version) >= 5 && isRecord(value.rewardPreferences)
        && Array.isArray(value.rewardPreferences.likes) && value.rewardPreferences.likes.every((item) => typeof item === 'string')
        && Array.isArray(value.rewardPreferences.dislikes) && value.rewardPreferences.dislikes.every((item) => typeof item === 'string')
        && typeof value.rewardPreferences.lowGoal === 'number' && Number.isInteger(value.rewardPreferences.lowGoal) && value.rewardPreferences.lowGoal >= 1 && value.rewardPreferences.lowGoal <= 3
        && typeof value.rewardPreferences.highGoal === 'number' && Number.isInteger(value.rewardPreferences.highGoal) && value.rewardPreferences.highGoal >= 3 && value.rewardPreferences.highGoal <= 5
        && value.rewardPreferences.lowGoal < value.rewardPreferences.highGoal
        ? value.rewardPreferences as RewardPreferences
        : { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 },
      easePreferences,
    };
  } catch {
    return null;
  }
}

export function migrateLegacyState(rows: readonly [string, string | null][], initial: SoftdayState): SoftdayState | null {
  const values = new Map(rows);
  try {
    const read = <T>(key: string, fallback: T): T => {
      const stored = values.get(key);
      return stored === null || stored === undefined ? fallback : JSON.parse(stored) as T;
    };
    return {
      version: 7,
      hasStarted: read('softday.started', initial.hasStarted),
      capacity: read('softday.capacity', initial.capacity),
      plan: read('softday.plan', initial.plan),
      ideas: read('softday.ideas', initial.ideas),
      preferences: read('softday.preferences', initial.preferences),
      history: read('softday.history', initial.history),
      aiSettings: read('softday.ai-settings', initial.aiSettings),
      pendingAiJob: null,
      historyReviews: [],
      activeFocus: null,
      focusNotificationEnabled: initial.focusNotificationEnabled,
      rewardPreferences: initial.rewardPreferences,
      easePreferences: initial.easePreferences,
    };
  } catch {
    return null;
  }
}
