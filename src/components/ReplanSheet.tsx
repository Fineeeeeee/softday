import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { ReplanChange, ReplanProposal } from '../types';

type Props = { proposal: ReplanProposal | null; onClose: () => void; onConfirm: () => void };

const labels: Record<ReplanChange['kind'], string> = { keep: '先留住', later: '明天再看', pause: '暂时放下' };
const icons: Record<ReplanChange['kind'], keyof typeof Ionicons.glyphMap> = { keep: 'checkmark-circle-outline', later: 'calendar-outline', pause: 'basket-outline' };

export function ReplanSheet({ proposal, onClose, onConfirm }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => setShowDetails(false), [proposal]);
  const kept = proposal?.changes.find((change) => change.kind === 'keep');
  const otherCount = proposal ? proposal.changes.length - Number(Boolean(kept)) : 0;
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={proposal !== null}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      {proposal ? <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.eyebrow}>{kept ? '现在先留' : '今天先放轻一点'}</Text>
        <Text style={styles.title}>{kept?.title ?? '其他事情先重新放好'}</Text>
        <Text numberOfLines={2} style={styles.reason}>“{proposal.reason}”</Text>
        {otherCount ? <Pressable onPress={() => setShowDetails((value) => !value)} style={styles.summary}><Text style={styles.summaryText}>另外 {otherCount} 件已经放好</Text><Ionicons color={colors.textMuted} name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable> : null}
        {showDetails ? <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {proposal.changes.filter((change) => change.itemId !== kept?.itemId).map((change) => <View key={change.itemId} style={styles.change}><Ionicons color={colors.accentDark} name={icons[change.kind]} size={21} /><View style={styles.copy}><Text style={styles.kind}>{labels[change.kind]}</Text><Text numberOfLines={2} style={styles.changeText}>{change.title}</Text></View></View>)}
        </ScrollView> : null}
        <View style={styles.actions}>
          <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>再看看</Text></Pressable>
          <Pressable onPress={onConfirm} style={styles.primary}><Text style={styles.primaryText}>就这样</Text></Pressable>
        </View>
      </View> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '78%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  title: { color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: '600', marginTop: 5 },
  reason: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: spacing.md },
  list: { flexGrow: 0 },
  summary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  summaryText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  change: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  copy: { flex: 1, gap: 3 },
  kind: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  changeText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
