import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDeadlineLabel } from '../domain/planner';
import { colors, elevation, radii, spacing } from '../theme/tokens';
import type { FileImportDraft, ImportedTaskDraft } from '../types';

type Props = {
  visible: boolean;
  loading: boolean;
  error: string;
  draft: FileImportDraft | null;
  onClose: () => void;
  onConfirm: (items: ImportedTaskDraft[]) => void;
};

const timingLabels = { today: '今天', tomorrow: '明天', week: '这周', someday: '以后再说' } as const;

export function FileImportSheet({ visible, loading, error, draft, onClose, onConfirm }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set(draft?.items.map((item) => item.id) ?? []));
  }, [draft]);

  const selectedItems = useMemo(() => draft?.items.filter((item) => selectedIds.has(item.id)) ?? [], [draft, selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>从文件里找事情</Text>
            <Text style={styles.title}>{loading ? '正在轻轻整理' : error ? '这次没整理出来' : `找到 ${draft?.items.length ?? 0} 件事情`}</Text>
          </View>
          <Pressable accessibilityLabel={loading ? '停止整理' : '关闭'} hitSlop={10} onPress={onClose} style={styles.close}><Ionicons color={colors.textMuted} name="close" size={22} /></Pressable>
        </View>

        {loading ? <View style={styles.state}>
          <ActivityIndicator color={colors.accentDark} />
          <Text style={styles.stateText}>只会找出明确要做的事，整理好再让你确认。</Text>
          <Pressable onPress={onClose} style={styles.stopAction}><Text style={styles.stopActionText}>停止整理</Text></Pressable>
        </View> : error ? <View style={styles.state}>
          <Ionicons color={colors.danger} name="document-text-outline" size={30} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onClose} style={styles.singleAction}><Text style={styles.singleActionText}>知道了</Text></Pressable>
        </View> : <>
          <Text style={styles.subtitle}>已经合并相近内容。勾选后，才会放进“想做”。</Text>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {draft?.items.map((item) => {
              const selected = selectedIds.has(item.id);
              const meta = [timingLabels[item.timing], item.durationMinutes ? `${item.durationMinutes} 分钟` : null, item.deadline ? formatDeadlineLabel(item.deadline) : null].filter(Boolean).join(' · ');
              return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} key={item.id} onPress={() => toggle(item.id)} style={[styles.item, selected && styles.itemSelected]}>
                <View style={[styles.check, selected && styles.checkSelected]}>{selected ? <Ionicons color={colors.white} name="checkmark" size={16} /> : null}</View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>{meta} · 来自 {item.sourceName}</Text>
                  {item.afterTitle ? <Text style={styles.order}>接在“{item.afterTitle}”之后</Text> : null}
                  <Text numberOfLines={2} style={styles.excerpt}>“{item.sourceExcerpt}”</Text>
                </View>
              </Pressable>;
            })}
            {!draft?.items.length ? <View style={styles.empty}>
              <Ionicons color={colors.accent} name="leaf-outline" size={30} />
              <Text style={styles.emptyTitle}>没有找到明确要安排的事</Text>
              <Text style={styles.emptyText}>文件没有被改动，原文不会写进任务或备份。</Text>
            </View> : null}
            {draft?.skippedFiles.length ? <View style={styles.skipped}>
              <Text style={styles.skippedTitle}>有 {draft.skippedFiles.length} 个文件没有读取</Text>
              {draft.skippedFiles.map((file, index) => <Text key={`${file.name}-${index}`} numberOfLines={2} style={styles.skippedText}>{file.name} · {file.reason}</Text>)}
            </View> : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>先不收</Text></Pressable>
            <Pressable disabled={!selectedItems.length} onPress={() => onConfirm(selectedItems)} style={[styles.primary, !selectedItems.length && styles.primaryDisabled]}><Text style={styles.primaryText}>收进想做{selectedItems.length ? `（${selectedItems.length}）` : ''}</Text></Pressable>
          </View>
        </>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { ...elevation.floating, position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 32, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600', letterSpacing: -0.35, marginTop: 5 },
  close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.surface },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  state: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  stateText: { maxWidth: 260, color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  stopAction: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surface },
  stopActionText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  errorText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  singleAction: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, borderRadius: radii.pill, backgroundColor: colors.accentStrong },
  singleActionText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  list: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.md },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  itemSelected: { backgroundColor: colors.accentSoft },
  check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 8, marginTop: 1, backgroundColor: colors.background },
  checkSelected: { borderColor: colors.accentStrong, backgroundColor: colors.accentStrong },
  itemCopy: { flex: 1, gap: 5 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  itemMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  order: { color: colors.accentDark, fontSize: 12, lineHeight: 18 },
  excerpt: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  skipped: { gap: 5, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  skippedTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  skippedText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surface },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  primary: { flex: 1.5, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryDisabled: { opacity: 0.42 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
