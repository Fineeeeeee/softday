import { StyleSheet, useColorScheme, View } from 'react-native';
import type { ArtworkPeriod, ArtworkScene } from '../domain/dailyArtwork';

type Props = { period: ArtworkPeriod; scene: ArtworkScene };
type ArtworkPalette = { orb: string; cloud: string; ground: string; back: string; front: string; accent: string };

const palettes = {
  light: {
    morning: { orb: '#CBD5CC', cloud: '#FAFBF8', ground: '#A7B3AA', back: '#B9C6BC', front: '#85988B', accent: '#687C70' },
    daytime: { orb: '#D5DDD6', cloud: '#FAFBF8', ground: '#A7B3AA', back: '#B9C6BC', front: '#85988B', accent: '#687C70' },
    evening: { orb: '#B7C3B9', cloud: '#DDE4DE', ground: '#89978E', back: '#91A096', front: '#667A6E', accent: '#53675B' },
  },
  dark: {
    morning: { orb: '#718077', cloud: '#3A433D', ground: '#536158', back: '#4B5C51', front: '#819486', accent: '#A2B5A7' },
    daytime: { orb: '#7C8D82', cloud: '#3D4640', ground: '#56645B', back: '#53645A', front: '#8B9F91', accent: '#A2B5A7' },
    evening: { orb: '#69776E', cloud: '#323A35', ground: '#465249', back: '#405047', front: '#718579', accent: '#91A497' },
  },
} as const;

function PlantScene({ palette }: { palette: ArtworkPalette }) {
  return <>
    <View style={[styles.table, { backgroundColor: palette.ground }]} />
    <View style={[styles.cup, { backgroundColor: palette.accent }]}><View style={styles.cupInner} /></View>
    <View style={[styles.plantStem, { backgroundColor: palette.front }]} />
    <View style={[styles.leaf, styles.leafLeft, { backgroundColor: palette.front }]} />
    <View style={[styles.leaf, styles.leafRight, { backgroundColor: palette.back }]} />
    <View style={[styles.pot, { backgroundColor: palette.accent }]} />
  </>;
}

function CloudScene({ palette }: { palette: ArtworkPalette }) {
  return <>
    <View style={[styles.hillBack, { backgroundColor: palette.back }]} />
    <View style={[styles.hillFront, { backgroundColor: palette.front }]} />
    <View style={[styles.path, { backgroundColor: palette.ground }]} />
    <View style={[styles.tinyTree, { backgroundColor: palette.accent }]} />
    <View style={[styles.treeTop, { backgroundColor: palette.front }]} />
  </>;
}

function CompanionScene({ palette }: { palette: ArtworkPalette }) {
  return <>
    <View style={[styles.cushion, { backgroundColor: palette.back }]} />
    <View style={[styles.catBody, { backgroundColor: palette.accent }]} />
    <View style={[styles.catHead, { backgroundColor: palette.accent }]} />
    <View style={[styles.ear, styles.earLeft, { borderBottomColor: palette.accent }]} />
    <View style={[styles.ear, styles.earRight, { borderBottomColor: palette.accent }]} />
    <View style={[styles.tail, { borderColor: palette.accent }]} />
    <View style={[styles.lampStem, { backgroundColor: palette.ground }]} />
    <View style={[styles.lampShade, { borderBottomColor: palette.orb }]} />
  </>;
}

export function DailyIllustration({ period, scene }: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = palettes[scheme][period];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.scene}>
      <View style={[styles.orb, period === 'evening' && styles.moon, { backgroundColor: palette.orb }]} />
      <View style={[styles.cloud, { backgroundColor: palette.cloud }]} />
      {period === 'evening' ? <><View style={[styles.star, styles.starOne]} /><View style={[styles.star, styles.starTwo]} /></> : null}
      {scene === 'plant' ? <PlantScene palette={palette} /> : scene === 'clouds' ? <CloudScene palette={palette} /> : <CompanionScene palette={palette} />}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { height: 126, overflow: 'hidden', position: 'relative' },
  orb: { position: 'absolute', right: 30, top: 8, width: 42, height: 42, borderRadius: 21, opacity: 0.82 },
  moon: { width: 36, height: 36, borderRadius: 18, opacity: 0.9 },
  cloud: { position: 'absolute', right: 62, top: 35, width: 58, height: 19, borderRadius: 20, opacity: 0.82 },
  star: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8D4CB' },
  starOne: { right: 18, top: 50 },
  starTwo: { right: 84, top: 17 },
  table: { position: 'absolute', bottom: 9, left: 10, right: 10, height: 5, borderRadius: 3 },
  cup: { position: 'absolute', bottom: 15, left: 50, width: 42, height: 37, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  cupInner: { width: 34, height: 7, alignSelf: 'center', marginTop: 3, borderRadius: 8, backgroundColor: 'rgba(73,63,54,0.62)' },
  plantStem: { position: 'absolute', right: 58, bottom: 37, width: 3, height: 42, borderRadius: 2 },
  leaf: { position: 'absolute', width: 25, height: 14, borderTopLeftRadius: 16, borderBottomRightRadius: 16 },
  leafLeft: { right: 60, bottom: 52, transform: [{ rotate: '22deg' }] },
  leafRight: { right: 37, bottom: 64, transform: [{ rotate: '-18deg' }] },
  pot: { position: 'absolute', right: 40, bottom: 14, width: 38, height: 26, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  hillBack: { position: 'absolute', left: 4, right: 34, bottom: -25, height: 78, borderTopLeftRadius: 70, borderTopRightRadius: 70, transform: [{ rotate: '-3deg' }] },
  hillFront: { position: 'absolute', left: 55, right: -24, bottom: -32, height: 83, borderTopLeftRadius: 72, borderTopRightRadius: 72 },
  path: { position: 'absolute', left: 55, bottom: 0, width: 14, height: 54, borderRadius: 10, transform: [{ rotate: '28deg' }], opacity: 0.78 },
  tinyTree: { position: 'absolute', right: 35, bottom: 29, width: 4, height: 25, borderRadius: 2 },
  treeTop: { position: 'absolute', right: 23, bottom: 45, width: 28, height: 28, borderRadius: 16 },
  cushion: { position: 'absolute', right: 24, bottom: 10, width: 82, height: 24, borderRadius: 18 },
  catBody: { position: 'absolute', right: 47, bottom: 28, width: 43, height: 43, borderRadius: 22 },
  catHead: { position: 'absolute', right: 51, bottom: 60, width: 36, height: 31, borderRadius: 16 },
  ear: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 15, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  earLeft: { right: 72, bottom: 82, transform: [{ rotate: '-12deg' }] },
  earRight: { right: 48, bottom: 82, transform: [{ rotate: '12deg' }] },
  tail: { position: 'absolute', right: 30, bottom: 37, width: 32, height: 28, borderWidth: 7, borderLeftColor: 'transparent', borderBottomColor: 'transparent', borderRadius: 22, transform: [{ rotate: '20deg' }] },
  lampStem: { position: 'absolute', left: 28, bottom: 25, width: 4, height: 52, borderRadius: 2 },
  lampShade: { position: 'absolute', left: 13, bottom: 69, width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 17, borderBottomWidth: 25, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
});
