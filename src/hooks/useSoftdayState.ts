import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { legacyStateKeys, migrateLegacyState, parseSoftdaySnapshot, type SoftdayState } from '../domain/stateSnapshot';

const snapshotKey = 'softday.state-v2';
type StateField = Exclude<keyof SoftdayState, 'version'>;

export function useSoftdayState(initialState: SoftdayState) {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setReady(false);
    setError(false);
    void (async () => {
      const stored = await AsyncStorage.getItem(snapshotKey);
      let next = stored ? parseSoftdaySnapshot(stored) : null;
      if (stored && !next) throw new Error('Invalid local snapshot');
      if (!next) {
        const rows = await AsyncStorage.multiGet([...legacyStateKeys]);
        next = migrateLegacyState(rows, initialState);
        if (!next) throw new Error('Invalid legacy local data');
        await AsyncStorage.setItem(snapshotKey, JSON.stringify(next));
      }
      if (active) setState(next);
    })().catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, [initialState, loadVersion]);

  useEffect(() => {
    if (!ready || error) return;
    AsyncStorage.setItem(snapshotKey, JSON.stringify(state)).catch(() => setError(true));
  }, [error, ready, state]);

  const setField = useCallback(<K extends StateField>(key: K, action: SetStateAction<SoftdayState[K]>) => {
    setState((current) => ({
      ...current,
      [key]: typeof action === 'function' ? (action as (value: SoftdayState[K]) => SoftdayState[K])(current[key]) : action,
    }));
  }, []);

  return { state, setField, ready, error, reload: () => setLoadVersion((current) => current + 1) };
}
