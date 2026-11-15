import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pedometer } from 'expo-sensors';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Figtree_500Medium, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { HOME, ROUTE_KM, Stop, currentStop, nextStop } from './src/route';
import { Progress, loadProgress, saveProgress, today } from './src/storage';
import { StorkMode } from './src/StorkView';
import { JourneyBar } from './src/JourneyBar';
import { Scene } from './src/Scene';
import { FadeIn } from './src/FadeIn';
import { haptic, loadMuted, play, setAmbience, setMuted } from './src/sounds';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, scenes, timeOfDay } from './src/theme';
import { endSession, endStaleSessions, showSession } from './src/liveSession';
import type { SessionActivityProps } from './src/SessionActivity';

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
  const [muted, setMutedState] = useState(false);
  const breakStart = useRef(new Date());
  const startedAt = useRef(0);
  const reportedSteps = useRef(0);
  const buzzedSteps = useRef(0);

  useEffect(() => {
    loadProgress().then(setProgress);
    loadMuted().then(setMutedState);
    endStaleSessions();
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

  // Keep the lock screen in sync during the break, without spamming iOS with updates.
  useEffect(() => {
    if (phase !== 'break') return;
    if (!stretch && steps - reportedSteps.current < 25) return;
    reportedSteps.current = steps;
    showSession(activity('break', startedAt.current, endAt, 'Walk! Leyleko is flying', breakSubtitle()));
  }, [steps, stretch]);

  // A soft tap in your pocket every 25 steps, so you can feel Leyleko flying.
  useEffect(() => {
    if (phase !== 'break') return;
    if (Math.floor(steps / 25) > Math.floor(buzzedSteps.current / 25)) haptic.step();
    buzzedSteps.current = steps;
  }, [steps]);

  const night = timeOfDay(new Date(now)) === 'night';
  // Arriving home plays the reunion first; the words follow once it has landed.
  const reunion = phase === 'result' && reached === HOME;

  // Wind while Leyleko flies, crickets and water at night, silence otherwise.
  useEffect(() => {
    setAmbience(phase === 'break' ? 'wind' : night ? 'night' : null);
  }, [phase, night]);

  // The clatter and thump land with Leyleko on the boat.
  useEffect(() => {
    if (!reunion) return;
    const id = setTimeout(() => {
      play('clatter');
      haptic.landing();
    }, 1700);
    return () => clearTimeout(id);
  }, [reunion]);

  const remaining = Math.max(0, endAt - now);

  useEffect(() => {
    if (remaining > 0) return;
    if (phase === 'focus') startBreak();
    else if (phase === 'break') finishBreak();
  }, [remaining, phase]);

  function activity(
    p: SessionActivityProps['phase'],
    startAt: number,
    end: number,
    title: string,
    subtitle: string,
    km = progress?.km ?? 0,
  ): SessionActivityProps {
    const upcoming = nextStop(km);
    return {
      phase: p,
      startAt,
      endAt: end,
      title,
      subtitle,
      km: Math.round(km),
      nextName: upcoming ? `${upcoming.name.split(' · ')[0]} in ${Math.round(upcoming.km - km)} km` : 'Home with the fisherman',
      progress: km / ROUTE_KM,
    };
  }

  function breakSubtitle() {
    return stretch ? 'Desk stretch · gliding slowly' : `${steps} steps · +${steps >= MIN_STEPS ? steps : 0} km`;
  }

  function startFocus() {
    // Ask for motion access now, so the break can start the moment focus ends.
    Pedometer.requestPermissionsAsync();
    haptic.tap();
    const start = Date.now();
    const end = start + FOCUS_MS;
    startedAt.current = start;
    setEndAt(end);
    setNow(start);
    setPhase('focus');
    showSession(activity('focus', start, end, 'Leyleko is on the chimney', `Focus · session ${(progress?.sessionsToday ?? 0) + 1} today`));
  }

  function startBreak() {
    const start = Date.now();
    const end = start + BREAK_MS;
    breakStart.current = new Date(start);
    startedAt.current = start;
    reportedSteps.current = 0;
    buzzedSteps.current = 0;
    play('chime');
    haptic.done();
    setSteps(0);
    setStretch(false);
    setEndAt(end);
    setNow(start);
    setPhase('break');
    showSession(activity('break', start, end, 'Walk! Leyleko is flying', '0 steps'));
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
    const base = progress ?? { km: 0, sessionsToday: 0, day: today(), migrations: 0 };
    const km = Math.min(ROUTE_KM, base.km + gain);
    const next: Progress = {
      km,
      sessionsToday: base.day === today() ? base.sessionsToday + 1 : 1,
      day: today(),
      // Reaching the fisherman's boat completes a round trip.
      migrations: base.migrations + (km >= ROUTE_KM && base.km < ROUTE_KM ? 1 : 0),
    };
    const stopAfter = currentStop(next.km);
    const newStop = stopAfter !== currentStop(base.km) ? stopAfter : null;
    setReached(newStop);
    const doneAt = Date.now();
    endSession(
      activity(
        'done',
        doneAt,
        doneAt,
        gain > 0 ? `Lak lak! We flew ${gain} km` : 'Leyleko stayed in the nest',
        newStop === HOME ? 'Home! The fisherman was waiting' : newStop ? `We reached ${newStop.name}!` : gain > 0 ? 'Open Stork to start the next focus' : `Walk ${MIN_STEPS}+ steps next break`,
        next.km,
      ),
    );
    // The reunion plays its own clatter when Leyleko lands on the boat.
    if (newStop !== HOME) play(gain > 0 ? 'clatter' : 'chime');
    haptic.done();
    setProgress(next);
    saveProgress(next);
    setSteps(total);
    setLastGain(gain);
    setPhase('result');
  }

  // After the reunion, Leyleko sets off from Istanbul on the next autumn migration.
  function startNewMigration() {
    if (!progress) return;
    const next = { ...progress, km: 0 };
    setProgress(next);
    saveProgress(next);
    setReached(null);
    setPhase('idle');
  }

  // Dev-only: park Leyleko just short of the next stop, so one break reaches it.
  function nearNextStop() {
    const upcoming = progress && nextStop(progress.km);
    if (!upcoming) return;
    const next = { ...progress, km: upcoming.km - 1 };
    setProgress(next);
    saveProgress(next);
  }

  function toggleMuted() {
    setMuted(!muted);
    setMutedState(!muted);
    haptic.tap();
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
  const atHome = progress.km >= ROUTE_KM;
  const textDelay = reunion ? 2400 : 0;

  return (
    <View style={styles.fill}>
      <StatusBar style={ink === colors.ink ? 'dark' : 'light'} />
      <Scene palette={palette} mode={storkMode} pulseKey={phase === 'break' ? steps : undefined} home={atHome ? 'lake' : 'chimney'} celebrate={reunion} />

      <View style={[styles.ui, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <JourneyBar
          km={progress.km}
          color={ink}
          flying={phase === 'break'}
          accessory={
            <Pressable onPress={toggleMuted} hitSlop={8} style={styles.mute} accessibilityRole="button" accessibilityLabel={muted ? 'Turn sounds on' : 'Mute sounds'}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" fill={ink} />
                <Path
                  d={muted ? 'M16 9 L21 15 M21 9 L16 15' : 'M15.5 9 Q17.5 12 15.5 15 M18 6.5 Q22 12 18 17.5'}
                  stroke={ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Pressable>
          }
        />

        <FadeIn key={`mid-${phase}`} style={styles.mid} delay={textDelay}>
          {phase === 'idle' && atHome && (
            <>
              <Text style={[styles.label, { color: ink }]}>Leyleko is home with the fisherman</Text>
              <Text style={[styles.big, { color: ink }]}>Reunited</Text>
              <Text style={[styles.sub, { color: ink }]}>Migrations together: {progress.migrations}</Text>
            </>
          )}

          {phase === 'idle' && !atHome && (
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
                {reached === HOME
                  ? 'Lak lak!\nHome at last'
                  : lastGain > 0
                    ? `Lak lak!\nWe flew ${lastGain} km`
                    : 'Leyleko stayed\nin the nest'}
              </Text>
              <Text style={[styles.sub, { color: ink }]}>
                {reached === HOME
                  ? 'The fisherman was waiting on Lake Uluabat with a fish.'
                  : lastGain === 0
                    ? `Only ${steps} steps. Walk at least ${MIN_STEPS} next break and we'll fly.`
                    : reached?.name === 'Cape Town'
                      ? 'We reached Cape Town! Time to fly home to the fisherman.'
                      : reached
                        ? `We reached ${reached.name}!`
                        : upcoming
                          ? `${upcomingName} is ${Math.round(upcoming.km - progress.km)} km away.`
                          : 'Leyleko is home with the fisherman.'}
              </Text>
            </>
          )}
        </FadeIn>

        <FadeIn key={`actions-${phase}`} style={styles.actions} delay={textDelay}>
          {(phase === 'idle' || phase === 'result') && atHome && (
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={startNewMigration}>
              <Text style={styles.buttonText}>Start a new migration</Text>
            </Pressable>
          )}
          {(phase === 'idle' || phase === 'result') && !atHome && (
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={startFocus}>
              <Text style={styles.buttonText}>{phase === 'idle' ? 'Start focus' : 'Start next focus'}</Text>
            </Pressable>
          )}
          {phase === 'break' && !stretch && (
            <Pressable style={({ pressed }) => [styles.button, styles.buttonLight, pressed && styles.pressed]} onPress={() => setStretch(true)}>
              <Text style={[styles.buttonText, { color: colors.ink }]}>I can't walk right now</Text>
            </Pressable>
          )}
          {phase === 'idle' && !atHome && __DEV__ && (
            <Pressable onPress={nearNextStop} hitSlop={12}>
              <Text style={[styles.sub, { color: ink }]}>Near next stop (dev)</Text>
            </Pressable>
          )}
          {(phase === 'focus' || phase === 'break') && __DEV__ && (
            <Pressable onPress={skip} hitSlop={12}>
              <Text style={[styles.sub, { color: ink }]}>Skip (dev)</Text>
            </Pressable>
          )}
        </FadeIn>
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
  mute: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#fff' },
});
