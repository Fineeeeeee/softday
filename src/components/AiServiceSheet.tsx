import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { validateAiEndpoint } from '../domain/aiEndpoint';
import { colors, radii, spacing } from '../theme/tokens';
import { AiSettings } from '../types';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = {
  visible: boolean;
  settings: AiSettings;
  hasApiKey: boolean;
  onClose: () => void;
  onSave: (settings: AiSettings, apiKey: string) => Promise<boolean>;
  onClearKey: () => Promise<void>;
  onTestConnection: (settings: AiSettings, apiKey: string) => Promise<string>;
};

export function AiServiceSheet({ visible, settings, hasApiKey, onClose, onSave, onClearKey, onTestConnection }: Props) {
  const [endpoint, setEndpoint] = useState(settings.endpoint);
  const [model, setModel] = useState(settings.model);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const endpointCheck = useMemo(() => validateAiEndpoint(endpoint), [endpoint]);
  const canSave = endpointCheck.valid && Boolean(model.trim()) && (hasApiKey || Boolean(apiKey.trim()));

  useEffect(() => {
    if (!visible) return;
    setEndpoint(settings.endpoint);
    setModel(settings.model);
    setApiKey('');
    setTestMessage('');
  }, [settings, visible]);

  async function save() {
    if (!canSave || !endpointCheck.valid) return;
    setSaving(true);
    const didSave = await onSave({ endpoint: endpointCheck.value, model: model.trim() }, apiKey);
    setSaving(false);
    if (didSave) onClose();
  }

  async function clearKey() {
    await onClearKey();
    setApiKey('');
  }

  async function testConnection() {
    if (!canSave || !endpointCheck.valid) return;
    setTesting(true);
    setTestMessage(await onTestConnection({ endpoint: endpointCheck.value, model: model.trim() }, apiKey));
    setTesting(false);
  }

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>智能服务</Text>
      <Text style={styles.subtitle}>只有你主动使用时，才会发送当前这一步的内容。密钥不会显示、备份或上传到 Softday。</Text>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>API 基础地址</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" onChangeText={setEndpoint} placeholder="https://api.example.com/v1" placeholderTextColor={colors.textMuted} style={styles.input} value={endpoint} />
        <Text style={styles.endpointHint}>发送时自动添加 /chat/completions；已经包含时不会重复添加。</Text>
        {endpoint && !endpointCheck.valid ? <Text style={styles.error}>{endpointCheck.reason}</Text> : null}
        <Text style={styles.label}>模型名称</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setModel} placeholder="例如 gpt-5-mini" placeholderTextColor={colors.textMuted} style={styles.input} value={model} />
        <Text style={styles.label}>API Key</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setApiKey} placeholder={hasApiKey ? '已安全保存；输入可替换' : '只保存在这台设备的安全存储中'} placeholderTextColor={colors.textMuted} secureTextEntry style={styles.input} value={apiKey} />
        <View style={styles.keyRow}><Text style={styles.keyState}>{hasApiKey ? '已安全保存' : '还没有保存密钥'}</Text>{hasApiKey ? <Pressable onPress={() => { void clearKey(); }}><Text style={styles.clear}>移除保存的 Key</Text></Pressable> : null}</View>
        <View style={styles.boundary}><Text style={styles.boundaryTitle}>只用于安排</Text><Text style={styles.boundaryText}>只发送当前事项或当前调整；不回答聊天问题、不执行外部动作。模型结果会先校验并让你确认。</Text></View>
        {canSave ? <View style={styles.testArea}><Pressable disabled={testing} onPress={() => { void testConnection(); }} style={[styles.testButton, testing && styles.disabled]}><Text style={styles.testText}>{testing ? '测试中' : '测试真实 JSON 连接'}</Text></Pressable>{testMessage ? <Text style={styles.testMessage}>{testMessage}</Text> : null}</View> : null}
      </ScrollView>
      <View style={styles.actions}><Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>先不设</Text></Pressable><Pressable disabled={!canSave || saving || testing} onPress={() => { void save(); }} style={[styles.primary, (!canSave || saving || testing) && styles.disabled]}><Text style={styles.primaryText}>{saving ? '保存中' : '安全保存'}</Text></Pressable></View>
    </KeyboardAwareSheet>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '84%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  form: { paddingBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 15 },
  error: { color: colors.danger, fontSize: 12, marginTop: 7 },
  endpointHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  keyRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  keyState: { color: colors.textMuted, fontSize: 12 },
  clear: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  boundary: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.accentSoft },
  boundaryTitle: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  boundaryText: { color: colors.accentDark, fontSize: 12, lineHeight: 19, marginTop: 5, opacity: 0.82 },
  testArea: { marginTop: spacing.lg, gap: spacing.sm },
  testButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  testText: { color: colors.accentDark, fontSize: 14, fontWeight: '600' },
  testMessage: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primary: { flex: 1.3, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
