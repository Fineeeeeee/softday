import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import type { BackupMergeResult } from '../domain/backup';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirmImport: (preview: BackupMergeResult) => void;
  onPickImport: () => Promise<string | null>;
  onPreviewImport: (value: string) => BackupMergeResult | null;
  onShareExport: () => Promise<void>;
};

export function DataBackupSheet({ visible, onClose, onConfirmImport, onPickImport, onPreviewImport, onShareExport }: Props) {
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BackupMergeResult | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMode('export');
    setInput('');
    setError('');
    setBusy(false);
    setPreview(null);
  }, [visible]);

  function prepare(value: string) {
    const next = onPreviewImport(value.trim());
    if (next) {
      setInput(value.trim());
      setPreview(next);
      setError('');
      return;
    }
    setPreview(null);
    setError('没有读到有效的 Softday 数据。');
  }

  async function pickFile() {
    setBusy(true);
    setError('');
    try {
      const value = await onPickImport();
      if (value) prepare(value);
    } catch {
      setError('这个文件暂时没读出来。');
    } finally {
      setBusy(false);
    }
  }

  async function shareFile() {
    setBusy(true);
    setError('');
    try {
      await onShareExport();
    } catch {
      setError('文件暂时没导出，请稍后再试。');
    } finally {
      setBusy(false);
    }
  }

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    <KeyboardAwareSheet style={styles.sheet}>
      <View style={styles.handle} />
      <Text maxFontSizeMultiplier={1.25} style={styles.title}>本地数据</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>用一个文件迁移。已有内容只会合并，不会被覆盖。</Text>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.tabs}>
        <Pressable onPress={() => { setMode('export'); setError(''); }} style={[styles.tab, mode === 'export' && styles.tabActive]}><Text style={[styles.tabText, mode === 'export' && styles.tabTextActive]}>导出</Text></Pressable>
        <Pressable onPress={() => { setMode('import'); setError(''); }} style={[styles.tab, mode === 'import' && styles.tabActive]}><Text style={[styles.tabText, mode === 'import' && styles.tabTextActive]}>导入</Text></Pressable>
      </View>
      {mode === 'export' ? <>
        <Text style={styles.hint}>生成一个小文件，可发到另一台设备或存到网盘。</Text>
        <View style={styles.explain}><Text style={styles.explainTitle}>这份文件包含</Text><Text style={styles.explainBody}>今天与想做、时间线记录、使用与奖励偏好。API 密钥不会导出。</Text></View>
        <Pressable disabled={busy} onPress={() => { void shareFile(); }} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? '正在准备…' : '导出为文件'}</Text></Pressable>
      </> : <>
        <Text style={styles.hint}>先读取并预览。相同记录会跳过；已有内容的设备会保留本机设置。</Text>
        <Pressable disabled={busy} onPress={() => { void pickFile(); }} style={[styles.fileButton, busy && styles.disabled]}><Text style={styles.fileButtonText}>{busy ? '正在读取…' : '选择备份文件'}</Text></Pressable>
        <Text style={styles.or}>也可以粘贴旧版备份文本</Text>
        <TextInput multiline onChangeText={(value) => { setInput(value); setPreview(null); }} placeholder="在这里粘贴备份" placeholderTextColor={colors.textMuted} style={styles.textArea} value={input} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!preview ? <Pressable disabled={!input.trim()} onPress={() => prepare(input)} style={[styles.previewButton, !input.trim() && styles.disabled]}><Text style={styles.previewButtonText}>先看看会加入什么</Text></Pressable> : <View style={styles.preview}>
          <Text style={styles.previewTitle}>将加入这台设备</Text>
          <Text style={styles.previewCounts}>今天 {preview.added.plan} 件　想做 {preview.added.ideas} 件　记录 {preview.added.history} 条</Text>
          <Text style={styles.previewNote}>{preview.adoptedSettings ? '这台设备还没有内容，将一并带入原来的使用偏好。' : `跳过 ${preview.skipped} 条重复内容；本机偏好和当前焦点不变。`}</Text>
          <Pressable onPress={() => onConfirmImport(preview)} style={styles.primary}><Text style={styles.primaryText}>确认合并</Text></Pressable>
        </View>}
      </>}
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text maxFontSizeMultiplier={1.15} style={styles.closeText}>完成</Text></Pressable>
    </KeyboardAwareSheet>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '82%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  scroll: { flex: 1 },
  body: { paddingBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: 5, padding: 4, marginTop: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.accentDark },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.md, marginBottom: spacing.sm },
  explain: { padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  explainTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  explainBody: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  textArea: { minHeight: 96, maxHeight: 150, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, fontSize: 12, lineHeight: 18, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, borderRadius: radii.md, backgroundColor: colors.accentStrong },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  fileButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surface },
  fileButtonText: { color: colors.accentDark, fontSize: 15, fontWeight: '600' },
  or: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: spacing.sm },
  previewButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  previewButtonText: { color: colors.accentDark, fontSize: 14, fontWeight: '600' },
  preview: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface },
  previewTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  previewCounts: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 8 },
  previewNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  disabled: { opacity: 0.4 },
  close: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  closeText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
