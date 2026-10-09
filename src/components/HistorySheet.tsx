import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getYearHistoryRange, summarizeCompletedHistory, summarizeHistoryTrails, type HistoryRange } from '../domain/recentHistory';
import { isDateKey, toDateKey } from '../domain/planner';
import { colors, elevation, radii, spacing, typography } from '../theme/tokens';
import { HistoryEntry, SavedHistoryReview } from '../types';

type Props = {
  entries: HistoryEntry[];
  visible: boolean;
  onClose: () => void;
  onRequestAiReview: (range: HistoryRange) => void;
  aiReviews: SavedHistoryReview[];
  aiReviewError?: string;
  aiReviewLoading?: boolean;
};
type ReviewMode = 'recent' | 'year' | 'range';

const modeOptions: { value: ReviewMode; label: string }[] = [
  { value: 'recent', label: '最近' },
  { value: 'year', label: '今年' },
  { value: 'range', label: '选时段' },
];

function recentRange(now = new Date()): HistoryRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  start.setDate(start.getDate() - 27);
  return { start: toDateKey(start), end: toDateKey(now) };
}

function initialCustomRange(now = new Date()): HistoryRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  start.setDate(start.getDate() - 89);
  return { start: toDateKey(start), end: toDateKey(now) };
}

function monthRange(year: number, month: number): HistoryRange {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthText = String(month + 1).padStart(2, '0');
  return { start: `${year}-${monthText}-01`, end: `${year}-${monthText}-${String(lastDay).padStart(2, '0')}` };
}

function dateLabel(date: string) {
  const today = toDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === today) return '今天';
  if (date === toDateKey(yesterday)) return '昨天';
  const [year, month, day] = date.split('-').map(Number);
  return year === new Date().getFullYear() ? `${month}月${day}日` : `${year}年${month}月${day}日`;
}

function timeLabel(entry: HistoryEntry) {
  if (!entry.occurredAt) return '';
  const date = new Date(entry.occurredAt);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function HistorySheet({ entries, visible, onClose, onRequestAiReview, aiReviews, aiReviewError, aiReviewLoading = false }: Props) {
  const currentYear = new Date().getFullYear();
  const defaultRange = initialCustomRange();
  const [mode, setMode] = useState<ReviewMode>('recent');
  const [year, setYear] = useState(currentYear);
  const [startText, setStartText] = useState(defaultRange.start);
  const [endText, setEndText] = useState(defaultRange.end);
  const [customRange, setCustomRange] = useState(defaultRange);
  const customValid = isDateKey(startText) && isDateKey(endText) && startText <= endText;
  const range = mode === 'recent' ? recentRange() : mode === 'year' ? getYearHistoryRange(year) : customRange;
  const review = useMemo(() => summarizeCompletedHistory(entries, range), [entries, range.start, range.end]);
  const visibleAiReview = aiReviews.find((review) => review.range.start === range.start && review.range.end === range.end)?.result ?? null;
  const trails = useMemo(() => summarizeHistoryTrails(entries, range), [entries, range.start, range.end]);
  const groups = review.entries.reduce<{ date: string; entries: HistoryEntry[] }[]>((result, entry) => {
    const group = result.find((candidate) => candidate.date === entry.date);
    if (group) group.entries.push(entry);
    else result.push({ date: entry.date, entries: [entry] });
    return result;
  }, []);

  function chooseMonth(month: number) {
    const nextRange = monthRange(year, month);
    setStartText(nextRange.start);
    setEndText(nextRange.end);
    setCustomRange(nextRange);
    setMode('range');
  }

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.backdrop} />
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text maxFontSizeMultiplier={1.25} style={styles.title}>回顾</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>看看这段时间，自己做过了什么。</Text>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>

      <View style={styles.segment}>
        {modeOptions.map((option) => <Pressable key={option.value} onPress={() => setMode(option.value)} style={[styles.segmentOption, mode === option.value && styles.segmentOptionActive]}><Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={[styles.segmentText, mode === option.value && styles.segmentTextActive]}>{option.label}</Text></Pressable>)}
      </View>

      {mode === 'year' ? <View style={styles.yearCard}>
        <View style={styles.yearHeader}>
          <Pressable accessibilityLabel="上一年" hitSlop={10} onPress={() => setYear((value) => value - 1)}><Text style={styles.yearArrow}>‹</Text></Pressable>
          <View><Text style={styles.yearTitle}>{year} 年</Text><Text style={styles.yearHint}>点一个月，可以只看那个月</Text></View>
          <Pressable accessibilityLabel="下一年" disabled={year >= currentYear} hitSlop={10} onPress={() => setYear((value) => Math.min(currentYear, value + 1))}><Text style={[styles.yearArrow, year >= currentYear && styles.yearArrowDisabled]}>›</Text></Pressable>
        </View>
        <View style={styles.heatmap}>
          {Array.from({ length: 12 }, (_, month) => {
            const days = new Date(year, month + 1, 0).getDate();
            return <Pressable accessibilityLabel={`查看${month + 1}月`} key={month} onPress={() => chooseMonth(month)} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{month + 1}月</Text>
              <View style={styles.dayCells}>{Array.from({ length: 31 }, (_, index) => {
                const day = index + 1;
                if (day > days) return <View key={day} style={[styles.dayCell, styles.dayCellEmpty]} />;
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const count = review.countsByDate[key] ?? 0;
                return <View key={day} style={[styles.dayCell, count > 0 && styles.dayCellFilled, count > 1 && styles.dayCellMedium, count > 3 && styles.dayCellStrong]} />;
              })}</View>
            </Pressable>;
          })}
        </View>
      </View> : null}

      {mode === 'range' ? <View style={styles.rangeCard}>
        <View style={styles.rangeInputs}>
          <View style={styles.rangeField}><Text style={styles.rangeLabel}>从</Text><TextInput autoCapitalize="none" inputMode="numeric" onChangeText={setStartText} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.rangeInput} value={startText} /></View>
          <View style={styles.rangeField}><Text style={styles.rangeLabel}>到</Text><TextInput autoCapitalize="none" inputMode="numeric" onChangeText={setEndText} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.rangeInput} value={endText} /></View>
        </View>
        {!customValid ? <Text style={styles.rangeError}>请填有效日期，开始时间不要晚于结束时间。</Text> : null}
        <Pressable disabled={!customValid} onPress={() => setCustomRange({ start: startText, end: endText })} style={[styles.rangeAction, !customValid && styles.rangeActionDisabled]}><Text style={styles.rangeActionText}>看这段</Text></Pressable>
      </View> : null}

      <View style={styles.summary}>
        <Text style={styles.summaryNumber}>{review.total}</Text>
        <Text style={styles.summaryCopy}>件做过的事</Text>
        <View style={styles.summaryDivider} />
        <Text style={styles.summaryNumber}>{review.activeDays}</Text>
        <Text style={styles.summaryCopy}>天留下记录</Text>
      </View>

      {visibleAiReview ? <View style={styles.aiReview}>
        <Text style={styles.aiEyebrow}>这段时间的复盘</Text>
        <Text style={styles.aiSummary}>{visibleAiReview.summary}</Text>
        {visibleAiReview.observations.map((observation) => <View key={observation} style={styles.aiObservation}><View style={styles.aiDot} /><Text style={styles.aiObservationText}>{observation}</Text></View>)}
        {visibleAiReview.question ? <Text style={styles.aiQuestion}>{visibleAiReview.question}</Text> : null}
        <Pressable accessibilityRole="button" disabled={aiReviewLoading} onPress={() => onRequestAiReview(range)} style={styles.refreshReview}><Text style={styles.refreshReviewText}>{aiReviewLoading ? '正在重新复盘' : '重新复盘这段'}</Text></Pressable>
      </View> : <Pressable disabled={!review.total || aiReviewLoading} onPress={() => onRequestAiReview(range)} style={[styles.aiAction, (!review.total || aiReviewLoading) && styles.rangeActionDisabled]}>
        {aiReviewLoading ? <ActivityIndicator color={colors.accentDark} size="small" /> : null}<Text style={styles.aiActionText}>{aiReviewLoading ? '正在复盘，离开这里也会继续' : '帮我复盘这段'}</Text>
      </Pressable>}
      {aiReviewError ? <Text style={styles.rangeError}>{aiReviewError}</Text> : null}

      {trails.length ? <View style={styles.trails}>
        <Text style={styles.trailsTitle}>最近常出现</Text>
        {trails.map((trail, index) => <View key={`${trail.title}-${index}`} style={[styles.trailRow, index > 0 && styles.trailRowSeparated]}><Text numberOfLines={1} style={styles.trailTitle}>{trail.title}</Text><Text style={styles.trailMeta}>{trail.count} 次{trail.timingLabel ? ` · ${trail.timingLabel}` : ''}</Text></View>)}
      </View> : null}

      <View style={styles.list}>
        {groups.length ? groups.map((group) => <View key={group.date} style={styles.group}>
          <Text style={styles.day}>{dateLabel(group.date)}</Text>
          <View style={styles.timeline}>
            {group.entries.map((entry, index) => <View key={entry.id} style={styles.row}>
              <View style={styles.timeColumn}><Text adjustsFontSizeToFit maxFontSizeMultiplier={1} minimumFontScale={0.8} numberOfLines={1} style={styles.time}>{timeLabel(entry)}</Text><View style={styles.dot} />{index < group.entries.length - 1 ? <View style={styles.line} /> : null}</View>
              <View style={styles.copy}><Text style={styles.itemTitle}>{entry.itemTitle}</Text>{entry.projectTitle ? <Text style={styles.meta}>{entry.projectTitle}</Text> : null}</View>
            </View>)}
          </View>
        </View>) : <Text style={styles.empty}>这段时间还没有完成记录。</Text>}
      </View>
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text maxFontSizeMultiplier={1.15} style={styles.closeText}>收好</Text></Pressable>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31, 37, 32, 0.24)' },
  sheet: { ...elevation.floating, position: 'absolute', left: 0, right: 0, bottom: 0, height: '90%', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 25, lineHeight: 31, fontWeight: '600' },
  subtitle: { color: colors.textMuted, ...typography.body, marginTop: 4 },
  scroll: { flex: 1 },
  body: { paddingBottom: spacing.lg },
  segment: { flexDirection: 'row', gap: 2, marginTop: spacing.md, padding: 3, borderRadius: 16, backgroundColor: colors.segmentBackground },
  segmentOption: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  segmentOptionActive: { backgroundColor: colors.segmentSelected, boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 8, spreadDistance: -2, color: 'rgba(38,43,39,0.16)' }] },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', opacity: 0.58 },
  segmentTextActive: { color: colors.text, opacity: 1 },
  yearCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  yearHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  yearTitle: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  yearHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  yearArrow: { minWidth: 28, color: colors.accentDark, fontSize: 28, lineHeight: 32, textAlign: 'center' },
  yearArrowDisabled: { opacity: 0.2 },
  heatmap: { gap: 4 },
  monthRow: { minHeight: 11, flexDirection: 'row', alignItems: 'center' },
  monthLabel: { width: 25, color: colors.textMuted, fontSize: 9, fontVariant: ['tabular-nums'] },
  dayCells: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { width: 6, height: 6, borderRadius: 2, backgroundColor: colors.line, opacity: 0.4 },
  dayCellEmpty: { opacity: 0 },
  dayCellFilled: { backgroundColor: colors.accent, opacity: 0.42 },
  dayCellMedium: { opacity: 0.68 },
  dayCellStrong: { backgroundColor: colors.accentDark, opacity: 0.92 },
  rangeCard: { gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  rangeInputs: { flexDirection: 'row', gap: spacing.sm },
  rangeField: { flex: 1, gap: 5 },
  rangeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  rangeInput: { minHeight: 42, paddingHorizontal: 11, borderRadius: radii.sm, backgroundColor: colors.surface, color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  rangeError: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  rangeAction: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.accentStrong },
  rangeActionDisabled: { opacity: 0.35 },
  rangeActionText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: 5, paddingVertical: spacing.md },
  summaryNumber: { color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: '600', fontVariant: ['tabular-nums'] },
  summaryCopy: { color: colors.textMuted, fontSize: 12 },
  summaryDivider: { width: 1, height: 16, marginHorizontal: 5, backgroundColor: colors.line },
  aiAction: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  aiActionText: { color: colors.accentDark, fontSize: 14, fontWeight: '600' },
  aiReview: { gap: 8, marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface },
  aiEyebrow: { color: colors.accentDark, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  aiSummary: { color: colors.text, fontSize: 15, lineHeight: 23 },
  aiObservation: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8, backgroundColor: colors.accent },
  aiObservationText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  aiQuestion: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '500', marginTop: 2 },
  refreshReview: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: 2 },
  refreshReviewText: { color: colors.accentDark, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  trails: { marginBottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  trailsTitle: { color: colors.textMuted, fontSize: 11, lineHeight: 17, fontWeight: '600', marginBottom: 2 },
  trailRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trailRowSeparated: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  trailTitle: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  trailMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  list: { gap: spacing.lg, paddingBottom: spacing.lg },
  group: { gap: spacing.sm },
  day: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginLeft: 72 },
  timeline: { paddingVertical: 4, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: spacing.md },
  timeColumn: { width: 72, alignItems: 'flex-start', position: 'relative', paddingTop: 17 },
  time: { width: 48, color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
  dot: { position: 'absolute', right: 8, top: 21, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  line: { position: 'absolute', right: 12, top: 30, bottom: -21, width: 1, backgroundColor: colors.line },
  copy: { flex: 1, justifyContent: 'center', gap: 4, paddingLeft: spacing.md, paddingVertical: 12 },
  itemTitle: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  meta: { color: colors.textMuted, fontSize: 12 },
  empty: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
  close: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  closeText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
