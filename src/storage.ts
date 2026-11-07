import AsyncStorage from '@react-native-async-storage/async-storage';

export type Progress = {
  km: number;
  sessionsToday: number;
  // Local date (YYYY-MM-DD) that sessionsToday belongs to.
  day: string;
};

const KEY = 'stork/progress';

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadProgress(): Promise<Progress> {
  const fresh: Progress = { km: 0, sessionsToday: 0, day: today() };
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved: Progress = JSON.parse(raw);
    return saved.day === today() ? saved : { ...saved, sessionsToday: 0, day: today() };
  } catch {
    return fresh;
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
}
