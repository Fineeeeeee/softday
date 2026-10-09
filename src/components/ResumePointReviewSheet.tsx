import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import type { ResumePointDraft } from '../types';

type Props = { draft: ResumePointDraft | null; onClose: () => void; onConfirm: () => void };

export function ResumePointReviewSheet({ draft, onClose, onConfirm }: Props) {
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={draft !== null}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    {draft ? <View style={styles.sheet}>
      <View style={styles.handle} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>下次从这里继续</Text>
      <Text style={styles.title}>{draft.nextAction}</Text>
      <View style={styles.note}>
        <Ionicons color={colors.accentDark} name={draft.status === 'waiting' ? 'hourglass-outline' : 'bookmark-outline'} size={20} />
        <View style={styles.noteCopy}>
          <Text style={styles.noteLabel}>{draft.status === 'waiting' ? '正在等' : '上次停在'}</Text>
          <Text style={styles.noteText}>{draft.status === 'waiting' ? draft.waitingFor : draft.progressSummary}</Text>
        </View>
      </View>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>重新说</Text></Pressable>
        <Pressable onPress={onConfirm} style={styles.primary}><Text style={styles.primaryText}>记住这里</Text></Pressable>
      </View>
    </View> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 32, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  content: { paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 24, lineHeight: 33, fontWeight: '600', marginTop: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, marginTop: spacing.lg, borderRadius: radii.md, backgroundColor: colors.accentSoft },
  noteCopy: { flex: 1, gap: 4 },
  noteLabel: { color: colors.textMuted, fontSize: 12 },
  noteText: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surface },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  primary: { flex: 1.35, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
