import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import type { EasePreferences, FrictionKind, StartStyle } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = { visible: boolean; value: EasePreferences; onClose: () => void; onSave: (value: EasePreferences) => void };
const frictionOptions: { value: FrictionKind; label: string }[] = [
  { value: 'unclear', label: '不知从哪开始' }, { value: 'tired', label: '状态不够' }, { value: 'time', label: '时间不够' }, { value: 'forget', label: '容易忘' }, { value: 'interrupted', label: '常被打断' },
];
const startOptions: { value: StartStyle; label: string }[] = [
  { value: 'tiny', label: '两分钟' }, { value: 'prepare', label: '先准备' }, { value: 'scheduled', label: '合适时段' }, { value: 'available', label: '有空给一步' },
];

export function EasePreferencesSheet({ visible, value, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [value, visible]);
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>更容易开始</Text>
      <Text style={styles.subtitle}>方向只留在本机；阻力和开始方式会用来调整最小步骤。</Text>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>想多做一点</Text>
        <TextInput maxLength={80} onChangeText={(wantMore) => setDraft((current) => ({ ...current, wantMore }))} placeholder="例如：多读一点书" placeholderTextColor={colors.textMuted} style={styles.input} value={draft.wantMore} />
        <Text style={styles.label}>想少做一点</Text>
        <TextInput maxLength={80} onChangeText={(wantLess) => setDraft((current) => ({ ...current, wantLess }))} placeholder="例如：睡前少刷手机" placeholderTextColor={colors.textMuted} style={styles.input} value={draft.wantLess} />
        <Text style={styles.label}>常见阻力</Text>
        <View style={styles.wrap}>{frictionOptions.map((option) => <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, friction: current.friction === option.value ? 'unspecified' : option.value }))} style={[styles.chip, draft.friction === option.value && styles.chipSelected]}><Text style={[styles.chipText, draft.friction === option.value && styles.chipTextSelected]}>{option.label}</Text></Pressable>)}</View>
        <Text style={styles.label}>偏好的开始方式</Text>
        <View style={styles.wrap}>{startOptions.map((option) => <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, startStyle: current.startStyle === option.value ? 'unspecified' : option.value }))} style={[styles.chip, draft.startStyle === option.value && styles.chipSelected]}><Text style={[styles.chipText, draft.startStyle === option.value && styles.chipTextSelected]}>{option.label}</Text></Pressable>)}</View>
      </ScrollView>
      <View style={styles.actions}><Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>先不改</Text></Pressable><Pressable onPress={() => onSave(draft)} style={styles.primary}><Text style={styles.primaryText}>收好</Text></Pressable></View>
    </KeyboardAwareSheet>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,37,32,0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  form: { paddingBottom: spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 15 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  chipSelected: { backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.accentDark },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
