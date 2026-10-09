import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatDeadlineLabel } from '../domain/planner';
import { colors, elevation, radii, spacing } from '../theme/tokens';
import type { CaptureBatchDraft, CaptureDraft } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';
import { RecurrencePicker } from './RecurrencePicker';

type Props = {
  draft: CaptureBatchDraft | null;
  onChange: (draft: CaptureBatchDraft) => void;
  onClose: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  submitting?: boolean;
};

const timeSlotLabels = { anytime: '', morning: '上午', afternoon: '下午', evening: '晚上' } as const;

function describe(item: CaptureDraft) {
  return [
    timeSlotLabels[item.timeSlot],
    item.durationMinutes ? `${item.durationMinutes} 分钟` : null,
    item.deadline ? formatDeadlineLabel(item.deadline) : null,
  ].filter(Boolean).join(' · ') || item.timingLabel;
}

function itemKey(item: CaptureDraft) {
  return `${item.originalText}\u0000${item.projectTitle ?? ''}`;
}

export function CaptureReviewSheet({ draft, onChange, onClose, onEdit, onConfirm, submitting = false }: Props) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!draft) return;
    const firstItem = draft.items[0];
    setExpandedItems(new Set(firstItem ? [itemKey(firstItem)] : []));
  }, [draft?.originalText]);

  function toggleItem(item: CaptureDraft) {
    const key = itemKey(item);
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateItem(index: number, next: CaptureDraft) {
    if (!draft) return;
    onChange({ ...draft, items: draft.items.map((item, itemIndex) => itemIndex === index ? next : item) });
  }

  function removeItem(index: number) {
    if (!draft) return;
    const items = draft.items.filter((_, itemIndex) => itemIndex !== index);
    if (!items.length) onClose();
    else onChange({ ...draft, items });
  }

  function moveItem(index: number, item: CaptureDraft) {
    if (item.destination === 'today') updateItem(index, { ...item, destination: 'ideas', timing: 'someday', timingLabel: '以后再说' });
    else updateItem(index, { ...item, destination: 'today', timing: 'today', timingLabel: '今天' });
  }

  const groups = draft ? [
    { key: 'today', title: '今天', items: draft.items.map((item, index) => ({ item, index })).filter(({ item }) => item.destination === 'today') },
    { key: 'ideas', title: '之后想做', items: draft.items.map((item, index) => ({ item, index })).filter(({ item }) => item.destination === 'ideas') },
  ] : [];

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={draft !== null}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      {draft ? (
        <KeyboardAwareSheet style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>整理好了，{draft.items.length} 件</Text>
            </View>
            <Pressable accessibilityLabel="关闭" hitSlop={10} onPress={onClose} style={styles.close}><Ionicons color={colors.textMuted} name="close" size={21} /></Pressable>
          </View>
          <Text style={styles.subtitle}>只检查标题就行，不合适的可以移走。</Text>
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
            {groups.map((group) => group.items.length ? <View key={group.key} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title} · {group.items.length}</Text>
              {group.items.map(({ item, index }) => {
                const expanded = expandedItems.has(itemKey(item));
                return <View key={`${group.key}-${index}`} style={styles.item}>
                {!expanded ? <Pressable accessibilityLabel={`展开${item.title}`} onPress={() => toggleItem(item)} style={styles.collapsedRow}><View style={styles.collapsedCopy}><Text numberOfLines={1} style={styles.collapsedTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.meta}>{describe(item)}</Text></View><Ionicons color={colors.textMuted} name="chevron-down" size={17} /></Pressable> : <>
                <View style={styles.itemTop}>
                  <TextInput
                    accessibilityLabel={`第 ${index + 1} 件事的标题`}
                    maxLength={80}
                    multiline
                    onChangeText={(title) => updateItem(index, { ...item, title })}
                    style={styles.itemTitle}
                    value={item.title}
                  />
                  <Pressable accessibilityLabel={`收起${item.title}`} hitSlop={8} onPress={() => toggleItem(item)} style={styles.remove}><Ionicons color={colors.textMuted} name="chevron-up" size={17} /></Pressable>
                </View>
                {item.projectTitle ? <Text numberOfLines={1} style={styles.project}>“{item.projectTitle}”的下一步</Text> : null}
                <View style={styles.itemBottom}>
                  <Text numberOfLines={1} style={styles.meta}>{describe(item)}</Text>
                  <Pressable onPress={() => moveItem(index, item)}><Text style={styles.move}>{item.destination === 'today' ? '放到想做' : '放到今天'}</Text></Pressable>
                </View>
                <RecurrencePicker onChange={(recurrence) => updateItem(index, { ...item, recurrence, recurrenceProposal: undefined, recurrenceSuggestion: undefined })} proposedValue={item.recurrenceProposal} suggestion={item.recurrenceSuggestion} value={item.recurrence} />
                <Pressable accessibilityLabel={`移除${item.title}`} onPress={() => removeItem(index)} style={styles.removeLink}><Text style={styles.removeLinkText}>不放这件</Text></Pressable>
                </>}
              </View>})}
            </View> : null)}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable disabled={submitting} onPress={onEdit} style={[styles.secondary, submitting && styles.disabled]}><Text style={styles.secondaryText}>改改原文</Text></Pressable>
            <Pressable disabled={submitting || draft.items.some((item) => !item.title.trim())} onPress={onConfirm} style={[styles.primary, (submitting || draft.items.some((item) => !item.title.trim())) && styles.disabled]}><Text style={styles.primaryText}>{submitting ? '正在放好' : `都放好（${draft.items.length}）`}</Text></Pressable>
          </View>
        </KeyboardAwareSheet>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { ...elevation.floating, position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 23, lineHeight: 30, fontWeight: '600', letterSpacing: -0.3 },
  close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.surface },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 7 },
  scroll: { flexShrink: 1 },
  list: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  group: { gap: 2, paddingHorizontal: spacing.md, paddingTop: 12, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  groupTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.25, marginBottom: 4 },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  collapsedRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  collapsedCopy: { flex: 1, gap: 2 },
  collapsedTitle: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemTitle: { flex: 1, minHeight: 26, padding: 0, color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: '600', textAlignVertical: 'top' },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  project: { color: colors.accentDark, fontSize: 12, lineHeight: 18, marginTop: 2 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  meta: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  move: { color: colors.accentDark, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  removeLink: { alignSelf: 'flex-start', minHeight: 30, justifyContent: 'center', marginTop: 3 },
  removeLinkText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
