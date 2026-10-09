import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

export function MorningIllustration() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.scene}>
      <View style={styles.sun} />
      <View style={styles.cloud} />
      <View style={styles.table} />
      <View style={styles.cup}>
        <View style={styles.cupInner} />
      </View>
      <View style={styles.plantStem} />
      <View style={[styles.leaf, styles.leafLeft]} />
      <View style={[styles.leaf, styles.leafRight]} />
      <View style={styles.pot} />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { height: 126, overflow: 'hidden', position: 'relative' },
  sun: { position: 'absolute', right: 36, top: 8, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.warm, opacity: 0.72 },
  cloud: { position: 'absolute', right: 66, top: 33, width: 54, height: 20, borderRadius: 20, backgroundColor: colors.surface, opacity: 0.86 },
  table: { position: 'absolute', bottom: 9, left: 10, right: 10, height: 5, borderRadius: 3, backgroundColor: colors.accent, opacity: 0.65 },
  cup: { position: 'absolute', bottom: 15, left: 54, width: 44, height: 39, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: colors.accent },
  cupInner: { width: 36, height: 8, alignSelf: 'center', marginTop: 3, borderRadius: 8, backgroundColor: colors.accentDark },
  plantStem: { position: 'absolute', right: 64, bottom: 37, width: 3, height: 42, borderRadius: 2, backgroundColor: colors.accent },
  leaf: { position: 'absolute', width: 25, height: 14, borderTopLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: colors.accent },
  leafLeft: { right: 66, bottom: 52, transform: [{ rotate: '22deg' }] },
  leafRight: { right: 43, bottom: 64, transform: [{ rotate: '-18deg' }] },
  pot: { position: 'absolute', right: 46, bottom: 14, width: 38, height: 26, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: colors.accentDark },
});
