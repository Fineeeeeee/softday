import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompletionNotificationCopy, getDeadlineNotificationCopy, getFocusNotificationCopy } from './notificationPresentation.ts';
import type { PlanItem } from '../types/index.ts';

const item: PlanItem = { id: 'one', title: '在家跟着一首歌活动身体', duration: '10 分钟', section: 'wanted' };

test('notification copy keeps one task and the same restrained hierarchy', () => {
  assert.deepEqual(getFocusNotificationCopy(item), { title: '现在先做', body: item.title, subtitle: 'Softday' });
  assert.deepEqual(getDeadlineNotificationCopy(item), { title: '快到时间了', body: item.title, subtitle: 'Softday' });
  assert.deepEqual(getCompletionNotificationCopy('可以停一停了。'), { title: '今天先到这里', body: '可以停一停了。', subtitle: 'Softday' });
});
