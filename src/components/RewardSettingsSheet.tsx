import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RewardPreferences } from '../types';
import { colors, radii, spacing } from '../theme/tokens';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = { visible: boolean; value: RewardPreferences; onClose: () => void; onSave: (value: RewardPreferences) => void };

function readList(value: string) {
  return [...new Set(value.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean))].slice(0, 12);
}

export function RewardSettingsSheet({ visible, value, onClose, onSave }: Props) {
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [lowGoal, setLowGoal] = useState(2);
  const [highGoal, setHighGoal] = useState(4);
  useEffect(() => {
    if (!visible) return;
    setLikes(value.likes.join('，'));
    setDislikes(value.dislikes.join('，'));
    setLowGoal(value.lowGoal);
    setHighGoal(value.highGoal);
  }, [value, visible]);
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <Text maxFontSizeMultiplier={1.2} style={styles.title}>给自己留点喜欢的</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>达到自己定的小目标后，首页会轻轻提一个奖励。</Text>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
      <Text style={styles.label}>喜欢的</Text>
      <TextInput multiline onChangeText={setLikes} placeholder="例如：喝杯茶，散步，玩一会游戏" placeholderTextColor={colors.textMuted} style={styles.input} value={likes} />
      <Text style={styles.label}>不想被推荐的</Text>
      <TextInput multiline onChangeText={setDislikes} placeholder="例如：甜食，熬夜" placeholderTextColor={colors.textMuted} style={styles.input} value={dislikes} />
      <Text style={styles.label}>完成几件时出现</Text>
      <View style={styles.goalRow}>
        <View style={styles.goalBlock}><Text style={styles.goalName}>小停靠点</Text><View style={styles.segment}>{[1, 2, 3].map((count) => <Pressable key={count} onPress={() => { setLowGoal(count); setHighGoal((current) => Math.max(current, count + 1)); }} style={[styles.option, lowGoal === count && styles.optionActive]}><Text style={[styles.optionText, lowGoal === count && styles.optionTextActive]}>{count}</Text></Pressable>)}</View></View>
        <View style={styles.goalBlock}><Text style={styles.goalName}>走得更远</Text><View style={styles.segment}>{[3, 4, 5].map((count) => <Pressable key={count} onPress={() => { setHighGoal(count); setLowGoal((current) => Math.min(current, count - 1)); }} style={[styles.option, highGoal === count && styles.optionActive]}><Text style={[styles.optionText, highGoal === count && styles.optionTextActive]}>{count}</Text></Pressable>)}</View></View>
      </View>
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => onSave({ likes: readList(likes), dislikes: readList(dislikes), lowGoal, highGoal })} style={styles.save}><Text maxFontSizeMultiplier={1.15} style={styles.saveText}>存好</Text></Pressable>
    </KeyboardAwareSheet>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,37,32,0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 23, lineHeight: 30, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 5, marginBottom: spacing.md },
  scroll: { flexShrink: 1 },
  body: { paddingBottom: spacing.sm },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: spacing.sm, marginBottom: 6 },
  input: { minHeight: 68, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 15, lineHeight: 21, textAlignVertical: 'top' },
  goalRow: { flexDirection: 'row', gap: spacing.sm },
  goalBlock: { flex: 1, gap: 6 },
  goalName: { color: colors.textMuted, fontSize: 11 },
  segment: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 13, backgroundColor: colors.segmentBackground },
  option: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  optionActive: { backgroundColor: colors.segmentSelected },
  optionText: { color: colors.textMuted, fontSize: 13, opacity: 0.55 },
  optionTextActive: { color: colors.accentDark, fontWeight: '600', opacity: 1 },
  save: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, borderRadius: radii.md, backgroundColor: colors.accentStrong },
  saveText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
