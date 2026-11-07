import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pedometer } from 'expo-sensors';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Figtree_500Medium, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { ROUTE_KM, Stop, currentStop, nextStop } from './src/route';
import { Progress, loadProgress, saveProgress, today } from './src/storage';
import { StorkMode } from './src/StorkView';
import { JourneyBar } from './src/JourneyBar';
import { Scene } from './src/Scene';
import { colors, fonts, scenes, timeOfDay } from './src/theme';

const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
// Fewer steps than this during a break and Leyleko stays in the nest.
const MIN_STEPS = 50;
const KM_PER_STEP = 1;
// Distance for a desk stretch when walking isn't possible.
const STRETCH_KM = 100;

type Phase = 'idle' | 'focus' | 'break' | 'result';

export default function App() {
  const [fontsLoaded] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Figtree_500Medium, Figtree_700Bold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [steps, setSteps] = useState(0);
  const [stretch, setStretch] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [reached, setReached] = useState<Stop | null>(null);
  const breakStart = useRef(new Date());

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  // Remaining time is derived from a fixed end timestamp, so it stays correct
  // even if the app was in the background.
  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'break') return;
    const sub = Pedometer.watchStepCount((r) => setSteps(r.steps));
    return () => sub.remove();
  }, [phase]);

  const remaining = Math.max(0, endAt - now);

  useEffect(() => {
    if (remaining > 0) return;
    if (phase === 'focus') startBreak();
    else if (phase === 'break') finishBreak();
  }, [remaining, phase]);

  function startFocus() {
    setEndAt(Date.now() + FOCUS_MS);
    setNow(Date.now());
    setPhase('focus');
  }

  async function startBreak() {
    await Pedometer.requestPermissionsAsync();
    breakStart.current = new Date();
    setSteps(0);
    setStretch(false);
    setEndAt(Date.now() + BREAK_MS);
    setNow(Date.now());
    setPhase('break');
  }

  async function finishBreak() {
    let total = steps;
    // watchStepCount pauses in the background; iOS can fill the gap from Core Motion.
    if (Platform.OS === 'ios') {
      try {
        const r = await Pedometer.getStepCountAsync(breakStart.current, new Date());
        total = Math.max(total, r.steps);
      } catch {}
    }
    const walked = total >= MIN_STEPS ? total * KM_PER_STEP : 0;
    const gain = Math.max(walked, stretch ? STRETCH_KM : 0);
    const base = progress ?? { km: 0, sessionsToday: 0, day: today() };
    const next: Progress = {
      km: Math.min(ROUTE_KM, base.km + gain),
      sessionsToday: base.day === today() ? base.sessionsToday + 1 : 1,
      day: today(),
    };
    const stopAfter = currentStop(next.km);
    setReached(stopAfter !== currentStop(base.km) ? stopAfter : null);
    setProgress(next);
    saveProgress(next);
    setSteps(total);
    setLastGain(gain);
    setPhase('result');
  }

  // Dev-only shortcut so you don't wait 25 minutes while testing.
  function skip() {
    setEndAt(Date.now());
    setNow(Date.now());
  }

  const palette = scenes[timeOfDay(new Date(now))];
  const ink = palette.text;

  if (!progress) return <View style={[styles.fill, { backgroundColor: palette.sky[1] }]} />;

  const storkMode: StorkMode =
    phase === 'break' ? 'fly' : phase === 'result' ? (lastGain > 0 ? 'happy' : 'grounded') : 'idle';
  const upcoming = nextStop(progress.km);
  const upcomingName = upcoming?.name.split(' · ')[0];

  return (
    <View style={styles.fill}>
      <StatusBar style={ink === colors.ink ? 'dark' : 'light'} />
      <Scene palette={palette} mode={storkMode} pulseKey={phase === 'break' ? steps : undefined} />

      <View style={[styles.ui, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <JourneyBar km={progress.km} color={ink} flying={phase === 'break'} />

        <View style={styles.mid}>
          {phase === 'idle' && (
            <>
              <Text style={[styles.label, { color: ink }]}>Leyleko is resting in the nest</Text>
              <Text style={[styles.timer, { color: ink }]}>25:00</Text>
              <Text style={[styles.sub, { color: ink }]}>Sessions today: {progress.sessionsToday}</Text>
            </>
          )}

          {phase === 'focus' && (
            <>
              <Text style={[styles.label, { color: ink }]}>Leyleko is waiting on the chimney</Text>
              <Text style={[styles.timer, { color: ink }]}>{format(remaining)}</Text>
              <Text style={[styles.sub, { color: ink }]}>Session {progress.sessionsToday + 1} today</Text>
            </>
          )}

          {phase === 'break' && (
            <>
              <Text style={[styles.label, { color: ink }]}>
                {stretch ? 'Stretch at your desk. Leyleko glides slowly' : 'Walk! Leyleko flies with every step'}
              </Text>
              <Text style={[styles.timer, { color: ink }]}>{format(remaining)}</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {stretch ? 'Desk stretch ' : `${steps} steps `}
                  <Text style={{ color: colors.teal }}>
                    +{stretch ? Math.max(STRETCH_KM, steps >= MIN_STEPS ? steps : 0) : steps} km
                  </Text>
                </Text>
              </View>
            </>
          )}

          {phase === 'result' && (
            <>
              <Text style={[styles.big, { color: ink }]}>
                {lastGain > 0 ? `Lak lak!\nWe flew ${lastGain} km` : 'Leyleko stayed\nin the nest'}
              </Text>
              <Text style={[styles.sub, { color: ink }]}>
                {lastGain === 0
                  ? `Only ${steps} steps. Walk at least ${MIN_STEPS} next break and we'll fly.`
                  : reached
                    ? `We reached ${reached.name}!`
                    : upcoming
                      ? `${upcomingName} is ${Math.round(upcoming.km - progress.km)} km away.`
                      : 'We made it to Cape Town!'}
              </Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {(phase === 'idle' || phase === 'result') && (
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={startFocus}>
              <Text style={styles.buttonText}>{phase === 'idle' ? 'Start focus' : 'Start next focus'}</Text>
            </Pressable>
          )}
          {phase === 'break' && !stretch && (
            <Pressable style={({ pressed }) => [styles.button, styles.buttonLight, pressed && styles.pressed]} onPress={() => setStretch(true)}>
              <Text style={[styles.buttonText, { color: colors.ink }]}>I can't walk right now</Text>
            </Pressable>
          )}
          {(phase === 'focus' || phase === 'break') && __DEV__ && (
            <Pressable onPress={skip} hitSlop={12}>
              <Text style={[styles.sub, { color: ink }]}>Skip (dev)</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function format(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  ui: { flex: 1, paddingHorizontal: 24 },
  // Timer sits in the open sky between the route and Leyleko's nest.
  mid: { marginTop: '14%', alignItems: 'center', gap: 4 },
  actions: { marginTop: 'auto', alignItems: 'center', gap: 14 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center', opacity: 0.85 },
  // Baloo's tall descent leaves a gap under the digits; pull the next line up.
  timer: { fontFamily: fonts.displayBold, fontSize: 84, lineHeight: 96, marginBottom: -16, fontVariant: ['tabular-nums'] },
  big: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, textAlign: 'center', marginBottom: 6 },
  pill: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  button: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: colors.ink, paddingVertical: 17, borderRadius: 999 },
  buttonLight: { backgroundColor: 'rgba(255,255,255,0.92)' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#fff' },
});
