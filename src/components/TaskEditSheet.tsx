import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { isDateKey, toDateKey } from '../domain/planner';
import { PlanItem, PlanSection, TimeSlot } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';
import { RecurrencePicker } from './RecurrencePicker';

export type TaskEditScope = 'once' | 'series';
type Props = { item: PlanItem | null; onClose: () => void; onSave: (item: PlanItem, scope: TaskEditScope) => void };

const sections: { value: PlanSection; label: string }[] = [
  { value: 'important', label: '今天要紧' },
  { value: 'wanted', label: '今天想做' },
  { value: 'optional', label: '有空再做' },
];
const slots: { value: TimeSlot; label: string }[] = [
  { value: 'anytime', label: '随时' },
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
];

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function nextMonday() {
  const date = new Date();
  const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return toDateKey(date);
}

function deadlineChoices() {
  return [
    { label: '今天', value: dateAfter(0) },
    { label: '明天', value: dateAfter(1) },
    { label: '后天', value: dateAfter(2) },
    { label: '下周一', value: nextMonday() },
  ];
}

export function TaskEditSheet({ item, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<PlanItem | null>(item);
  const [durationText, setDurationText] = useState('');
  const [showCustomDeadline, setShowCustomDeadline] = useState(false);
  const [scope, setScope] = useState<TaskEditScope>('once');
  const choices = deadlineChoices();

  useEffect(() => {
    setDraft(item);
    setDurationText(item?.durationMinutes ? String(item.durationMinutes) : '');
    setShowCustomDeadline(Boolean(item?.deadline && !choices.some((choice) => choice.value === item.deadline)));
    setScope('once');
  }, [item]);

  const deadlineText = draft?.deadline?.trim() ?? '';
  const deadlineValid = !deadlineText || isDateKey(deadlineText);

  function save() {
    if (!draft?.title.trim() || !deadlineValid) return;
    const durationMinutes = Number(durationText);
    onSave({
      ...draft,
      title: draft.title.trim(),
      durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : undefined,
      duration: Number.isFinite(durationMinutes) && durationMinutes > 0 ? `${Math.round(durationMinutes)} 分钟` : '时间还没定',
      deadline: draft.deadline?.trim() || undefined,
    }, scope);
  }

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={item !== null}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    {draft ? <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>改这件事</Text>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>事情</Text>
        <TextInput multiline onChangeText={(title) => setDraft({ ...draft, title })} style={styles.titleInput} value={draft.title} />
        <Text style={styles.label}>放在哪里</Text>
        <View style={styles.options}>{sections.map((section) => { const active = draft.section === section.value; return <Pressable key={section.value} onPress={() => setDraft({ ...draft, section: section.value })} style={[styles.option, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{section.label}</Text></Pressable>; })}</View>
        <Text style={styles.label}>大约多久</Text>
        <TextInput inputMode="numeric" onChangeText={setDurationText} placeholder="例如：30" placeholderTextColor={colors.textMuted} style={styles.input} value={durationText} />
        <Text style={styles.label}>适合什么时候</Text>
        <View style={styles.options}>{slots.map((slot) => { const active = (draft.timeSlot ?? 'anytime') === slot.value; return <Pressable key={slot.value} onPress={() => setDraft({ ...draft, timeSlot: slot.value })} style={[styles.option, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{slot.label}</Text></Pressable>; })}</View>
        {item?.recurrence ? <><Text style={styles.label}>这次改动</Text><View style={styles.options}><Pressable onPress={() => setScope('once')} style={[styles.option, scope === 'once' && styles.optionActive]}><Text style={[styles.optionText, scope === 'once' && styles.optionTextActive]}>只改这次</Text></Pressable><Pressable onPress={() => setScope('series')} style={[styles.option, scope === 'series' && styles.optionActive]}><Text style={[styles.optionText, scope === 'series' && styles.optionTextActive]}>以后也这样</Text></Pressable></View></> : null}
        {!item?.recurrence || scope === 'series' ? <RecurrencePicker onChange={(recurrence) => setDraft({ ...draft, recurrence, recurrenceSeriesId: recurrence ? draft.recurrenceSeriesId ?? `series-${draft.id}` : undefined })} value={draft.recurrence} /> : <Text style={styles.seriesHint}>后续重复保持不变。</Text>}
        <Text style={styles.label}>哪天前完成</Text>
        <Text style={styles.deadlineHint}>只用于提醒，不移动事项。</Text>
        <View style={styles.deadlineChoices}>{choices.map((choice) => { const active = draft.deadline === choice.value; return <Pressable key={choice.value} onPress={() => { setDraft({ ...draft, deadline: choice.value }); setShowCustomDeadline(false); }} style={[styles.deadlineChoice, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{choice.label}</Text></Pressable>; })}</View>
        <View style={styles.deadlineActions}><Pressable onPress={() => setShowCustomDeadline(!showCustomDeadline)} style={styles.deadlineLink}><Text style={styles.deadlineLinkText}>{showCustomDeadline ? '收起其他日期' : '选其他日期'}</Text></Pressable>{draft.deadline ? <Pressable onPress={() => { setDraft({ ...draft, deadline: undefined }); setShowCustomDeadline(false); }} style={styles.deadlineLink}><Text style={styles.deadlineLinkText}>先不设日期</Text></Pressable> : null}</View>
        {showCustomDeadline ? <><TextInput autoCapitalize="none" onChangeText={(deadline) => setDraft({ ...draft, deadline })} placeholder="例如 2026-07-20" placeholderTextColor={colors.textMuted} style={styles.input} value={draft.deadline ?? ''} />{!deadlineValid ? <Text style={styles.error}>请填 YYYY-MM-DD，例如 2026-07-20。</Text> : null}</> : null}
      </ScrollView>
      <View style={styles.actions}><Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>先不改</Text></Pressable><Pressable disabled={!deadlineValid || !draft.title.trim()} onPress={save} style={[styles.primary, (!deadlineValid || !draft.title.trim()) && styles.disabled]}><Text style={styles.primaryText}>保存</Text></Pressable></View>
    </KeyboardAwareSheet> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '86%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  form: { paddingBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  titleInput: { minHeight: 70, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 19, fontWeight: '600', textAlignVertical: 'top' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
  error: { color: colors.danger, fontSize: 12, marginTop: 7 },
  options: { flexDirection: 'row', gap: 6 },
  deadlineChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  deadlineHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: -3, marginBottom: spacing.sm },
  seriesHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  deadlineChoice: { width: '23%', minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  deadlineActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  deadlineLink: { minHeight: 28, justifyContent: 'center' },
  deadlineLinkText: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  option: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  optionActive: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  optionTextActive: { color: colors.accentDark },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
