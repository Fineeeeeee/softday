import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { IdeaItem } from '../types';
import { applyIdeaReturnChoice, getIdeaReturnChoice, type IdeaReturnChoice } from '../domain/ideas';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';
import { RecurrencePicker } from './RecurrencePicker';

type Props = { idea: IdeaItem | null; onChange: (idea: IdeaItem) => void; onClose: () => void; onSave: () => void; onRemove: (idea: IdeaItem) => void };

const returnOptions: { value: IdeaReturnChoice; label: string }[] = [
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '这周' },
  { value: 'free', label: '有空时' },
  { value: 'someday', label: '先收起' },
];

function returnHint(idea: IdeaItem) {
  if (idea.availableOn && idea.timing !== 'tomorrow') {
    const [, month = '', day = ''] = idea.availableOn.split('-');
    return `${Number(month)}月${Number(day)}日再出现。`;
  }
  const choice = getIdeaReturnChoice(idea);
  if (choice === 'tomorrow') return '到了明天，会自动放进“今天”。';
  if (choice === 'week') return '这周安排时会优先看到。';
  if (choice === 'free') return '今天有余地时，偶尔轻轻出现。';
  return '不会主动出现，需要时再回来找。';
}

export function IdeaEditSheet({ idea, onChange, onClose, onSave, onRemove }: Props) {
  function confirmRemove() {
    if (!idea) return;
    Alert.alert('不再保留这件事？', '移除后不会出现在“想做”里。', [
      { text: '继续留着', style: 'cancel' },
      { text: '不留了', style: 'destructive', onPress: () => onRemove(idea) },
    ]);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={idea !== null}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      {idea ? <KeyboardAwareSheet style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>这件事</Text>
        <TextInput multiline onChangeText={(title) => onChange({ ...idea, title })} style={styles.titleInput} value={idea.title} />
        <Text style={styles.label}>什么时候再想起它</Text>
        <View style={styles.returnOptions}>{returnOptions.map((option) => {
          const active = getIdeaReturnChoice(idea) === option.value;
          return <Pressable key={option.value} onPress={() => onChange(applyIdeaReturnChoice(idea, option.value))} style={[styles.returnOption, active && styles.returnOptionActive]}><Text style={[styles.returnText, active && styles.returnTextActive]}>{option.label}</Text></Pressable>;
        })}</View>
        <Text style={styles.returnHint}>{returnHint(idea)}</Text>
        <RecurrencePicker onChange={(recurrence) => onChange({ ...idea, recurrence, recurrenceSeriesId: recurrence ? idea.recurrenceSeriesId ?? `series-${idea.id}` : undefined })} value={idea.recurrence} />
        {idea.sourceName ? <View style={styles.source}>
          <Text style={styles.sourceLabel}>来自 {idea.sourceName}</Text>
          {idea.afterTitle ? <Text style={styles.sourceOrder}>接在“{idea.afterTitle}”之后</Text> : null}
          {idea.sourceExcerpt ? <Text style={styles.sourceExcerpt}>“{idea.sourceExcerpt}”</Text> : null}
        </View> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable onPress={confirmRemove} style={styles.remove}><Text style={styles.removeText}>不留了</Text></Pressable>
          <Pressable disabled={!idea.title.trim()} onPress={onSave} style={styles.primary}><Text style={styles.primaryText}>保存</Text></Pressable>
        </View>
      </KeyboardAwareSheet> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  body: { paddingBottom: spacing.sm },
  titleInput: { minHeight: 70, marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 20, fontWeight: '600', textAlignVertical: 'top' },
  label: { color: colors.textMuted, fontSize: 13, marginTop: spacing.lg, marginBottom: spacing.sm },
  returnOptions: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 16, backgroundColor: colors.segmentBackground },
  returnOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  returnOptionActive: { backgroundColor: colors.segmentSelected, boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 8, spreadDistance: -2, color: 'rgba(38,43,39,0.16)' }] },
  returnText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', opacity: 0.58 },
  returnTextActive: { color: colors.text, opacity: 1 },
  returnHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  source: { gap: 6, padding: spacing.md, marginTop: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  sourceLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sourceOrder: { color: colors.accentDark, fontSize: 13 },
  sourceExcerpt: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  remove: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.dangerSoft },
  removeText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
