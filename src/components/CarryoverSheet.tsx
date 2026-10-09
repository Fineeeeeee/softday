import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { PlanItem } from '../types';

type Props = { items: PlanItem[]; visible: boolean; onToday: (item: PlanItem) => void; onIdeas: (item: PlanItem) => void; onLater: () => void };

export function CarryoverSheet({ items, visible, onToday, onIdeas, onLater }: Props) {
  const item = items[0];
  return <Modal animationType="slide" onRequestClose={onLater} transparent visible={visible && Boolean(item)}>
    <Pressable onPress={onLater} style={styles.backdrop} />
    {item ? <View style={styles.sheet}>
      <View style={styles.handle} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text maxFontSizeMultiplier={1.2} style={styles.eyebrow}>之前留下了 {items.length} 件事</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>{item.title}</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.body}>不用全部搬到今天，只看看这一件接下来放哪。</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => onIdeas(item)} style={styles.secondary}><Text maxFontSizeMultiplier={1.15} style={styles.secondaryText}>放回想做</Text></Pressable>
          <Pressable onPress={() => onToday(item)} style={styles.primary}><Text maxFontSizeMultiplier={1.15} style={styles.primaryText}>今天继续</Text></Pressable>
        </View>
        <Pressable onPress={onLater} style={styles.later}><Text maxFontSizeMultiplier={1.15} style={styles.laterText}>晚点再看</Text></Pressable>
      </ScrollView>
    </View> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 30 },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600', marginTop: spacing.sm },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.25, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  later: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  laterText: { color: colors.textMuted, fontSize: 14 },
});
