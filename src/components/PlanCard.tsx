import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/tokens';
import { formatDeadlineLabel } from '../domain/planner';
import { PlanItem } from '../types';

type Props = {
  item: PlanItem;
  onToggle: (id: string) => void;
  onOpen: (item: PlanItem) => void;
};

export function PlanCard({ item, onToggle, onOpen }: Props) {
  const slotLabel = item.timeSlot === 'morning' ? '上午' : item.timeSlot === 'afternoon' ? '下午' : item.timeSlot === 'evening' ? '晚上' : null;
  const meta = item.waitingFor
    ? `在等：${item.waitingFor}`
    : [slotLabel, item.duration, item.deadline ? formatDeadlineLabel(item.deadline) : null].filter(Boolean).join(' · ');
  return (
    <View style={[styles.card, item.done && styles.cardDone]}>
      <Pressable
        accessibilityLabel={item.done ? `恢复${item.title}` : `完成${item.title}`}
        hitSlop={8}
        onPress={() => onToggle(item.id)}
        style={[styles.check, item.done && styles.checkDone]}
      >
        {item.done ? <Ionicons color={colors.white} name="checkmark" size={17} /> : null}
      </Pressable>
      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, item.done && styles.textDone]}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.meta}>{item.done ? '先收起来了' : meta}</Text>
      </View>
      <Pressable accessibilityLabel={`查看${item.title}`} hitSlop={10} onPress={() => onOpen(item)}>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radii.md, backgroundColor: colors.surface },
  cardDone: { opacity: 0.55 },
  check: { width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkDone: { borderColor: colors.accent, backgroundColor: colors.accent },
  content: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  textDone: { textDecorationLine: 'line-through' },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
