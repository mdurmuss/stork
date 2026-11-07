import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { ROUTE, ROUTE_KM, currentStop, nextStop } from './route';
import { colors, fonts } from './theme';

type Props = {
  km: number;
  color: string;
  flying?: boolean;
};

const PATH_W = 260;
const X0 = 8;
const X1 = 252;

// Stops are spaced evenly so the early, close-together ones stay readable.
function pathX(km: number): number {
  const i = ROUTE.findIndex((s) => s.km > km);
  if (i === -1) return X1;
  const a = ROUTE[i - 1];
  const b = ROUTE[i];
  const step = (X1 - X0) / (ROUTE.length - 1);
  return X0 + step * (i - 1 + (km - a.km) / (b.km - a.km));
}

// Where Leyleko is on the route; when km increases the path fills and the number counts up.
export function JourneyBar({ km, color, flying }: Props) {
  const value = useRef(new Animated.Value(km)).current;
  const [shownKm, setShownKm] = useState(km);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShownKm(v));
    return () => value.removeListener(id);
  }, []);

  useEffect(() => {
    // Driven from JS because the value feeds text and SVG, not a native transform.
    Animated.timing(value, { toValue: km, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [km]);

  const stop = currentStop(shownKm);
  const upcoming = nextStop(shownKm);
  const x = pathX(shownKm);
  const step = (X1 - X0) / (ROUTE.length - 1);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.stop, { color }]}>{flying && upcoming ? `Flying to ${upcoming.name.split(' · ')[0]}` : stop.name}</Text>
      <Text style={[styles.km, { color }]}>
        {Math.round(shownKm).toLocaleString('en-US')} / {ROUTE_KM.toLocaleString('en-US')} km
        {upcoming ? ` · ${upcoming.name.split(' · ')[0]} in ${Math.round(upcoming.km - shownKm)} km` : ' · arrived!'}
      </Text>
      <Svg style={{ width: '100%', aspectRatio: PATH_W / 20 }} viewBox={`0 0 ${PATH_W} 20`}>
        <Line x1={X0} y1={10} x2={X1} y2={10} stroke={color} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" opacity={0.5} />
        <Line x1={X0} y1={10} x2={x} y2={10} stroke={color} strokeWidth={3} strokeLinecap="round" />
        {ROUTE.slice(1).map((s, i) => (
          <Circle
            key={s.name}
            cx={X0 + step * (i + 1)}
            cy={10}
            r={4}
            fill={s.km <= shownKm ? color : 'none'}
            stroke={color}
            strokeWidth={2}
          />
        ))}
        <Circle cx={x} cy={10} r={7} fill={colors.teal} stroke="#fff" strokeWidth={2.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  stop: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30 },
  km: { fontFamily: fonts.body, fontSize: 14, opacity: 0.8, fontVariant: ['tabular-nums'], marginBottom: 6 },
});
