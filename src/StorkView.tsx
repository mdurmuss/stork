import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

// Leyleko: tall, clumsy, scarf-wearing stork.
// Drawn as stacked SVG layers (same 220x230 viewBox) so each part can be
// animated on the native driver: body, wing, eye, lower beak.

export type StorkMode = 'idle' | 'fly' | 'happy' | 'grounded';

type Props = {
  mode: StorkMode;
  // Changes on every new step; each change triggers a small pulse.
  pulseKey?: number;
  size?: number;
};

const VB_W = 220;
const VB_H = 230;
const INK = '#1d2830';
const LEG = '#d9412f';
const BEAK = '#ee7a2a';
const SCARF = '#2f8f83';
const SCARF_STRIPE = '#f3e3c3';

const sine = Easing.inOut(Easing.sin);

function loop(value: Animated.Value, to: number, duration: number, delay = 0) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: to, duration, easing: sine, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: sine, useNativeDriver: true }),
    ]),
  );
}

function to(value: Animated.Value, toValue: number, duration: number) {
  return Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
}

export function StorkView({ mode, pulseKey, size = 220 }: Props) {
  const s = size / VB_W;
  const height = VB_H * s;

  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const droop = useRef(new Animated.Value(0)).current;
  const wing = useRef(new Animated.Value(0)).current;
  const lid = useRef(new Animated.Value(1)).current; // eye scaleY
  const beak = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    [bob, drift, hop, droop, wing, beak].forEach((v) => v.setValue(0));
    lid.setValue(1);

    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(3600),
        to(lid, 0.08, 70),
        to(lid, 1, 90),
      ]),
    );
    const clatter = Animated.sequence(
      Array.from({ length: 4 }, () => Animated.sequence([to(beak, 1, 60), to(beak, 0, 60)])),
    );

    let anim: Animated.CompositeAnimation;
    if (mode === 'idle') {
      anim = Animated.parallel([loop(bob, -5, 1200), blink]);
    } else if (mode === 'fly') {
      anim = Animated.parallel([
        clatter,
        loop(wing, 1, 140),
        loop(bob, -10, 140),
        loop(drift, 12, 1800),
        blink,
      ]);
    } else if (mode === 'happy') {
      anim = Animated.parallel([
        clatter,
        Animated.sequence([to(hop, -24, 220), Animated.timing(hop, { toValue: 0, duration: 300, easing: Easing.bounce, useNativeDriver: true })]),
        loop(bob, -5, 1200),
        blink,
      ]);
    } else {
      anim = Animated.parallel([to(droop, 1, 900), to(lid, 0.45, 900)]);
    }
    anim.start();
    return () => anim.stop();
  }, [mode]);

  useEffect(() => {
    if (!pulseKey) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [pulseKey]);

  // RN rotates/scales around a view's center; shift so it happens around a viewBox point instead.
  function around(px: number, py: number, t: object[]) {
    const dx = (px - VB_W / 2) * s;
    const dy = (py - VB_H / 2) * s;
    return [{ translateX: dx }, { translateY: dy }, ...t, { translateX: -dx }, { translateY: -dy }];
  }

  const layer = (children: ReactNode) => (
    <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );

  const wingRotate = wing.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] });
  const beakRotate = beak.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '16deg'] });
  const droopY = droop.interpolate({ inputRange: [0, 1], outputRange: [0, 8 * s] });
  const droopRotate = droop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] });

  return (
    <Animated.View
      style={{
        width: size,
        height,
        transform: [{ translateX: drift }, { translateY: hop }, { rotate: mode === 'fly' ? '-12deg' : '0deg' }, { scale }],
      }}
    >
      {/* In the nest the legs are hidden; in flight they trail behind like a real stork's. */}
      {mode === 'fly' && layer(<Legs />)}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateY: Animated.add(bob, droopY) }, ...around(110, 150, [{ rotate: droopRotate }])] },
        ]}
      >
        {layer(<Body />)}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: around(118, 118, [{ rotate: wingRotate }]) }]}>
          {layer(<Wing />)}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: around(140, 41, [{ scaleY: lid }]) }]}>
          {layer(<Eye />)}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: around(152, 50, [{ rotate: beakRotate }]) }]}>
          {layer(<Path d="M152 50 L204 60 L152 56 Z" fill={BEAK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />)}
        </Animated.View>
        {layer(<Path d="M151 40 L214 56 L151 51 Z" fill={BEAK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />)}
      </Animated.View>
    </Animated.View>
  );
}

function Legs() {
  return (
    <Path d="M90 140 L20 152 M96 144 L28 162" stroke={LEG} strokeWidth={4.5} strokeLinecap="round" fill="none" />
  );
}

function Body() {
  const neck = 'M118 118 Q128 84 134 52';
  return (
    <G>
      <Path d={neck} fill="none" stroke={INK} strokeWidth={24} strokeLinecap="round" />
      <Ellipse cx={102} cy={126} rx={44} ry={25} rotation={-10} origin="102, 126" fill="none" stroke={INK} strokeWidth={7} />
      <Ellipse cx={102} cy={126} rx={44} ry={25} rotation={-10} origin="102, 126" fill="#fff" />
      <Path d={neck} fill="none" stroke="#fff" strokeWidth={17} strokeLinecap="round" />
      <Path d="M58 128 Q40 132 36 146 Q54 146 66 138 Z" fill={INK} />
      <Circle cx={135} cy={46} r={20} fill="none" stroke={INK} strokeWidth={7} />
      <Circle cx={135} cy={46} r={20} fill="#fff" />
      <Path d="M114 100 Q126 108 138 100 L136 90 Q126 96 116 90 Z" fill={SCARF} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M118 98 L108 124 L118 126 L124 102 Z" fill={SCARF} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M120 93 L120 103 M128 94 L128 104 M112 113 L120 115" stroke={SCARF_STRIPE} strokeWidth={2.5} />
    </G>
  );
}

function Wing() {
  const d = 'M118 116 Q104 148 64 140 Q80 118 118 116 Z';
  return (
    <G>
      <Path d={d} fill="#fff" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <Path d="M64 140 Q84 146 100 140 Q84 134 74 132 Z" fill={INK} />
    </G>
  );
}

function Eye() {
  return (
    <G>
      <Circle cx={140} cy={41} r={5.5} fill={INK} />
      <Path d="M133 40 Q140 33 147 40" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}
