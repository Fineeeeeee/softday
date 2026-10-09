import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { PlanItem } from '../types';

type Props = { visible: boolean; pending: PlanItem[]; onClose: () => void; onReview: (item: PlanItem) => void; onFinish: () => void };

export function EndDaySheet({ visible, pending, onClose, onReview, onFinish }: Props) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text maxFontSizeMultiplier={1.25} style={styles.title}>今天差不多了</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>{pending.length ? '没顾上的事情，可以一件件放好。' : '今天想做的已经收好了。'}</Text>
        {pending.slice(0, 2).map((item) => (
          <Pressable key={item.id} onPress={() => onReview(item)} style={styles.item}>
            <View><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemMeta}>看看接下来放哪</Text></View>
            <Text style={styles.open}>处理</Text>
          </Pressable>
        ))}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onFinish} style={styles.close}><Text maxFontSizeMultiplier={1.15} style={styles.closeText}>今天先这样</Text></Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  body: { paddingBottom: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: spacing.md },
  item: { minHeight: 67, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  open: { color: colors.accentDark, fontSize: 14, fontWeight: '600' },
  close: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  closeText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
