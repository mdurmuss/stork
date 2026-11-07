import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { LiveActivity } from 'expo-widgets';
import type { SessionActivityProps } from './SessionActivity';

// Thin wrapper so the timer code doesn't care whether Live Activities exist
// (Android, Expo Go, older iOS, or the user turned them off).

// Loaded lazily: importing expo-widgets throws where its native module is missing (e.g. Expo Go),
// and that throw gets reported as fatal in development even when caught, so check first.
function loadActivity(): typeof import('./SessionActivity').SessionActivity | null {
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoWidgets')) return null;
  try {
    return require('./SessionActivity').SessionActivity;
  } catch {
    return null;
  }
}

const SessionActivity = loadActivity();
let current: LiveActivity<SessionActivityProps> | null = null;
const enabled = SessionActivity !== null;

export function showSession(props: SessionActivityProps) {
  if (!enabled) return;
  try {
    if (current) {
      // A new end time makes iOS dim the activity once it passes.
      current.update(props, new Date(props.endAt));
    } else {
      current = SessionActivity.start(props, undefined, new Date(props.endAt));
    }
  } catch (e) {
    console.warn('Live Activity unavailable', e);
  }
}

export function endSession(final?: SessionActivityProps) {
  if (!enabled || !current) return;
  try {
    current.end('default', final);
  } catch (e) {
    console.warn('Could not end Live Activity', e);
  }
  current = null;
}

// Clears activities left over from a previous run (e.g. the app was killed mid-session).
export function endStaleSessions() {
  if (!enabled) return;
  try {
    SessionActivity.getInstances().forEach((a) => a.end('immediate'));
  } catch {}
}
