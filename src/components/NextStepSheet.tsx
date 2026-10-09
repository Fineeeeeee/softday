import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

type Props = { projectTitle: string | null; onClose: () => void; onContinue: () => void };

export function NextStepSheet({ projectTitle, onClose, onContinue }: Props) {
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={projectTitle !== null}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    {projectTitle ? <View style={styles.sheet}>
      <View style={styles.handle} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text maxFontSizeMultiplier={1.25} style={styles.title}>这一小步先收好了</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.body}>“{projectTitle}”还要继续一点吗？不用现在把后面全想完。</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>以后再说</Text></Pressable>
        <Pressable onPress={onContinue} style={styles.primary}><Text style={styles.primaryText}>留下下一步</Text></Pressable>
      </View>
    </View> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  content: { paddingBottom: spacing.sm },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
