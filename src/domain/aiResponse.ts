import { inferRemainingMinutes, isDateKey, normalizePlan, toDateKey } from './planner.ts';
import { captureLimits } from './parseCapture.ts';
import { isRecurrenceRule } from './recurrence.ts';
import type { ActionMode, AiHistoryReview, BehaviorRecipeDraft, CaptureBatchDraft, CaptureDraft, DayCapacity, HistoryEntry, PlanItem, ReplanProposal, ResumePointDraft, ResumeStatus, SimplifyDraft, TimeSlot } from '../types';

type RecordValue = Record<string, unknown>;
type AiReplanAction = 'keep' | 'tomorrow';

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown, maxLength = 120) {
  return typeof value === 'string' && value.trim() && value.trim().length <= maxLength ? value.trim() : null;
}

function isTimeSlot(value: unknown): value is TimeSlot {
  return value === 'morning' || value === 'afternoon' || value === 'evening' || value === 'anytime';
}

function readRemainingSteps(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < 1 || value.length > 7) return null;
  const steps: { title: string; durationMinutes: number }[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) return null;
    const title = readString(raw.title, 80);
    const durationMinutes = raw.durationMinutes;
    if (!title || typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 2 || durationMinutes > 180) return null;
    steps.push({ title, durationMinutes });
  }
  return steps;
}

export function createCaptureBatchDraftFromAi(value: unknown, originalText: string): CaptureBatchDraft | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > captureLimits.maxItems) return null;
  const normalizedInput = originalText.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const labels = { today: '今天', tomorrow: '明天', week: '这周', someday: '以后再说' } as const;
  const seenTitles = new Set<string>();
  const items: CaptureDraft[] = [];

  for (const raw of value.items) {
    if (!isRecord(raw)) return null;
    const title = readString(raw.title, 80);
    const sourceExcerpt = readString(raw.sourceExcerpt, 240);
    const projectTitle = raw.projectTitle === null || raw.projectTitle === undefined ? null : readString(raw.projectTitle, 80);
    const timing = raw.timing;
    const section = raw.section;
    const timeSlot = raw.timeSlot;
    const durationMinutes = raw.durationMinutes;
    const deadline = raw.deadline;
    const recurrence = raw.recurrence;
    const remainingSteps = readRemainingSteps(raw.remainingSteps);
    if (!title || !sourceExcerpt || !normalizedInput.includes(sourceExcerpt.replace(/\s+/g, ' ').trim().toLocaleLowerCase())) return null;
    if (raw.projectTitle !== null && raw.projectTitle !== undefined && !projectTitle) return null;
    if (!['today', 'tomorrow', 'week', 'someday'].includes(String(timing)) || !['important', 'wanted', 'optional'].includes(String(section)) || !isTimeSlot(timeSlot)) return null;
    if (durationMinutes !== null && durationMinutes !== undefined && (typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720)) return null;
    if (deadline !== null && deadline !== undefined && (typeof deadline !== 'string' || !isDateKey(deadline))) return null;
    if (recurrence !== null && recurrence !== undefined && !isRecurrenceRule(recurrence)) return null;
    if (remainingSteps === null) return null;

    const titleKey = title.replace(/[\s，。！？、,.!?：:；;（）()《》“”"']/g, '').toLocaleLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    const placement = timing as keyof typeof labels;
    const minutes = typeof durationMinutes === 'number' ? durationMinutes : undefined;
    items.push({
      originalText: sourceExcerpt,
      title,
      projectTitle: projectTitle && projectTitle !== title ? projectTitle : undefined,
      timing: placement,
      destination: placement === 'today' ? 'today' : 'ideas',
      section: section as CaptureDraft['section'],
      duration: minutes ? `${minutes} 分钟` : '时间还没定',
      durationMinutes: minutes,
      timingLabel: labels[placement],
      deadline: typeof deadline === 'string' ? deadline : undefined,
      timeSlot,
      recurrence: isRecurrenceRule(recurrence) ? recurrence : undefined,
      recurrenceSuggestion: isRecurrenceRule(recurrence) ? '听起来会重复，要不要这样放？' : undefined,
      remainingSteps,
    });
  }

  return { originalText: originalText.trim(), items };
}

export function createReplanProposalFromAi(value: unknown, items: PlanItem[], reason: string, capacity: DayCapacity): ReplanProposal | null {
  if (!isRecord(value) || !Array.isArray(value.changes)) return null;
  const active = normalizePlan(items).filter((item) => !item.done && !item.waitingFor);
  const completedOrWaiting = normalizePlan(items).filter((item) => item.done || item.waitingFor);
  if (value.changes.length !== active.length) return null;

  const actions = new Map<string, AiReplanAction>();
  for (const change of value.changes) {
    if (!isRecord(change) || typeof change.itemId !== 'string' || (change.action !== 'keep' && change.action !== 'tomorrow') || actions.has(change.itemId)) return null;
    actions.set(change.itemId, change.action);
  }
  if (active.some((item) => !actions.has(item.id))) return null;

  const deadlineItems = active.filter((item) => item.deadline);
  const keptFlexible = active.filter((item) => !item.deadline && actions.get(item.id) === 'keep');
  const remainingMinutes = inferRemainingMinutes(reason, capacity);
  const deadlineMinutes = deadlineItems.reduce((sum, item) => sum + (item.durationMinutes ?? 30), 0);
  const flexibleBudget = Math.max(0, remainingMinutes - deadlineMinutes);
  const keptFlexibleMinutes = keptFlexible.reduce((sum, item) => sum + (item.durationMinutes ?? 30), 0);
  const oneImportantAnchor = deadlineItems.length === 0 && keptFlexible.length === 1 && keptFlexible[0]?.section === 'important';
  if (keptFlexibleMinutes > flexibleBudget && !oneImportantAnchor) return null;

  const nextPlan: PlanItem[] = [...completedOrWaiting];
  const returnedIdeas: ReplanProposal['returnedIdeas'] = [];
  const changes: ReplanProposal['changes'] = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const item of active) {
    const action = actions.get(item.id);
    if (!action || item.deadline && action !== 'keep') return null;
    if (action === 'keep') {
      nextPlan.push({ ...item, date: toDateKey() });
      changes.push({ itemId: item.id, title: item.title, kind: 'keep' });
      continue;
    }
    returnedIdeas.push({ id: `ai-later-${item.id}-${Date.now()}`, title: item.behaviorRecipe?.intentTitle ?? item.title, context: '明天再看看', timing: 'tomorrow', durationMinutes: item.behaviorRecipe?.ordinaryMinutes ?? item.durationMinutes, createdAt: new Date().toISOString(), availableOn: toDateKey(tomorrow), projectTitle: item.projectTitle, remainingSteps: item.remainingSteps, resumePoint: item.resumePoint, recurrence: item.recurrence, recurrenceSeriesId: item.recurrenceSeriesId, behaviorRecipe: item.behaviorRecipe });
    changes.push({ itemId: item.id, title: item.title, kind: 'later' });
  }

  return { reason, changes, nextPlan, returnedIdeas };
}

export function createSimplifyDraftFromAi(value: unknown, item: PlanItem): SimplifyDraft | null {
  if (!isRecord(value) || !Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 4) return null;
  const steps: SimplifyDraft['steps'] = [];
  for (const step of value.steps) {
    if (!isRecord(step)) return null;
    const title = readString(step.title, 80);
    const durationMinutes = step.durationMinutes;
    if (!title || typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 2 || durationMinutes > 60) return null;
    steps.push({ title, durationMinutes });
  }
  return { itemId: item.id, projectTitle: item.projectTitle ?? item.title, steps };
}

export function createBehaviorRecipeDraftFromAi(
  value: unknown,
  item: PlanItem,
  frictionNote: string,
  actionMode: ActionMode,
): BehaviorRecipeDraft | null {
  if (!isRecord(value)) return null;
  const ordinaryAction = readString(value.ordinaryAction, 80);
  const lowEnergyAction = readString(value.lowEnergyAction, 80);
  const ordinaryMinutes = value.ordinaryMinutes;
  const lowEnergyMinutes = value.lowEnergyMinutes;
  if (!ordinaryAction || !lowEnergyAction || ordinaryAction === lowEnergyAction) return null;
  if (typeof ordinaryMinutes !== 'number' || !Number.isInteger(ordinaryMinutes) || ordinaryMinutes < 2 || ordinaryMinutes > 60) return null;
  if (typeof lowEnergyMinutes !== 'number' || !Number.isInteger(lowEnergyMinutes) || lowEnergyMinutes < 1 || lowEnergyMinutes > 5 || lowEnergyMinutes > ordinaryMinutes) return null;
  return {
    itemId: item.id,
    actionMode,
    intentTitle: item.behaviorRecipe?.intentTitle ?? item.projectTitle ?? item.title,
    ordinaryAction,
    ordinaryMinutes,
    lowEnergyAction,
    lowEnergyMinutes,
    frictionNote: frictionNote.trim(),
  };
}

export function createResumePointDraftFromAi(value: unknown, item: PlanItem, selectedStatus: ResumeStatus): ResumePointDraft | null {
  if (!isRecord(value) || value.status !== selectedStatus) return null;
  const progressSummary = readString(value.progressSummary, 80);
  const nextAction = readString(value.nextAction, 80);
  const waitingFor = value.waitingFor === null || value.waitingFor === undefined ? undefined : readString(value.waitingFor, 80);
  if (!progressSummary || !nextAction || value.waitingFor !== null && value.waitingFor !== undefined && !waitingFor) return null;
  if (selectedStatus === 'waiting' && !waitingFor || selectedStatus !== 'waiting' && waitingFor) return null;
  return { itemId: item.id, status: selectedStatus, progressSummary, nextAction, waitingFor: waitingFor ?? undefined };
}

export function createHistoryReviewFromAi(value: unknown, entries: HistoryEntry[]): AiHistoryReview | null {
  if (!isRecord(value) || !Array.isArray(value.observations) || value.observations.length > 3 || !Array.isArray(value.mentionedEntryIds) || value.mentionedEntryIds.length > 8) return null;
  const summary = readString(value.summary, 300);
  const question = value.question === null || value.question === undefined ? undefined : readString(value.question, 80);
  const observations = value.observations.map((item) => readString(item, 100));
  if (!summary || observations.some((item) => !item) || value.question !== null && value.question !== undefined && !question) return null;
  const validIds = new Set(entries.map((entry) => entry.id));
  if (value.mentionedEntryIds.some((id) => typeof id !== 'string' || !validIds.has(id))) return null;
  return {
    summary,
    observations: observations as string[],
    mentionedEntryIds: [...new Set(value.mentionedEntryIds as string[])],
    question: question ?? undefined,
  };
}
