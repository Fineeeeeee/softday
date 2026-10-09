import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getRecommendedRecipeChoice, type BehaviorRecipeChoice } from '../domain/behaviorRecipe';
import { colors, elevation, radii, spacing } from '../theme/tokens';
import type { ActionMode, BehaviorRecipeDraft, PlanItem } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = {
  actionMode: ActionMode;
  configured: boolean;
  draft: BehaviorRecipeDraft | null;
  error: string;
  item: PlanItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (choice: BehaviorRecipeChoice) => void;
  onRequest: (note: string) => void;
  onReset: () => void;
};

const modeCopy: Record<ActionMode, string> = {
  flowing: '最近安排大多能顾上，这次保留一点实际进展。',
  supported: '先把准备过程减掉一些。',
  gentle: '今天先找一个很容易开始的动作。',
};

export function BehaviorRecipeSheet({ actionMode, configured, draft, error, item, loading, onClose, onConfirm, onRequest, onReset }: Props) {
  const [note, setNote] = useState('');
  const [choice, setChoice] = useState<BehaviorRecipeChoice>(() => getRecommendedRecipeChoice(actionMode));

  useEffect(() => {
    setNote(item?.behaviorRecipe?.frictionNote ?? '');
    setChoice(getRecommendedRecipeChoice(actionMode));
  }, [actionMode, item?.id]);

  useEffect(() => {
    if (draft) setChoice(getRecommendedRecipeChoice(draft.actionMode));
  }, [draft]);

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={item !== null}>
    <Pressable accessibilityLabel="关闭" onPress={onClose} style={styles.backdrop} />
    {item ? <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>换个更顺的做法</Text>
        <Text style={styles.intent} numberOfLines={2}>{item.behaviorRecipe?.intentTitle ?? item.projectTitle ?? item.title}</Text>
        {!draft ? <>
          <Text style={styles.question}>哪里不太方便？</Text>
          <TextInput
            editable={!loading}
            maxLength={160}
            multiline
            onChangeText={setNote}
            placeholder="比如：换衣服再出门有点麻烦，我更愿意在家动一动"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={note}
          />
          <Text style={styles.modeHint}>{modeCopy[actionMode]}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!configured ? <Text style={styles.configHint}>需要先在“我的”里配置智能服务。</Text> : null}
          <Pressable disabled={!configured || !note.trim() || loading} onPress={() => onRequest(note.trim())} style={[styles.primary, (!configured || !note.trim() || loading) && styles.disabled]}>
            {loading ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.primaryText}>帮我换一个</Text><Ionicons color={colors.white} name="arrow-forward" size={17} /></>}
          </Pressable>
        </> : <>
          <Text style={styles.question}>现在可以这样</Text>
          <Pressable onPress={() => setChoice('ordinary')} style={[styles.option, choice === 'ordinary' && styles.optionSelected]}>
            <View style={styles.optionHeader}><Text style={styles.optionLabel}>平常</Text><Text style={styles.minutes}>{draft.ordinaryMinutes} 分钟</Text></View>
            <Text style={styles.optionTitle}>{draft.ordinaryAction}</Text>
          </Pressable>
          <Pressable onPress={() => setChoice('lowEnergy')} style={[styles.option, choice === 'lowEnergy' && styles.optionSelected]}>
            <View style={styles.optionHeader}><Text style={styles.optionLabel}>状态不太好时</Text><Text style={styles.minutes}>{draft.lowEnergyMinutes} 分钟</Text></View>
            <Text style={styles.optionTitle}>{draft.lowEnergyAction}</Text>
          </Pressable>
          <Text style={styles.explain}>只换现在的做法，原本想做的事还留着。</Text>
          <View style={styles.actions}>
            <Pressable onPress={onReset} style={styles.secondary}><Text style={styles.secondaryText}>再说清一点</Text></Pressable>
            <Pressable onPress={() => onConfirm(choice)} style={styles.confirm}><Text style={styles.primaryText}>就这样开始</Text></Pressable>
          </View>
        </>}
      </ScrollView>
    </KeyboardAwareSheet> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { ...elevation.floating, position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.background },
  content: { paddingBottom: spacing.sm },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600' },
  intent: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 5 },
  question: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { minHeight: 108, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  modeHint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  configHint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  primary: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: spacing.lg, borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.38 },
  option: { gap: 8, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  optionSelected: { backgroundColor: colors.accentSoft, boxShadow: [{ offsetX: 0, offsetY: 5, blurRadius: 16, spreadDistance: -6, color: 'rgba(38,43,39,0.18)' }] },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  minutes: { color: colors.accentDark, fontSize: 12, fontWeight: '600' },
  optionTitle: { color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  explain: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  confirm: { flex: 1.35, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
});
