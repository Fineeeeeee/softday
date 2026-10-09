import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import type { PlanItem, ResumeStatus } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = {
  item: PlanItem | null;
  initialDraft?: { status: ResumeStatus; note: string } | null;
  onClose: () => void;
  onConfirm: (item: PlanItem, status: ResumeStatus, note: string) => void;
};

const options: { value: ResumeStatus; label: string }[] = [
  { value: 'not_started', label: '还没开始' },
  { value: 'in_progress', label: '做到一半' },
  { value: 'waiting', label: '在等别人' },
];

export function PausePointSheet({ item, initialDraft, onClose, onConfirm }: Props) {
  const [status, setStatus] = useState<ResumeStatus>('in_progress');
  const [note, setNote] = useState('');

  useEffect(() => {
    setStatus(initialDraft?.status ?? item?.resumePoint?.status ?? 'in_progress');
    setNote(initialDraft?.note ?? '');
  }, [initialDraft, item?.id]);

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={item !== null}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    {item ? <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text maxFontSizeMultiplier={1.2} style={styles.eyebrow}>先停一下</Text>
      <Text maxFontSizeMultiplier={1.25} style={styles.title}>停在哪了？</Text>
      <View style={styles.options}>
        {options.map((option) => <Pressable key={option.value} onPress={() => setStatus(option.value)} style={[styles.option, status === option.value && styles.optionActive]}><Text style={[styles.optionText, status === option.value && styles.optionTextActive]}>{option.label}</Text></Pressable>)}
      </View>
      <TextInput multiline maxLength={160} onChangeText={setNote} placeholder={status === 'waiting' ? '例如：合同看完了，在等报价' : '可以补一句，模型会找出下次从哪里继续'} placeholderTextColor={colors.textMuted} style={styles.input} textAlignVertical="top" value={note} />
      <Text style={styles.hint}>{note.trim() ? '只会整理这件事，不会改日期。' : '不补充也可以，先记住当前状态。'}</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>先不记</Text></Pressable>
        <Pressable onPress={() => onConfirm(item, status, note.trim())} style={styles.primary}><Text style={styles.primaryText}>看看断点</Text></Pressable>
      </View>
    </KeyboardAwareSheet> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 32, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  title: { color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: '600', marginTop: 4 },
  body: { paddingBottom: spacing.sm },
  options: { flexDirection: 'row', gap: 7, marginTop: spacing.lg },
  option: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  optionActive: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: colors.accentDark },
  input: { minHeight: 104, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 15, lineHeight: 22 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surface },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  primary: { flex: 1.35, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
