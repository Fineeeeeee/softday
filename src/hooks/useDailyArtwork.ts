import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getDailyArtwork } from '../domain/dailyArtwork';

export function useDailyArtwork() {
  const [artwork, setArtwork] = useState(getDailyArtwork);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setArtwork(getDailyArtwork());
    });
    return () => subscription.remove();
  }, []);

  return artwork;
}
