import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, elevation, radii, spacing } from '../theme/tokens';
import { suggestDeferDestination } from '../domain/planner';
import { recurrenceLabel } from '../domain/recurrence';
import { DeferDestination, PlanItem, TimeSlot } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = {
  item: PlanItem | null;
  isCurrent: boolean;
  onClose: () => void;
  onBringForward: (item: PlanItem) => void;
  onStartSmall: (item: PlanItem) => void;
  onAdapt: (item: PlanItem) => void;
  onDefer: (item: PlanItem, destination: DeferDestination) => void;
  onRemove: (item: PlanItem) => void;
  onWait: (item: PlanItem, reason: string) => void;
  onChangeTimeSlot: (item: PlanItem, slot: TimeSlot) => void;
  onEdit: (item: PlanItem) => void;
  onPausePoint: (item: PlanItem) => void;
  onSkipRecurrence: (item: PlanItem) => void;
  onPauseRecurrence: (item: PlanItem, option: 'threeDays' | 'week' | 'indefinite') => void;
};

const timeSlots: { value: TimeSlot; label: string }[] = [
  { value: 'anytime', label: '随时' },
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
];

const deferOptions: { value: DeferDestination; label: string }[] = [
  { value: 'tomorrow', label: '明天' },
  { value: 'weekend', label: '周末' },
  { value: 'free', label: '有空时' },
  { value: 'someday', label: '暂时收起' },
];

export function ItemSheet({ item, isCurrent, onClose, onBringForward, onStartSmall, onAdapt, onDefer, onRemove, onWait, onChangeTimeSlot, onEdit, onPausePoint, onSkipRecurrence, onPauseRecurrence }: Props) {
  const [showWait, setShowWait] = useState(false);
  const [showDefer, setShowDefer] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showRecurrencePause, setShowRecurrencePause] = useState(false);
  const [waitReason, setWaitReason] = useState('');
  const canResume = item?.resumePoint?.status === 'in_progress';

  useEffect(() => {
    setShowWait(false);
    setShowDefer(false);
    setShowMore(false);
    setShowRecurrencePause(false);
    setWaitReason('');
  }, [item?.id]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={item !== null}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      {item ? (
        <KeyboardAwareSheet style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{item.duration}{item.recurrence ? ` · ${recurrenceLabel(item.recurrence)}` : ''}</Text>
          {item.detail ? <Text numberOfLines={2} style={styles.detail}>{item.detail}</Text> : null}
          {item.resumePoint ? <View style={styles.resumeCard}><Text style={styles.resumeLabel}>{item.resumePoint.status === 'waiting' ? '正在等' : '上次停在'}</Text><Text style={styles.resumeText}>{item.resumePoint.status === 'waiting' ? item.resumePoint.waitingFor : item.resumePoint.progressSummary}</Text><Text style={styles.resumeNext}>接下来：{item.resumePoint.nextAction}</Text></View> : null}
          <Text style={styles.question}>{isCurrent ? (canResume ? '接下来' : '先从哪里开始？') : '现在想先做它？'}</Text>
          <Pressable
            accessibilityLabel={isCurrent ? (canResume ? '接着做五分钟' : '先做五分钟') : '先做这件'}
            onPress={() => isCurrent ? onStartSmall(item) : onBringForward(item)}
            style={styles.start}
          >
            <Ionicons color={colors.white} name={isCurrent ? 'timer-outline' : 'arrow-up-outline'} size={22} />
            <View style={styles.copy}>
              <Text style={styles.startTitle}>{isCurrent ? (canResume ? '接着做 5 分钟' : item.behaviorRecipe ? '今天只做一点' : '先做 5 分钟') : '先做这件'}</Text>
              <Text numberOfLines={1} style={styles.startText}>{isCurrent ? item.behaviorRecipe?.lowEnergyAction ?? '只开始一点' : '把它提到前面'}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => onPausePoint(item)} style={styles.row}>
            <Ionicons color={colors.accentDark} name="bookmark-outline" size={21} />
            <View style={styles.copy}><Text style={styles.rowTitle}>先停一下</Text><Text style={styles.rowText}>记住做到哪了</Text></View>
          </Pressable>
          <Pressable onPress={() => onAdapt(item)} style={styles.row}>
            <Ionicons color={colors.accentDark} name="footsteps-outline" size={21} />
            <View style={styles.copy}><Text style={styles.rowTitle}>换个更顺的做法</Text><Text style={styles.rowText}>{item.behaviorRecipe ? '哪里不方便，还可以再调' : '说说哪里不太方便'}</Text></View>
          </Pressable>
          <Pressable onPress={() => onDefer(item, suggestDeferDestination(item))} style={styles.deferRecommended}>
            <Ionicons color={colors.accentDark} name="leaf-outline" size={21} />
            <View style={styles.copy}><Text style={styles.rowTitle}>今天先不碰</Text><Text style={styles.rowText}>{suggestDeferDestination(item) === 'tomorrow' ? '明天再轻轻提起' : '有余地时再出现'}</Text></View>
          </Pressable>
          <Pressable onPress={() => setShowMore((current) => !current)} style={styles.moreToggle}><Text style={styles.moreText}>{showMore ? '收起' : '更多'}</Text><Ionicons color={colors.textMuted} name={showMore ? 'chevron-up' : 'chevron-down'} size={17} /></Pressable>
          {showMore ? <View style={styles.moreBox}>
          <View style={styles.slots}>{timeSlots.map((slot) => { const active = (item.timeSlot ?? 'anytime') === slot.value; return <Pressable key={slot.value} onPress={() => onChangeTimeSlot(item, slot.value)} style={[styles.slot, active && styles.slotActive]}><Text style={[styles.slotText, active && styles.slotTextActive]}>{slot.label}</Text></Pressable>; })}</View>
          <Pressable onPress={() => onEdit(item)} style={styles.edit}><Ionicons color={colors.accentDark} name="create-outline" size={18} /><Text style={styles.editText}>改标题、时间或重复</Text></Pressable>
          {item.recurrence ? <>
            <Pressable onPress={() => onSkipRecurrence(item)} style={styles.row}><Ionicons color={colors.accentDark} name="play-skip-forward-outline" size={21} /><View style={styles.copy}><Text style={styles.rowTitle}>今天跳过</Text><Text style={styles.rowText}>下一次照常出现</Text></View></Pressable>
            {showRecurrencePause ? <View style={styles.deferBox}><Text style={styles.deferTitle}>停到什么时候</Text><View style={styles.deferOptions}><Pressable onPress={() => onPauseRecurrence(item, 'threeDays')} style={styles.deferOption}><Text style={styles.deferText}>3 天后</Text></Pressable><Pressable onPress={() => onPauseRecurrence(item, 'week')} style={styles.deferOption}><Text style={styles.deferText}>一周后</Text></Pressable><Pressable onPress={() => onPauseRecurrence(item, 'indefinite')} style={styles.deferOption}><Text style={styles.deferText}>暂时不定</Text></Pressable></View></View> : <Pressable onPress={() => setShowRecurrencePause(true)} style={styles.row}><Ionicons color={colors.accentDark} name="pause-outline" size={21} /><View style={styles.copy}><Text style={styles.rowTitle}>暂停重复</Text><Text style={styles.rowText}>到合适的时候再回来</Text></View></Pressable>}
          </> : null}
          {showDefer ? <View style={styles.deferBox}><Text style={styles.deferTitle}>换一个回来时间</Text><View style={styles.deferOptions}>{deferOptions.map((option) => <Pressable key={option.value} onPress={() => onDefer(item, option.value)} style={styles.deferOption}><Text style={styles.deferText}>{option.label}</Text></Pressable>)}</View></View> : <Pressable onPress={() => setShowDefer(true)} style={styles.row}>
            <Ionicons color={colors.accentDark} name="calendar-outline" size={21} />
            <View style={styles.copy}><Text style={styles.rowTitle}>换一个回来时间</Text></View>
          </Pressable>}
          {showWait ? <View style={styles.waitBox}>
            <TextInput autoFocus onChangeText={setWaitReason} placeholder="在等什么？例如：朋友回复时间" placeholderTextColor={colors.textMuted} style={styles.waitInput} value={waitReason} />
            <Pressable disabled={!waitReason.trim()} onPress={() => onWait(item, waitReason.trim())} style={[styles.waitConfirm, !waitReason.trim() && styles.disabled]}><Text style={styles.waitConfirmText}>先等一等</Text></Pressable>
          </View> : <Pressable onPress={() => setShowWait(true)} style={styles.row}>
            <Ionicons color={colors.accentDark} name="hourglass-outline" size={21} />
            <View style={styles.copy}><Text style={styles.rowTitle}>还缺一点条件</Text><Text style={styles.rowText}>在等别人、资料或合适的时机</Text></View>
          </Pressable>}
          <Pressable onPress={() => onRemove(item)} style={styles.removeRow}>
            <Ionicons color={colors.danger} name="trash-outline" size={21} />
            <View style={styles.copy}><Text style={styles.removeTitle}>不再保留这件事</Text><Text style={styles.rowText}>从今天移除，还可以马上撤回</Text></View>
          </Pressable>
          </View> : null}
          </ScrollView>
        </KeyboardAwareSheet>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { ...elevation.floating, position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 26, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background },
  content: { paddingBottom: spacing.sm },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 23, lineHeight: 31, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  detail: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  resumeCard: { gap: 4, padding: spacing.md, marginTop: spacing.md, borderRadius: radii.md, backgroundColor: colors.accentSoft },
  resumeLabel: { color: colors.textMuted, fontSize: 12 },
  resumeText: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  resumeNext: { color: colors.accentDark, fontSize: 13, lineHeight: 19 },
  question: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  start: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.accentStrong },
  startTitle: { color: colors.white, fontSize: 17, fontWeight: '600' },
  startText: { color: 'rgba(255,255,255,0.78)', fontSize: 13 },
  slots: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  slot: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  slotActive: { backgroundColor: colors.accentSoft },
  slotText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  slotTextActive: { color: colors.accentDark },
  edit: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.accentSoft },
  editText: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface },
  deferRecommended: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.accentSoft },
  moreToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  moreText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  moreBox: { paddingTop: 2 },
  removeRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.dangerSoft },
  copy: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  removeTitle: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  rowText: { color: colors.textMuted, fontSize: 13 },
  deferBox: { gap: spacing.sm, padding: spacing.md, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface },
  deferTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  deferOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deferOption: { width: '48%', minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  deferText: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  waitBox: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  waitInput: { flex: 1, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 14 },
  waitConfirm: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.accentStrong },
  waitConfirmText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
