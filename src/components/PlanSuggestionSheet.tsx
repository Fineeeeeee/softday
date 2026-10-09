import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { PlanSuggestion } from '../types';

type Props = { suggestion: PlanSuggestion | null; onClose: () => void; onConfirm: () => void };

export function PlanSuggestionSheet({ suggestion, onClose, onConfirm }: Props) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={suggestion !== null}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      {suggestion ? (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{suggestion.items.length ? '今天还可以放这些' : '今天先不再加了'}</Text>
          <Text style={styles.note}>{suggestion.note}</Text>
          {suggestion.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.dot} />
              <View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemMeta}>{item.duration}</Text></View>
            </View>
          ))}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>{suggestion.items.length ? '先不加' : '知道了'}</Text></Pressable>
            {suggestion.items.length ? <Pressable onPress={onConfirm} style={styles.primary}><Text style={styles.primaryText}>放到今天</Text></Pressable> : null}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  body: { paddingBottom: spacing.sm },
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: spacing.md },
  item: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  itemCopy: { flex: 1, gap: 4 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemMeta: { color: colors.textMuted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
