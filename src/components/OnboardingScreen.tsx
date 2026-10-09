import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import type { EasePreferences, FrictionKind, StartStyle } from '../types';

type Props = { initialValue: EasePreferences; onContinue: (value: EasePreferences) => void };

const frictionOptions: { value: FrictionKind; label: string }[] = [
  { value: 'unclear', label: '不知道从哪开始' },
  { value: 'tired', label: '状态不太够' },
  { value: 'time', label: '时间总是不够' },
  { value: 'forget', label: '容易忘记' },
  { value: 'interrupted', label: '常被临时打断' },
];

const startOptions: { value: StartStyle; label: string; detail: string }[] = [
  { value: 'tiny', label: '先做两分钟', detail: '先动起来，再看要不要继续' },
  { value: 'prepare', label: '先准备一下', detail: '先把环境或材料放好' },
  { value: 'scheduled', label: '到合适时段开始', detail: '先放好时段，到时候直接照着做' },
  { value: 'available', label: '有空就给一步', detail: '不固定时间，只给能直接做的动作' },
];

export function OnboardingScreen({ initialValue, onContinue }: Props) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step === 1 || step === 2) setTimeout(() => inputRef.current?.focus(), 120);
    else Keyboard.dismiss();
  }, [step]);

  function next() {
    if (step < 4) setStep((current) => current + 1);
    else onContinue(value);
  }

  if (step === 0) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.frame}>
        <View style={styles.intro}>
          <Text style={styles.kicker}>SOFTDAY</Text>
          <Text style={styles.title}>先把开始变容易</Text>
          <Text style={styles.body}>简单了解四件事，以后遇到难开始的安排，会先替你缩成做得动的一步。</Text>
          <View style={styles.note}><Text style={styles.noteText}>都可以跳过，也能之后再改。</Text></View>
        </View>
        <Pressable onPress={next} style={styles.primary}><Text style={styles.primaryText}>简单说说</Text></Pressable>
      </View>
    </SafeAreaView>
  );

  const textStep = step === 1 || step === 2;
  const title = step === 1 ? '最近想多做一点什么？' : step === 2 ? '最近想少做一点什么？' : step === 3 ? '什么最容易让你停下来？' : '哪种开始方式更顺手？';
  const currentText = step === 1 ? value.wantMore : value.wantLess;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.frame}>
        <View>
          <View style={styles.topRow}><Text style={styles.progress}>{step} / 4</Text><Pressable onPress={next}><Text style={styles.skip}>跳过</Text></Pressable></View>
          <Text style={styles.question}>{title}</Text>
          {textStep ? <>
            <TextInput ref={inputRef} maxLength={80} onChangeText={(text) => setValue((current) => step === 1 ? { ...current, wantMore: text } : { ...current, wantLess: text })} placeholder={step === 1 ? '例如：多读一点书' : '例如：睡前少刷一会儿手机'} placeholderTextColor={colors.textMuted} returnKeyType="done" style={styles.input} value={currentText} />
            <Text style={styles.hint}>写一句就够了，不会自动加入计划。</Text>
          </> : null}
          {step === 3 ? <View style={styles.options}>{frictionOptions.map((option) => <Pressable key={option.value} onPress={() => setValue((current) => ({ ...current, friction: option.value }))} style={[styles.option, value.friction === option.value && styles.optionSelected]}><Text style={[styles.optionText, value.friction === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}</View> : null}
          {step === 4 ? <View style={styles.options}>{startOptions.map((option) => <Pressable key={option.value} onPress={() => setValue((current) => ({ ...current, startStyle: option.value }))} style={[styles.option, styles.optionTall, value.startStyle === option.value && styles.optionSelected]}><Text style={[styles.optionText, value.startStyle === option.value && styles.optionTextSelected]}>{option.label}</Text><Text style={styles.optionDetail}>{option.detail}</Text></Pressable>)}</View> : null}
        </View>
        <View style={styles.bottomRow}>{step > 1 ? <Pressable onPress={() => setStep((current) => current - 1)} style={styles.back}><Text style={styles.backText}>上一步</Text></Pressable> : <View style={styles.back} />}<Pressable onPress={next} style={styles.next}><Text style={styles.primaryText}>{step === 4 ? '开始使用' : '继续'}</Text></Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  frame: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  intro: { flex: 1, justifyContent: 'center' },
  kicker: { color: colors.accentDark, fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
  title: { maxWidth: 310, color: colors.text, fontSize: 34, lineHeight: 42, fontWeight: '600', letterSpacing: -0.8, marginTop: spacing.sm },
  body: { maxWidth: 330, color: colors.textMuted, fontSize: 17, lineHeight: 27, marginTop: spacing.lg },
  note: { alignSelf: 'flex-start', marginTop: spacing.xl, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  noteText: { color: colors.textMuted, fontSize: 13 },
  primary: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md },
  progress: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  skip: { color: colors.textMuted, fontSize: 14, paddingVertical: 8 },
  question: { color: colors.text, fontSize: 28, lineHeight: 36, fontWeight: '600', letterSpacing: -0.5, marginTop: 44 },
  input: { minHeight: 56, marginTop: spacing.xl, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 17 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  options: { gap: spacing.sm, marginTop: spacing.xl },
  option: { minHeight: 50, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  optionTall: { minHeight: 62 },
  optionSelected: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  optionTextSelected: { color: colors.accentDark },
  optionDetail: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  bottomRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md },
  back: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  next: { flex: 1.5, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
});
