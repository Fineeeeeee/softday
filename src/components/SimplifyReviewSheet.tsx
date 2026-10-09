import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import type { SimplifyDraft } from '../types';

type Props = {
  draft: SimplifyDraft | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function SimplifyReviewSheet({ draft, onClose, onConfirm }: Props) {
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={draft !== null}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    {draft ? <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>先拆成这几步</Text>
      <Text style={styles.subtitle}>先看一步，做完再继续。</Text>
      <ScrollView contentContainerStyle={styles.steps} showsVerticalScrollIndicator={false}>
        {draft.steps.map((step, index) => <View key={`${index}-${step.title}`} style={styles.step}>
          <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
          <View style={styles.copy}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.duration}>约 {step.durationMinutes} 分钟</Text></View>
          {index === 0 ? <Ionicons color={colors.accent} name="arrow-forward-circle" size={20} /> : null}
        </View>)}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>先不改</Text></Pressable>
        <Pressable onPress={onConfirm} style={styles.primary}><Text style={styles.primaryText}>从第一步开始</Text></Pressable>
      </View>
    </View> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 23, 19, 0.38)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  steps: { gap: spacing.sm, paddingVertical: spacing.lg },
  step: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radii.md, backgroundColor: colors.surface },
  number: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accentSoft },
  numberText: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  copy: { flex: 1, gap: 3 },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  duration: { color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.5, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
