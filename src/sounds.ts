import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Sound effects and haptics. The files come from scripts/make-sounds.py.
// Sounds follow the iPhone's silent switch, mix with the user's own music, and can be muted in the app.

setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });

// Players live as long as the app, so they are never released.
const effects = {
  clatter: createAudioPlayer(require('../assets/sounds/clatter.wav')),
  chime: createAudioPlayer(require('../assets/sounds/chime.wav')),
};
const loops = {
  wind: createAudioPlayer(require('../assets/sounds/wind.wav')),
  night: createAudioPlayer(require('../assets/sounds/night.wav')),
};
loops.wind.loop = true;
loops.wind.volume = 0.35;
loops.night.loop = true;
loops.night.volume = 0.3;

export type Ambience = keyof typeof loops | null;

const KEY = 'stork/muted';
let muted = false;
let ambience: Ambience = null;

export async function loadMuted(): Promise<boolean> {
  try {
    muted = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {}
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  AsyncStorage.setItem(KEY, value ? '1' : '0').catch(() => {});
  setAmbience(ambience);
}

export function play(name: keyof typeof effects) {
  if (muted) return;
  const player = effects[name];
  player.seekTo(0);
  player.play();
}

// The background loop for what's on screen: wind while flying, crickets at night, or silence.
export function setAmbience(name: Ambience) {
  ambience = name;
  for (const [key, player] of Object.entries(loops)) {
    if (key === name && !muted) player.play();
    else player.pause();
  }
}

export const haptic = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  step: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  landing: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  done: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
