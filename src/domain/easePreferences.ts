import type { EasePreferences, FrictionKind, StartStyle } from '../types';

export const defaultEasePreferences: EasePreferences = {
  wantMore: '',
  wantLess: '',
  friction: 'unspecified',
  startStyle: 'unspecified',
};

const frictions: FrictionKind[] = ['unclear', 'tired', 'time', 'forget', 'interrupted', 'unspecified'];
const startStyles: StartStyle[] = ['tiny', 'prepare', 'scheduled', 'available', 'unspecified'];

export function isEasePreferences(value: unknown): value is EasePreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<EasePreferences>;
  return typeof candidate.wantMore === 'string'
    && candidate.wantMore.length <= 80
    && typeof candidate.wantLess === 'string'
    && candidate.wantLess.length <= 80
    && frictions.includes(candidate.friction as FrictionKind)
    && startStyles.includes(candidate.startStyle as StartStyle);
}

export function getSmallStartMinutes(preferences: EasePreferences) {
  return preferences.startStyle === 'tiny' || preferences.friction === 'time' || preferences.friction === 'tired' ? 2 : 5;
}

export function getEasePreferencesSummary(preferences: EasePreferences) {
  if (preferences.startStyle === 'tiny') return '先从两分钟开始';
  if (preferences.startStyle === 'prepare') return '先把环境准备好';
  if (preferences.startStyle === 'scheduled') return '到合适时段再开始';
  if (preferences.startStyle === 'available') return '有空时给一个直接动作';
  if (preferences.friction === 'unclear') return '先说清第一步';
  if (preferences.friction === 'tired') return '状态低时留轻一点';
  if (preferences.friction === 'time') return '时间少时自动缩小';
  if (preferences.friction === 'forget') return '把第一步写得一眼能懂';
  if (preferences.friction === 'interrupted') return '被打断后保留接续点';
  return '还没有设置开始偏好';
}

export function getSimplifyPreference(preferences: EasePreferences) {
  return {
    friction: preferences.friction,
    startStyle: preferences.startStyle,
  };
}
