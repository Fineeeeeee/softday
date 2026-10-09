import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function useStoredState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean, boolean, () => void] {
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setReady(false);
    setError(false);
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (active && stored) setValue(JSON.parse(stored) as T);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, [key, loadVersion]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => setError(true));
  }, [key, ready, value]);

  return [value, setValue, ready, error, () => setLoadVersion((current) => current + 1)];
}
