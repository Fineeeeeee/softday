import { useRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { captureLimits } from '../domain/parseCapture';
import { colors, elevation, radii, spacing, typography } from '../theme/tokens';

type Props = {
  visible: boolean;
  mode: 'capture' | 'adjust';
  value: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onDirect: () => void;
  error?: string;
  submitting?: boolean;
  usesAi?: boolean;
};

export function ActionSheet({ visible, mode, value, onChangeText, onClose, onConfirm, onDirect, error, submitting = false, usesAi = false }: Props) {
  const capture = mode === 'capture';
  const inputRef = useRef<TextInput>(null);
  const quickAdjustments = [
    { label: '只剩 30 分钟', value: '我现在只剩 30 分钟' },
    { label: '今天有点累', value: '今天有点累' },
  ];
  return (
    <Modal animationType="slide" onRequestClose={onClose} onShow={() => setTimeout(() => inputRef.current?.focus(), 150)} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none" style={styles.keyboard}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{capture ? '记一下' : '发生了什么？'}</Text>
            <Text style={styles.subtitle}>{capture ? '可以写几件，整理后再确认。' : usesAi ? '整理后再确认。' : '说说变化。'}</Text>
            {!capture ? <View style={styles.quickWrap}>{quickAdjustments.map((adjustment) => <Pressable key={adjustment.value} onPress={() => onChangeText(adjustment.value)} style={styles.quick}><Text style={styles.quickText}>{adjustment.label}</Text></Pressable>)}</View> : null}
            <TextInput
              ref={inputRef}
              multiline
              editable={!submitting}
              maxLength={capture ? captureLimits.maxCharacters : undefined}
              onChangeText={onChangeText}
              placeholder={capture ? '例如：\n明早去医院复查\n下午买猫粮' : '例如：睡过头了，下午还临时有事'}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={value}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable disabled={submitting} onPress={capture && usesAi ? onDirect : onClose} style={[styles.secondary, submitting && styles.disabled]}><Text style={styles.secondaryText}>{capture && usesAi ? '直接记下' : '先不写'}</Text></Pressable>
              <Pressable disabled={!value.trim() || submitting} onPress={onConfirm} style={[styles.primary, (!value.trim() || submitting) && styles.disabled]}>
                <Text style={styles.primaryText}>{submitting ? '整理中' : capture && usesAi ? '智能整理' : capture ? '整理一下' : '重新看看'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: { ...elevation.floating, maxHeight: '92%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600', letterSpacing: -0.35 },
  subtitle: { color: colors.textMuted, ...typography.body, marginTop: 6 },
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  quick: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  quickText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 144, marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 17, lineHeight: 24, textAlignVertical: 'top', boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 10, spreadDistance: -4, color: 'rgba(38,43,39,0.12)' }] },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.4, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  disabled: { opacity: 0.4 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
