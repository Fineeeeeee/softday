export type ArtworkPeriod = 'morning' | 'daytime' | 'evening';
export type ArtworkScene = 'plant' | 'clouds' | 'companion';

export function getArtworkPeriod(date = new Date()): ArtworkPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'daytime';
  return 'evening';
}

export function getArtworkScene(date = new Date()): ArtworkScene {
  const scenes: ArtworkScene[] = ['plant', 'clouds', 'companion'];
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return scenes[Math.abs(dayNumber) % scenes.length] ?? 'plant';
}

export function getDailyArtwork(date = new Date()) {
  return { period: getArtworkPeriod(date), scene: getArtworkScene(date) };
}
