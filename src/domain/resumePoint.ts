import type { PlanItem, ResumePointDraft, ResumeStatus } from '../types';

const statusLabels: Record<ResumeStatus, string> = {
  not_started: '还没开始',
  in_progress: '做到一半',
  waiting: '在等条件',
};

export function createLocalResumePointDraft(item: PlanItem, status: ResumeStatus, note: string): ResumePointDraft {
  const summary = note.trim() || statusLabels[status];
  return {
    itemId: item.id,
    status,
    progressSummary: summary,
    nextAction: status === 'in_progress' && item.resumePoint?.nextAction ? item.resumePoint.nextAction : item.title,
    waitingFor: status === 'waiting' ? summary : undefined,
  };
}

export function applyResumePointDraft(item: PlanItem, draft: ResumePointDraft, now = new Date()): PlanItem {
  if (draft.itemId !== item.id) return item;
  return {
    ...item,
    waitingFor: draft.status === 'waiting' ? draft.waitingFor ?? draft.progressSummary : undefined,
    resumePoint: {
      status: draft.status,
      progressSummary: draft.progressSummary,
      nextAction: draft.nextAction,
      waitingFor: draft.status === 'waiting' ? draft.waitingFor : undefined,
      recordedAt: now.toISOString(),
    },
  };
}
