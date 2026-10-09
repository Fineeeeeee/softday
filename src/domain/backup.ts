import type { BackupPayload, HistoryEntry, IdeaItem, PlanItem, RewardPreferences } from '../types';
import { defaultEasePreferences, isEasePreferences } from './easePreferences.ts';
import { isDateKey } from './planner.ts';
import { isRecurrenceRule } from './recurrence.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasValidProjectProgress(value: Record<string, unknown>) {
  const projectTitleValid = value.projectTitle === undefined || typeof value.projectTitle === 'string';
  const remainingStepsValid = value.remainingSteps === undefined || Array.isArray(value.remainingSteps) && value.remainingSteps.every((step) => isRecord(step)
    && typeof step.title === 'string'
    && typeof step.durationMinutes === 'number'
    && Number.isInteger(step.durationMinutes));
  return projectTitleValid && remainingStepsValid;
}

function hasValidResumePoint(value: Record<string, unknown>) {
  if (value.resumePoint === undefined) return true;
  if (!isRecord(value.resumePoint)) return false;
  const point = value.resumePoint;
  return ['not_started', 'in_progress', 'waiting'].includes(String(point.status))
    && typeof point.progressSummary === 'string'
    && typeof point.nextAction === 'string'
    && typeof point.recordedAt === 'string'
    && !Number.isNaN(Date.parse(point.recordedAt))
    && (point.waitingFor === undefined || typeof point.waitingFor === 'string');
}

function hasValidRecurrence(value: Record<string, unknown>) {
  return (value.recurrence === undefined || isRecurrenceRule(value.recurrence))
    && (value.recurrenceSeriesId === undefined || typeof value.recurrenceSeriesId === 'string');
}

function hasValidBehaviorRecipe(value: Record<string, unknown>) {
  if (value.behaviorRecipe === undefined) return true;
  if (!isRecord(value.behaviorRecipe)) return false;
  const recipe = value.behaviorRecipe;
  return typeof recipe.intentTitle === 'string'
    && typeof recipe.ordinaryAction === 'string'
    && typeof recipe.ordinaryMinutes === 'number' && Number.isInteger(recipe.ordinaryMinutes) && recipe.ordinaryMinutes >= 2 && recipe.ordinaryMinutes <= 60
    && typeof recipe.lowEnergyAction === 'string'
    && typeof recipe.lowEnergyMinutes === 'number' && Number.isInteger(recipe.lowEnergyMinutes) && recipe.lowEnergyMinutes >= 1 && recipe.lowEnergyMinutes <= 5
    && typeof recipe.frictionNote === 'string'
    && typeof recipe.updatedAt === 'string' && !Number.isNaN(Date.parse(recipe.updatedAt));
}

function isPlanItem(value: unknown) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.duration === 'string'
    && ['important', 'wanted', 'optional'].includes(String(value.section))
    && hasValidRecurrence(value)
    && hasValidBehaviorRecipe(value)
    && hasValidResumePoint(value)
    && hasValidProjectProgress(value);
}

function isIdea(value: unknown) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.context === 'string'
    && (value.deadline === undefined || typeof value.deadline === 'string' && isDateKey(value.deadline))
    && (value.timeSlot === undefined || ['morning', 'afternoon', 'evening', 'anytime'].includes(String(value.timeSlot)))
    && (value.section === undefined || ['important', 'wanted', 'optional'].includes(String(value.section)))
    && (value.sourceName === undefined || typeof value.sourceName === 'string')
    && (value.sourceExcerpt === undefined || typeof value.sourceExcerpt === 'string')
    && (value.afterTitle === undefined || typeof value.afterTitle === 'string')
    && hasValidRecurrence(value)
    && hasValidBehaviorRecipe(value)
    && hasValidResumePoint(value)
    && hasValidProjectProgress(value);
}

function isHistory(value: unknown) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.itemTitle === 'string'
    && typeof value.date === 'string'
    && ['done', 'moved', 'paused', 'removed', 'simplified', 'waiting'].includes(String(value.outcome))
    && (value.observedSlot === undefined || ['morning', 'afternoon', 'evening'].includes(String(value.observedSlot)))
    && (value.plannedSlot === undefined || ['morning', 'afternoon', 'evening', 'anytime'].includes(String(value.plannedSlot)))
    && (value.durationMinutes === undefined || typeof value.durationMinutes === 'number')
    && (value.dayLoadMinutes === undefined || typeof value.dayLoadMinutes === 'number')
    && (value.capacity === undefined || ['light', 'steady', 'open'].includes(String(value.capacity)))
    && (value.occurredAt === undefined || typeof value.occurredAt === 'string' && !Number.isNaN(Date.parse(value.occurredAt)))
    && (value.projectTitle === undefined || typeof value.projectTitle === 'string');
}

function isPreferences(value: unknown) {
  return isRecord(value)
    && ['morning', 'afternoon', 'evening', 'anytime'].includes(String(value.preferredFocusSlot))
    && typeof value.keepEveningLight === 'boolean'
    && typeof value.maxImportantItems === 'number'
    && ['quiet', 'balanced'].includes(String(value.reminderLevel));
}

function isRewardPreferences(value: unknown): value is RewardPreferences {
  return isRecord(value)
    && Array.isArray(value.likes) && value.likes.every((item) => typeof item === 'string')
    && Array.isArray(value.dislikes) && value.dislikes.every((item) => typeof item === 'string')
    && typeof value.lowGoal === 'number' && Number.isInteger(value.lowGoal) && value.lowGoal >= 1 && value.lowGoal <= 3
    && typeof value.highGoal === 'number' && Number.isInteger(value.highGoal) && value.highGoal >= 3 && value.highGoal <= 5
    && value.lowGoal < value.highGoal;
}

export function parseBackupText(text: string): BackupPayload | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return null;
    if (![1, 2, 3].includes(Number(value.version))
      || !Array.isArray(value.plan) || !value.plan.every(isPlanItem)
      || !Array.isArray(value.ideas) || !value.ideas.every(isIdea)
      || !Array.isArray(value.history) || !value.history.every(isHistory)
      || !['light', 'steady', 'open'].includes(String(value.capacity))
      || !isPreferences(value.preferences)) return null;
    if (Number(value.version) === 2 && !isRewardPreferences(value.rewardPreferences)) return null;
    if (Number(value.version) === 3 && (!isRewardPreferences(value.rewardPreferences) || !isEasePreferences(value.easePreferences))) return null;
    return {
      ...(value as unknown as BackupPayload),
      version: 3,
      rewardPreferences: Number(value.version) >= 2
        ? value.rewardPreferences as RewardPreferences
        : { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 },
      easePreferences: Number(value.version) >= 3
        ? value.easePreferences as BackupPayload['easePreferences']
        : defaultEasePreferences,
    };
  } catch {
    return null;
  }
}

export function createBackupText(payload: Omit<BackupPayload, 'version'>) {
  return JSON.stringify({ version: 3, ...payload } satisfies BackupPayload, null, 2);
}

export type BackupMergeResult = {
  plan: PlanItem[];
  ideas: IdeaItem[];
  history: HistoryEntry[];
  added: { plan: number; ideas: number; history: number };
  skipped: number;
  adoptedSettings: Pick<BackupPayload, 'capacity' | 'preferences' | 'rewardPreferences' | 'easePreferences'> | null;
};

function normalizedText(value?: string) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function planFingerprint(item: PlanItem) {
  return [normalizedText(item.title), item.date ?? '', normalizedText(item.projectTitle), item.recurrenceSeriesId ?? ''].join('|');
}

function ideaFingerprint(item: IdeaItem) {
  return [normalizedText(item.title), item.availableOn ?? '', item.timing ?? '', normalizedText(item.projectTitle), item.recurrenceSeriesId ?? ''].join('|');
}

function historyFingerprint(item: HistoryEntry) {
  return [item.itemId ?? '', normalizedText(item.itemTitle), item.outcome, item.occurredAt ?? item.date, normalizedText(item.projectTitle)].join('|');
}

function mergeCollection<T extends { id: string }>(current: T[], incoming: T[], fingerprint: (item: T) => string) {
  const ids = new Set(current.map((item) => item.id));
  const fingerprints = new Set(current.map(fingerprint));
  const added: T[] = [];
  let skipped = 0;
  for (const item of incoming) {
    const key = fingerprint(item);
    if (ids.has(item.id) || fingerprints.has(key)) {
      skipped += 1;
      continue;
    }
    ids.add(item.id);
    fingerprints.add(key);
    added.push(item);
  }
  return { items: [...added, ...current], added: added.length, skipped };
}

export function mergeBackupPayload(
  current: Pick<BackupMergeResult, 'plan' | 'ideas' | 'history'>,
  incoming: Pick<BackupPayload, 'plan' | 'ideas' | 'history' | 'capacity' | 'preferences' | 'rewardPreferences' | 'easePreferences'>,
): BackupMergeResult {
  const plan = mergeCollection(current.plan, incoming.plan, planFingerprint);
  const ideas = mergeCollection(current.ideas, incoming.ideas, ideaFingerprint);
  const history = mergeCollection(current.history, incoming.history, historyFingerprint);
  return {
    plan: plan.items,
    ideas: ideas.items,
    history: history.items,
    added: { plan: plan.added, ideas: ideas.added, history: history.added },
    skipped: plan.skipped + ideas.skipped + history.skipped,
    adoptedSettings: current.plan.length || current.ideas.length || current.history.length
      ? null
      : { capacity: incoming.capacity, preferences: incoming.preferences, rewardPreferences: incoming.rewardPreferences, easePreferences: incoming.easePreferences },
  };
}
