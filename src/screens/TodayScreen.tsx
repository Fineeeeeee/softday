import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { CapacityPicker } from '../components/CapacityPicker';
import { SwipeFocusCard } from '../components/SwipeFocusCard';
import { useDailyArtwork } from '../hooks/useDailyArtwork';
import { findCurrentFocus, formatDeadlineLabel, toDateKey } from '../domain/planner';
import { getRecentCompletedHistory } from '../domain/recentHistory';
import { getFocusElapsedMinutes } from '../domain/focusSession';
import { spacing } from '../theme/tokens';
import { ActionMode, DayCapacity, FocusSession, HistoryEntry, IdeaItem, PlanItem, PlanSection, ReminderItem } from '../types';

type Props = {
  activeFocus: FocusSession | null;
  actionMode: ActionMode;
  capacity: DayCapacity;
  items: PlanItem[];
  onCapacityPlan: (capacity: DayCapacity) => void;
  onToggle: (id: string) => void;
  onOpen: (item: PlanItem) => void;
  onEndDay: () => void;
  onGeneratePlan: () => void;
  reminders: ReminderItem[];
  conflicts: string[];
  resurfaceIdea?: IdeaItem;
  onResurfaceToday: (idea: IdeaItem) => void;
  onResurfaceLater: (idea: IdeaItem) => void;
  history: HistoryEntry[];
  onStartFocus: (item: PlanItem) => void;
  onStartGentle: (item: PlanItem) => void;
  onAdjust: () => void;
  rewardSuggestion: { title: string; body: string } | null;
};

const labels: Record<PlanSection, string> = {
  important: '先做这件',
  wanted: '之后想做',
  optional: '如果还有空',
};

const capacityLabels: Record<DayCapacity, string> = { light: '轻松点', steady: '正常安排', open: '可以多一点' };

const screenPalettes = {
  light: {
    morning: { page: '#F1F3EF', card: '#FAFBF8', layer: '#E7EBE6', text: '#262B27', muted: '#737B75', accent: '#53675B', accentSoft: '#DCE4DD', secondaryText: '#657068', carryoverBackground: '#E5EAE5', carryoverText: '#657369', glow: ['rgba(133,152,139,0.20)', 'rgba(220,228,221,0.12)', 'rgba(241,243,239,0)'], sheetGlow: ['rgba(133,152,139,0.14)', 'rgba(250,251,248,0)'], primaryGradient: ['#53675B', '#53675B'], reveal: '#85988B' },
    daytime: { page: '#F1F3EF', card: '#FAFBF8', layer: '#E7EBE6', text: '#262B27', muted: '#737B75', accent: '#53675B', accentSoft: '#DCE4DD', secondaryText: '#657068', carryoverBackground: '#E5EAE5', carryoverText: '#657369', glow: ['rgba(133,152,139,0.15)', 'rgba(220,228,221,0.09)', 'rgba(241,243,239,0)'], sheetGlow: ['rgba(133,152,139,0.12)', 'rgba(250,251,248,0)'], primaryGradient: ['#53675B', '#53675B'], reveal: '#85988B' },
    evening: { page: '#F1F3EF', card: '#FAFBF8', layer: '#E7EBE6', text: '#262B27', muted: '#737B75', accent: '#53675B', accentSoft: '#DCE4DD', secondaryText: '#657068', carryoverBackground: '#E5EAE5', carryoverText: '#657369', glow: ['rgba(112,132,120,0.18)', 'rgba(220,228,221,0.08)', 'rgba(241,243,239,0)'], sheetGlow: ['rgba(112,132,120,0.13)', 'rgba(250,251,248,0)'], primaryGradient: ['#53675B', '#53675B'], reveal: '#74877A' },
  },
  dark: {
    morning: { page: '#171A18', card: '#282D29', layer: '#202421', text: '#EFF2EE', muted: '#A4ABA5', accent: '#B4C4B8', accentSoft: '#303A33', secondaryText: '#B5BDB7', carryoverBackground: '#303732', carryoverText: '#B4C4B8', glow: ['rgba(133,152,139,0.18)', 'rgba(23,26,24,0.10)', 'rgba(23,26,24,0)'], sheetGlow: ['rgba(133,152,139,0.15)', 'rgba(40,45,41,0)'], primaryGradient: ['#53675B', '#53675B'], reveal: '#53675B' },
    daytime: { page: '#171A18', card: '#282D29', layer: '#202421', text: '#EFF2EE', muted: '#A4ABA5', accent: '#B4C4B8', accentSoft: '#303A33', secondaryText: '#B5BDB7', carryoverBackground: '#303732', carryoverText: '#B4C4B8', glow: ['rgba(133,152,139,0.14)', 'rgba(23,26,24,0.08)', 'rgba(23,26,24,0)'], sheetGlow: ['rgba(133,152,139,0.13)', 'rgba(40,45,41,0)'], primaryGradient: ['#53675B', '#53675B'], reveal: '#53675B' },
    evening: { page: '#171A18', card: '#282D29', layer: '#202421', text: '#EFF2EE', muted: '#A4ABA5', accent: '#B4C4B8', accentSoft: '#303A33', secondaryText: '#B5BDB7', carryoverBackground: '#303732', carryoverText: '#B4C4B8', glow: ['rgba(105,124,112,0.16)', 'rgba(23,26,24,0.08)', 'rgba(23,26,24,0)'], sheetGlow: ['rgba(105,124,112,0.14)', 'rgba(40,45,41,0)'], primaryGradient: ['#53675B', '#53675B'], reveal: '#4B5C51' },
  },
} as const;

export function TodayScreen({ activeFocus, actionMode, capacity, items, onCapacityPlan, onToggle, onOpen, onEndDay, onGeneratePlan, onStartFocus, onStartGentle, reminders, conflicts, resurfaceIdea, onResurfaceToday, onResurfaceLater, history, onAdjust, rewardSuggestion }: Props) {
  const artwork = useDailyArtwork();
  const darkMode = useColorScheme() === 'dark';
  const [showCapacity, setShowCapacity] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showResurfaceActions, setShowResurfaceActions] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const visibleSections: PlanSection[] = ['important', 'wanted', 'optional'];
  const weekdayLabel = `星期${['日', '一', '二', '三', '四', '五', '六'][clock.getDay()] ?? ''}`;
  const todayLabel = `${clock.getMonth() + 1}月${clock.getDate()}日 ${weekdayLabel}`;
  const todayKey = toDateKey(clock);
  const focus = findCurrentFocus(items, activeFocus);
  const isActive = Boolean(focus && activeFocus?.itemId === focus.id);
  const remaining = items.filter((item) => !item.done && item.id !== focus?.id && visibleSections.includes(item.section));
  const completed = getRecentCompletedHistory(history);
  const todayCompleted = completed.filter((entry) => entry.date === toDateKey());
  const palette = screenPalettes[darkMode ? 'dark' : 'light'][artwork.period];
  const visibleReminder = reminders.find((reminder) => reminder.itemId !== focus?.id && reminder.kind !== 'review');
  const focusIsCarryover = Boolean(focus?.date && focus.date < todayKey);
  const slotLabel = focus?.timeSlot === 'morning' ? '上午' : focus?.timeSlot === 'afternoon' ? '下午' : focus?.timeSlot === 'evening' ? '晚上' : null;
  const focusTitle = focus?.resumePoint?.status === 'in_progress' ? focus.resumePoint.nextAction : focus?.title;
  const durationLabel = focus?.durationMinutes ? `${focus.durationMinutes} MIN` : focus?.duration;
  const elapsed = activeFocus ? getFocusElapsedMinutes(activeFocus, clock) : 0;
  const statusLabel = isActive ? `专注中 · ${elapsed < 1 ? '刚刚开始' : `${elapsed} 分钟`}` : `现在先做${durationLabel ? ` · ${durationLabel}` : ''}`;
  const focusMeta = focus ? [focus.resumePoint?.status === 'in_progress' ? focus.title : null, slotLabel, focus.deadline ? formatDeadlineLabel(focus.deadline) : null].filter(Boolean).join(' · ') : '';
  const remainingCount = remaining.length + (resurfaceIdea ? 1 : 0);
  const showSummary = todayCompleted.length > 0 || remainingCount > 0;
  const gentleAction = !isActive && clock.getHours() >= 18 && !todayCompleted.length && actionMode !== 'flowing'
    ? focus?.behaviorRecipe?.lowEnergyAction
    : undefined;

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: palette.page }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[palette.glow[0], palette.glow[1], palette.page]} end={{ x: 0.28, y: 1 }} locations={[0, 0.62, 1]} pointerEvents="none" start={{ x: 1, y: 0 }} style={styles.ambientGlow} />
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.date, { color: palette.muted }]}>{todayLabel}</Text>
          <Pressable onPress={() => setShowCapacity((value) => !value)} style={styles.capacityChip}><Text maxFontSizeMultiplier={1.15} style={[styles.capacityChipText, { color: palette.accent }]}>{capacityLabels[capacity]}</Text><Ionicons color={palette.accent} name={showCapacity ? 'chevron-up' : 'chevron-down'} size={14} /></Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {focus ? <SwipeFocusCard enabled={!isActive} onComplete={() => onToggle(focus.id)} revealColor={palette.reveal}>
          <View style={[styles.focusCard, { backgroundColor: palette.card }]}>
            <View style={styles.focusHeader}><Text maxFontSizeMultiplier={1.05} numberOfLines={1} style={[styles.focusEyebrow, { color: palette.accent }]}>{statusLabel}</Text>{focusIsCarryover ? <View style={[styles.carryoverTag, { backgroundColor: palette.carryoverBackground }]}><Text maxFontSizeMultiplier={1.05} style={[styles.carryoverTagText, { color: palette.carryoverText }]}>昨日顺延</Text></View> : null}</View>
            <View style={styles.titleRow}>
              {isActive ? <View style={styles.checkTarget}><View style={[styles.activeDot, { backgroundColor: palette.accent }]} /></View> : <Pressable accessibilityLabel={`完成${focus.title}`} hitSlop={10} onPress={() => onToggle(focus.id)} style={styles.checkTarget}><View style={[styles.checkRing, { borderColor: darkMode ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.20)' }]} /></Pressable>}
              <Pressable onPress={() => onOpen(focus)} style={styles.titlePressable}><Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={[styles.focusTitle, { color: palette.text }]}>{focusTitle}</Text></Pressable>
            </View>
            {focusMeta ? <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.focusMeta, { color: palette.muted }]}>{focusMeta}</Text> : null}
            <View style={styles.focusActions}>
              <Pressable onPress={() => isActive ? onToggle(focus.id) : onStartFocus(focus)} style={styles.primaryPressable}><LinearGradient colors={palette.primaryGradient} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={styles.primaryAction}><Text maxFontSizeMultiplier={1.15} style={styles.primaryActionText}>{isActive ? '完成任务' : focus.resumePoint?.status === 'in_progress' ? '接着做' : '开始一下'}</Text><Ionicons color="#DCE4DD" name={isActive ? 'checkmark' : 'arrow-forward'} size={17} /></LinearGradient></Pressable>
              <Pressable onPress={onAdjust} style={styles.secondaryAction}><Text maxFontSizeMultiplier={1.15} style={[styles.secondaryActionText, { color: palette.secondaryText }]}>情况变了</Text></Pressable>
            </View>
          </View>
        </SwipeFocusCard> : <View style={[styles.focusCard, styles.compactFocusCard, styles.paperShadow, { backgroundColor: palette.card }]}><Text style={[styles.focusEyebrow, { color: palette.accent }]}>今天</Text><Text style={[styles.emptyTitle, { color: palette.text }]}>先留一点空白</Text><Pressable onPress={onGeneratePlan} style={[styles.emptyAction, { backgroundColor: palette.accent }]}><Text style={styles.primaryActionText}>帮我看看今天</Text></Pressable></View>}

        {showSummary ? <View style={[styles.summaryCard, { backgroundColor: palette.layer }]}>
        {todayCompleted.length ? <>
          <Pressable onPress={() => setShowCompleted((value) => !value)} style={styles.groupHeader}>
            <Text maxFontSizeMultiplier={1.05} numberOfLines={1} style={[styles.cardTitle, { color: palette.muted }]}>{`今天做过 ${todayCompleted.length}`}</Text>
            <View style={styles.thinSpacer} />
            <Ionicons color={palette.muted} name={showCompleted ? 'chevron-up' : 'chevron-down'} size={16} />
          </Pressable>
          {showCompleted ? <><View style={[styles.divider, { backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(28,28,30,0.07)' }]} /><View style={styles.inlineList}>{todayCompleted.slice(0, 4).map((entry) => <View key={entry.id} style={styles.completedRow}><Ionicons color={palette.accent} name="checkmark" size={15} /><Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.completedTitle, { color: palette.text }]}>{entry.itemTitle}</Text><Text style={[styles.completedTime, { color: palette.muted }]}>{entry.occurredAt ? new Date(entry.occurredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</Text></View>)}</View></> : null}
        </> : null}
        {todayCompleted.length && remainingCount ? <View style={[styles.divider, { backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(28,28,30,0.07)' }]} /> : null}
        {remainingCount ? <>
        <Pressable onPress={() => setShowAll((value) => !value)} style={styles.groupHeader}><Text maxFontSizeMultiplier={1.05} numberOfLines={1} style={[styles.cardTitle, { color: palette.muted }]}>{`接下来还有 ${remainingCount}`}</Text><View style={styles.thinSpacer} /><Ionicons color={palette.muted} name={showAll ? 'chevron-up' : 'chevron-down'} size={16} /></Pressable>
        {showAll ? <><View style={[styles.divider, { backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(28,28,30,0.07)' }]} /><View style={styles.sections}>
          {visibleSections.map((section) => {
            const sectionItems = remaining.filter((item) => item.section === section);
            if (!sectionItems.length) return null;
            return <View key={section} style={styles.section}><Text style={[styles.sectionTitle, { color: palette.muted }]}>{labels[section]}</Text>{sectionItems.map((item) => {
              const itemSlot = item.timeSlot === 'morning' ? '上午' : item.timeSlot === 'afternoon' ? '下午' : item.timeSlot === 'evening' ? '晚上' : null;
              const itemDuration = item.duration === '时间还没定' || item.duration === '时间还设定' ? '时间未设定' : item.duration;
              const itemMeta = [item.date && item.date < todayKey ? '昨日' : null, itemSlot, itemDuration].filter(Boolean).join(' · ') || '时间未设定';
              return <View key={item.id} style={[styles.taskRow, { borderBottomColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(28,28,30,0.06)' }]}><Pressable accessibilityLabel={`完成${item.title}`} hitSlop={8} onPress={() => onToggle(item.id)} style={styles.taskCheck}><View style={[styles.taskRing, { borderColor: darkMode ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.18)' }]} /></Pressable><Pressable onPress={() => onOpen(item)} style={styles.taskCopy}><Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.taskTitle, { color: palette.text }]}>{item.title}</Text><Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={[styles.taskMeta, { color: palette.muted }]}>{itemMeta}</Text></Pressable></View>;
            })}</View>;
          })}
          {resurfaceIdea ? <View style={styles.section}><Text style={[styles.sectionTitle, { color: palette.muted }]}>之前留下</Text><Pressable onPress={() => setShowResurfaceActions((value) => !value)} style={[styles.resurfaceRow, { borderBottomColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(28,28,30,0.06)' }]}><View style={[styles.taskRing, { borderColor: darkMode ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.18)' }]} /><View style={styles.taskCopy}><Text numberOfLines={1} style={[styles.taskTitle, { color: palette.text }]}>{resurfaceIdea.title}</Text><Text style={[styles.taskMeta, { color: palette.muted }]}>轻点看看</Text></View></Pressable>{showResurfaceActions ? <View style={styles.resurfaceActions}><Pressable onPress={() => onResurfaceLater(resurfaceIdea)} style={[styles.resurfaceAction, { backgroundColor: palette.accentSoft }]}><Text style={[styles.resurfaceActionText, { color: palette.secondaryText }]}>过几天</Text></Pressable><Pressable onPress={() => onResurfaceToday(resurfaceIdea)} style={[styles.resurfaceAction, { backgroundColor: palette.accent }]}><Text style={styles.resurfaceTodayText}>放到今天</Text></Pressable></View> : null}</View> : null}
        </View></> : null}
        </> : null}
        </View> : null}

        {conflicts.length ? <View style={[styles.conflict, { backgroundColor: palette.accentSoft }]}><Text style={[styles.conflictText, { color: palette.secondaryText }]}>{conflicts[0]}</Text></View>
          : visibleReminder ? <Pressable onPress={() => { const item = items.find((entry) => entry.id === visibleReminder.itemId); if (item) onOpen(item); }} style={styles.reminder}><View style={[styles.reminderDot, { backgroundColor: palette.accent }]} /><View style={styles.reminderCopy}><Text style={[styles.reminderTitle, { color: palette.text }]}>{visibleReminder.title}</Text><Text style={[styles.reminderBody, { color: palette.muted }]}>{visibleReminder.body}</Text></View></Pressable>
            : gentleAction && focus ? <Pressable onPress={() => onStartGentle(focus)} style={[styles.gentleAction, { backgroundColor: palette.accentSoft }]}><View style={styles.rewardCopy}><Text style={[styles.rewardTitle, { color: palette.text }]}>现在只做一点</Text><Text numberOfLines={2} style={[styles.rewardBody, { color: palette.secondaryText }]}>{gentleAction}</Text></View><Text style={[styles.gentleActionButton, { color: palette.accent }]}>就来一下</Text></Pressable>
              : rewardSuggestion ? <View style={[styles.reward, { backgroundColor: palette.accentSoft }]}><Ionicons color={palette.accent} name="leaf-outline" size={18} /><View style={styles.rewardCopy}><Text style={[styles.rewardTitle, { color: palette.text }]}>{rewardSuggestion.title}</Text><Text style={[styles.rewardBody, { color: palette.secondaryText }]}>{rewardSuggestion.body}</Text></View></View> : null}
      </View>
      <Modal animationType="fade" onRequestClose={() => setShowCapacity(false)} transparent visible={showCapacity}>
        <Pressable accessibilityLabel="关闭安排方式" onPress={() => setShowCapacity(false)} style={styles.sheetBackdrop} />
        <View style={[styles.capacitySheet, { backgroundColor: palette.card }]}>
          <LinearGradient colors={palette.sheetGlow} end={{ x: 0.15, y: 1 }} pointerEvents="none" start={{ x: 0.85, y: 0 }} style={styles.sheetGlow} />
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: palette.text }]}>今天留多少空间</Text>
          <Text style={[styles.sheetSubtitle, { color: palette.muted }]}>选完先看变化，再决定要不要调整。</Text>
          <CapacityPicker onChange={(nextCapacity) => { setShowCapacity(false); onCapacityPlan(nextCapacity); }} value={capacity} />
          <View style={[styles.menuDivider, { backgroundColor: palette.accentSoft }]} />
          <View style={styles.menuActions}>
            <Pressable onPress={() => { setShowCapacity(false); onGeneratePlan(); }} style={styles.menuAction}><Ionicons color={palette.accent} name="add" size={18} /><Text style={[styles.menuActionText, { color: palette.text }]}>{items.length ? '再放一件' : '看看今天'}</Text></Pressable>
            <Pressable onPress={() => { setShowCapacity(false); onEndDay(); }} style={styles.menuAction}><Ionicons color={palette.accent} name="moon-outline" size={17} /><Text style={[styles.menuActionText, { color: palette.text }]}>收个尾</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: '100%', paddingBottom: 132, position: 'relative' },
  ambientGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  hero: { height: 132, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  date: { flex: 1, fontSize: 14, fontWeight: '500', letterSpacing: 0.1 },
  capacityChip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  capacityChipText: { fontSize: 13, fontWeight: '600' },
  body: { minHeight: 560, gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  paperShadow: { boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 36, spreadDistance: -10, color: 'rgba(38,43,39,0.10)' }, { offsetX: 0, offsetY: 3, blurRadius: 10, spreadDistance: -3, color: 'rgba(38,43,39,0.05)' }] },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,30,29,0.18)' },
  capacitySheet: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 32, borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: [{ offsetX: 0, offsetY: -8, blurRadius: 32, spreadDistance: -8, color: 'rgba(24,24,28,0.10)' }] },
  sheetGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 124, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(115,123,117,0.34)' },
  sheetTitle: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
  sheetSubtitle: { fontSize: 12, lineHeight: 18, marginTop: -8 },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.xs },
  menuActions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  menuAction: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12 },
  menuActionText: { fontSize: 14, fontWeight: '600' },
  focusCard: { minHeight: 230, padding: 22, borderRadius: 24 },
  compactFocusCard: { minHeight: 160 },
  focusHeader: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  focusEyebrow: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0.25 },
  carryoverTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  carryoverTagText: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 15 },
  checkTarget: { width: 26, height: 30, alignItems: 'center', justifyContent: 'center' },
  checkRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  activeDot: { width: 9, height: 9, borderRadius: 5, marginTop: 1 },
  titlePressable: { flex: 1 },
  focusTitle: { fontSize: 22, lineHeight: 29, fontWeight: '600', letterSpacing: -0.35 },
  focusMeta: { marginLeft: 37, marginTop: 8, fontSize: 12, lineHeight: 18 },
  focusActions: { flexDirection: 'row', gap: 9, marginTop: 'auto', paddingTop: 20 },
  primaryPressable: { flex: 2.05, borderRadius: 12, overflow: 'hidden' },
  primaryAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12 },
  primaryActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondaryAction: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontSize: 14, fontWeight: '600' },
  emptyTitle: { marginTop: 16, fontSize: 22, lineHeight: 29, fontWeight: '600' },
  emptyAction: { alignSelf: 'flex-start', minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: 'auto', borderRadius: 12 },
  summaryCard: { overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 24 },
  groupHeader: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  cardTitle: { flexShrink: 0, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  thinSpacer: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 2 },
  inlineList: { gap: 2, paddingVertical: 6 },
  completedRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completedTitle: { flex: 1, fontSize: 13, fontWeight: '500', opacity: 0.52, textDecorationLine: 'line-through' },
  completedTime: { width: 42, fontSize: 11, textAlign: 'right', fontVariant: ['tabular-nums'] },
  emptyInline: { paddingVertical: 8, fontSize: 13 },
  sections: { gap: spacing.lg, paddingTop: 3, paddingBottom: 4 },
  taskRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  taskCheck: { width: 28, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  taskRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  taskCopy: { flex: 1, gap: 3 },
  taskTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  taskMeta: { fontSize: 12, lineHeight: 16 },
  resurfaceRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 5, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  resurfaceActions: { flexDirection: 'row', gap: 8 },
  resurfaceAction: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  resurfaceActionText: { fontSize: 13, fontWeight: '600' },
  resurfaceTodayText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  reminder: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, marginTop: spacing.sm },
  reward: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 16 },
  gentleAction: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 16 },
  gentleActionButton: { fontSize: 13, fontWeight: '600' },
  rewardCopy: { flex: 1, gap: 2 },
  rewardTitle: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  rewardBody: { fontSize: 12, lineHeight: 18 },
  reminderDot: { width: 8, height: 8, borderRadius: 4 },
  reminderCopy: { flex: 1, gap: 3 },
  reminderTitle: { fontSize: 14, fontWeight: '500' },
  reminderBody: { fontSize: 12 },
  conflict: { marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: 14 },
  conflictText: { fontSize: 13, lineHeight: 19 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
});
