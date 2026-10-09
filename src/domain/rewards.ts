import type { RewardPreferences } from '../types';

export function getRewardSuggestion(preferences: RewardPreferences, completedCount: number, dateKey: string) {
  const disliked = new Set(preferences.dislikes.map((item) => item.trim().toLocaleLowerCase()));
  const choices = preferences.likes.map((item) => item.trim()).filter((item) => item && !disliked.has(item.toLocaleLowerCase()));
  if (!choices.length || completedCount < preferences.lowGoal) return null;
  const level = completedCount >= preferences.highGoal ? 'high' : 'low';
  const seed = [...`${dateKey}-${level}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  const choice = choices[seed % choices.length]!;
  return {
    level,
    title: level === 'high' ? '今天走得比预期远' : '到一个小停靠点了',
    body: `可以给自己：${choice}`,
  } as const;
}
