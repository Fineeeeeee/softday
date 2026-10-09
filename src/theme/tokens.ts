import { DynamicColorIOS, Platform, PlatformColor, type ColorValue } from 'react-native';

function semanticColor(light: string, dark: string, android: string): ColorValue {
  if (Platform.OS === 'ios') return DynamicColorIOS({ light, dark });
  if (Platform.OS === 'android') return PlatformColor(android);
  return light;
}

export const colors = {
  background: semanticColor('#F1F3EF', '#171A18', '@color/softday_background'),
  surface: semanticColor('#FAFBF8', '#282D29', '@color/softday_surface'),
  surfaceMuted: semanticColor('#E7EBE6', '#202421', '@color/softday_surface_muted'),
  segmentBackground: semanticColor('#E2E7E2', '#202622', '@color/softday_surface_muted'),
  segmentSelected: semanticColor('#FAFBF8', '#343B36', '@color/softday_surface'),
  actionSoft: semanticColor('#DCE4DD', '#303A33', '@color/softday_accent_soft'),
  actionText: semanticColor('#53675B', '#A2B5A7', '@color/softday_accent_dark'),
  text: semanticColor('#262B27', '#EFF2EE', '@color/softday_text'),
  textMuted: semanticColor('#737B75', '#A4ABA5', '@color/softday_text_muted'),
  accent: semanticColor('#85988B', '#A2B5A7', '@color/softday_accent'),
  accentDark: semanticColor('#53675B', '#B4C4B8', '@color/softday_accent_dark'),
  accentStrong: '#53675B',
  accentSoft: semanticColor('#DCE4DD', '#303A33', '@color/softday_accent_soft'),
  warm: semanticColor('#CBD5CC', '#3A463D', '@color/softday_warm'),
  line: semanticColor('#D9DED9', '#3A413C', '@color/softday_line'),
  bar: semanticColor('rgba(241, 243, 239, 0.94)', 'rgba(23, 26, 24, 0.94)', '@color/softday_bar'),
  danger: semanticColor('#835F5B', '#D2A6A0', '@color/softday_danger'),
  dangerSoft: semanticColor('#EEE5E3', '#382C2A', '@color/softday_danger_soft'),
  warmSurface: semanticColor('#E3E8E3', '#29302B', '@color/softday_warm_surface'),
  warmText: semanticColor('#627068', '#ABB9AF', '@color/softday_warm_text'),
  warmDot: '#7C8F82',
  conflictSurface: semanticColor('#E1E6E1', '#29312C', '@color/softday_conflict_surface'),
  conflictText: semanticColor('#5F6B63', '#AAB7AE', '@color/softday_conflict_text'),
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const typography = {
  screenTitle: { fontSize: 30, lineHeight: 36, fontWeight: '600' as const, letterSpacing: -0.6 },
  heroTitle: { fontSize: 22, lineHeight: 29, fontWeight: '600' as const, letterSpacing: -0.35 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  meta: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
} as const;

export const elevation = {
  raised: { boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 36, spreadDistance: -10, color: 'rgba(38,43,39,0.10)' }, { offsetX: 0, offsetY: 3, blurRadius: 10, spreadDistance: -3, color: 'rgba(38,43,39,0.05)' }] },
  floating: { boxShadow: [{ offsetX: 0, offsetY: 16, blurRadius: 40, spreadDistance: -10, color: 'rgba(38,43,39,0.15)' }] },
} as const;
