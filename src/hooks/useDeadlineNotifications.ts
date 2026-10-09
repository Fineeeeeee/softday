import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getDeadlineNotificationDate } from '../domain/planner';
import { getCompletionNotificationCopy, getDeadlineNotificationCopy, getFocusNotificationCopy } from '../domain/notificationPresentation';
import { PlanItem } from '../types';

type NotificationStatus = 'checking' | 'granted' | 'denied' | 'undetermined' | 'unsupported' | 'error';

const deadlineChannelId = 'softday-deadlines';
const focusChannelId = 'softday-focus';
const notificationColor = '#71877A';
const source = 'softday-deadline';
const testSource = 'softday-notification-test';
const focusSource = 'softday-current-focus';
const completionSource = 'softday-day-complete';
const focusCategory = 'softday-focus-actions';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(deadlineChannelId, {
      name: '快到时间的事情',
      description: '只提醒有明确截止日期的事情',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: null,
    });
    await Notifications.setNotificationChannelAsync(focusChannelId, {
      name: '现在先做',
      description: '把当前的一件事安静地放在通知栏',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
    });
  }
  await Notifications.setNotificationCategoryAsync(focusCategory, [
    { identifier: 'simplify', buttonTitle: '只做一点', options: { opensAppToForeground: true } },
    { identifier: 'defer', buttonTitle: '明天再看', options: { opensAppToForeground: true } },
  ]);
}

async function replaceFocusNotification(item: PlanItem | undefined, enabled: boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((notification) => notification.content.data?.source === focusSource).map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(presented.filter((notification) => notification.request.content.data?.source === focusSource).map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier)));
  if (!enabled || !item) return;
  const copy = getFocusNotificationCopy(item);
  await Notifications.scheduleNotificationAsync({
    content: { ...copy, color: notificationColor, priority: Notifications.AndroidNotificationPriority.LOW, data: { source: focusSource, itemId: item.id }, categoryIdentifier: focusCategory, sound: false },
    trigger: null,
  });
}

async function showCompletionNotification(body: string) {
  await Notifications.scheduleNotificationAsync({ content: { ...getCompletionNotificationCopy(body), color: notificationColor, data: { source: completionSource }, sound: false }, trigger: null });
}

async function replaceDeadlineNotifications(plan: PlanItem[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content.data?.source === source)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));

  const pending = plan.filter((item) => !item.done && item.deadline);
  await Promise.all(pending.map(async (item) => {
    const date = item.deadline ? getDeadlineNotificationDate(item.deadline) : null;
    if (!date) return;
    const copy = getDeadlineNotificationCopy(item);
    await Notifications.scheduleNotificationAsync({
      content: {
        ...copy,
        color: notificationColor,
        data: { source, itemId: item.id },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === 'android' ? deadlineChannelId : undefined,
      },
    });
  }));
}

async function replaceTestNotification() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content.data?.source === testSource)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '提醒已经开启',
      subtitle: 'Softday',
      body: '以后有需要时，会安静地放在这里。',
      color: notificationColor,
      data: { source: testSource },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 8_000),
      channelId: Platform.OS === 'android' ? deadlineChannelId : undefined,
    },
  });
}

export function useDeadlineNotifications(plan: PlanItem[], currentItem: PlanItem | undefined, focusEnabled: boolean, completedTodayCount: number, completionMessage?: string) {
  const [status, setStatus] = useState<NotificationStatus>(Platform.OS === 'web' ? 'unsupported' : 'checking');
  const [action, setAction] = useState<{ kind: 'simplify' | 'defer'; itemId: string } | null>(null);
  const scheduleQueue = useRef(Promise.resolve());
  const previousPendingCount = useRef(plan.filter((item) => !item.done && !item.waitingFor).length);
  const previousCompletedCount = useRef(completedTodayCount);

  const refreshPermission = useCallback(async () => {
    if (Platform.OS === 'web') return 'unsupported' as const;
    try {
      await ensureAndroidChannel();
      const permission = await Notifications.getPermissionsAsync();
      setStatus(permission.status);
      return permission.status;
    } catch {
      setStatus('error');
      return 'error' as const;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') return 'unsupported' as const;
    try {
      await ensureAndroidChannel();
      const permission = await Notifications.requestPermissionsAsync();
      setStatus(permission.status);
      return permission.status;
    } catch {
      setStatus('error');
      return 'error' as const;
    }
  }, []);

  const scheduleTestNotification = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    try {
      await ensureAndroidChannel();
      const permission = await Notifications.getPermissionsAsync();
      setStatus(permission.status);
      if (permission.status !== 'granted') return false;
      await replaceTestNotification();
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  useEffect(() => {
    if (status !== 'granted') return;
    scheduleQueue.current = scheduleQueue.current
      .then(() => replaceDeadlineNotifications(plan))
      .catch(() => setStatus('error'));
  }, [plan, status]);

  useEffect(() => {
    if (status !== 'granted') return;
    scheduleQueue.current = scheduleQueue.current.then(() => replaceFocusNotification(currentItem, focusEnabled)).catch(() => setStatus('error'));
  }, [currentItem?.id, focusEnabled, plan, status]);

  useEffect(() => {
    const pendingCount = plan.filter((item) => !item.done && !item.waitingFor).length;
    const justCompletedAll = previousPendingCount.current > 0 && pendingCount === 0 && completedTodayCount > previousCompletedCount.current;
    previousPendingCount.current = pendingCount;
    previousCompletedCount.current = completedTodayCount;
    if (!justCompletedAll || status !== 'granted') return;
    scheduleQueue.current = scheduleQueue.current.then(() => showCompletionNotification(completionMessage ?? '今天就到这里，辛苦了。')).catch(() => setStatus('error'));
  }, [completedTodayCount, completionMessage, plan, status]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const kind = response.actionIdentifier;
      const itemId = response.notification.request.content.data?.itemId;
      if ((kind === 'simplify' || kind === 'defer') && typeof itemId === 'string') setAction({ kind, itemId });
    });
    return () => subscription.remove();
  }, []);

  return { status, action, clearAction: () => setAction(null), requestPermission, scheduleTestNotification };
}
