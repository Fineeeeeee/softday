import type { PlanItem } from '../types';

export function getFocusNotificationCopy(item: PlanItem) {
  return { title: '现在先做', body: item.title, subtitle: 'Softday' };
}

export function getDeadlineNotificationCopy(item: PlanItem) {
  return { title: '快到时间了', body: item.title, subtitle: 'Softday' };
}

export function getCompletionNotificationCopy(body: string) {
  return { title: '今天先到这里', body, subtitle: 'Softday' };
}
