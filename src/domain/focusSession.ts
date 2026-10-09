import type { FocusSession, PlanItem } from '../types';

export function startFocusSession(item: PlanItem, now = new Date()): FocusSession {
  return { itemId: item.id, startedAt: now.toISOString() };
}

export function keepValidFocusSession(session: FocusSession | null, plan: PlanItem[]) {
  if (!session) return null;
  return plan.some((item) => item.id === session.itemId && !item.done && !item.waitingFor) ? session : null;
}

export function clearFocusForItem(session: FocusSession | null, itemId: string) {
  return session?.itemId === itemId ? null : session;
}

export function getFocusElapsedMinutes(session: FocusSession, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(session.startedAt)) / 60_000));
}
