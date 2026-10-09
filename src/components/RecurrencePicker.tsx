import { Pressable, StyleSheet, Text, View } from 'react-native';
import { recurrenceLabel } from '../domain/recurrence';
import { colors, radii, spacing } from '../theme/tokens';
import type { RecurrenceRule } from '../types';

type Props = {
  value?: RecurrenceRule;
  proposedValue?: RecurrenceRule;
  suggestion?: string;
  onChange: (value: RecurrenceRule | undefined) => void;
};

const choices: { key: 'none' | RecurrenceRule['frequency']; label: string }[] = [
  { key: 'none', label: '一次' },
  { key: 'daily', label: '每天' },
  { key: 'weekdays', label: '工作日' },
  { key: 'weekly', label: '每周' },
];
const weekdayOptions = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

export function RecurrencePicker({ value, proposedValue, suggestion, onChange }: Props) {
  function choose(key: typeof choices[number]['key']) {
    if (key === 'none') onChange(undefined);
    else if (key === 'daily') onChange({ frequency: 'daily' });
    else if (key === 'weekdays') onChange({ frequency: 'weekdays' });
    else onChange(value?.frequency === 'weekly' ? value : { frequency: 'weekly', weekdays: [new Date().getDay()] });
  }

  function toggleWeekday(day: number) {
    const current = value?.frequency === 'weekly' ? value.weekdays : [];
    if (current.includes(day) && current.length === 1) return;
    const weekdays = current.includes(day) ? current.filter((value) => value !== day) : [...current, day];
    onChange({ frequency: 'weekly', weekdays });
  }

  const activeKey = value?.frequency ?? 'none';
  return <View style={styles.container}>
    <View style={styles.heading}><Text style={styles.label}>之后还会出现</Text>{value ? <Text style={styles.value}>{recurrenceLabel(value)}</Text> : null}</View>
    {suggestion ? <View style={styles.suggestionRow}><Text style={styles.suggestion}>{suggestion}</Text>{proposedValue && !value ? <Pressable onPress={() => onChange(proposedValue)}><Text style={styles.useSuggestion}>用这个</Text></Pressable> : null}</View> : null}
    <View style={styles.options}>{choices.map((choice) => <Pressable key={choice.key} onPress={() => choose(choice.key)} style={[styles.option, activeKey === choice.key && styles.optionActive]}><Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={[styles.optionText, activeKey === choice.key && styles.optionTextActive]}>{choice.label}</Text></Pressable>)}</View>
    {value?.frequency === 'weekly' ? <View style={styles.weekdays}>{weekdayOptions.map((day) => {
      const active = value.weekdays.includes(day);
      return <Pressable accessibilityLabel={`星期${weekdayLabels[day]}`} key={day} onPress={() => toggleWeekday(day)} style={[styles.weekday, active && styles.weekdayActive]}><Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>{weekdayLabels[day]}</Text></Pressable>;
    })}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginTop: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.accentDark, fontSize: 12, fontWeight: '600' },
  suggestion: { color: colors.accentDark, fontSize: 12, lineHeight: 18 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  useSuggestion: { color: colors.accentDark, fontSize: 12, fontWeight: '700' },
  options: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 14, backgroundColor: colors.segmentBackground },
  option: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 11 },
  optionActive: { backgroundColor: colors.segmentSelected },
  optionText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', opacity: 0.55 },
  optionTextActive: { color: colors.text, opacity: 1 },
  weekdays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekday: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.surface },
  weekdayActive: { backgroundColor: colors.accentSoft },
  weekdayText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  weekdayTextActive: { color: colors.accentDark },
});
