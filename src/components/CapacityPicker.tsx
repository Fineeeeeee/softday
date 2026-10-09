import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { DayCapacity } from '../types';

const options: { value: DayCapacity; label: string }[] = [
  { value: 'light', label: '想轻松点' },
  { value: 'steady', label: '正常安排' },
  { value: 'open', label: '可以多一点' },
];

type Props = { value: DayCapacity; onChange: (value: DayCapacity) => void };

export function CapacityPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.option, active && styles.optionActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 14, backgroundColor: colors.segmentBackground },
  option: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 11 },
  optionActive: { borderWidth: 0.5, borderColor: colors.line, backgroundColor: colors.segmentSelected, boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 7, spreadDistance: -1, color: 'rgba(24,24,28,0.11)' }] },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '500', opacity: 0.5 },
  labelActive: { color: colors.accentDark, fontWeight: '600', opacity: 1 },
});
