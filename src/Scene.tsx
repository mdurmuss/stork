import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ScenePalette } from './theme';
import { StorkMode, StorkView } from './StorkView';

// Full-screen backdrop: Istanbul skyline, Bosphorus, and Leyleko's chimney nest.
// Everything is laid out in a 300x640 scene anchored to the bottom of the screen
// (like preserveAspectRatio "xMidYMax slice"), so the bird can be placed on the nest.

const SW = 300;
const SH = 640;

type Props = {
  palette: ScenePalette;
  mode: StorkMode;
  pulseKey?: number;
};

const SKYLINE =
  'M0 120 L0 92 L20 92 L20 84 Q34 66 48 84 L48 92 L58 92 L58 40 L60 30 L62 40 L62 92 L74 92 L74 78 Q98 46 122 78 L122 92 L132 92 L132 36 L134 24 L136 36 L136 92 L150 92 L150 86 Q160 74 170 86 L170 92 L196 92 L196 60 L200 56 L204 60 L204 92 L220 92 L220 82 Q238 60 256 82 L256 92 L266 92 L266 44 L268 34 L270 44 L270 92 L300 92 L300 120 Z';
const CLOUD =
  'M10 28 Q0 28 2 20 Q4 12 14 14 Q18 2 32 6 Q40 -2 52 6 Q66 2 68 14 Q80 14 78 22 Q76 28 68 28 Z';
const STARS: [number, number][] = [[30, 60], [80, 110], [140, 50], [190, 120], [260, 70], [50, 200], [120, 170], [280, 230], [170, 250], [20, 300]];

export function Scene({ palette: p, mode, pulseKey }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const k = Math.max(W / SW, H / SH);
  const ox = (W - SW * k) / 2;
  const oy = H - SH * k;
  const flying = mode === 'fly';

  // 0 = in the nest, 1 = flying. The two grounds crossfade and Leyleko lifts off between them.
  const takeoff = useRef(new Animated.Value(flying ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(takeoff, { toValue: flying ? 1 : 0, duration: 800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [flying]);
  const nestOpacity = takeoff.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // Clouds keep drifting from where they are when the speed changes, instead of jumping back to the start.
  const clouds = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const duration = flying ? 9000 : 45000;
    const drift = (from: number) => {
      Animated.timing(clouds, {
        toValue: -W,
        duration: Math.max(1, (duration * (W + from)) / W),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        clouds.setValue(0);
        drift(0);
      });
    };
    clouds.stopAnimation((v) => drift(v));
    return () => clouds.stopAnimation();
  }, [flying, W]);

  const svgProps = { width: W, height: H, viewBox: `0 0 ${SW} ${SH}`, preserveAspectRatio: 'xMidYMax slice' } as const;

  // Leyleko placement in scene units: top-left of its 220-wide drawing and its width.
  // It is drawn at flight size and scaled down into the nest, so takeoff is one smooth move.
  const air = { x: 66, y: 350, w: 174 };
  const nest = { x: 99, y: 343, w: 139 };
  const birdW = air.w * k;
  const birdH = (birdW * 230) / 220;
  const nestScale = nest.w / air.w;
  const nestDx = (nest.x - air.x) * k - (birdW * (1 - nestScale)) / 2;
  const nestDy = (nest.y - air.y) * k - (birdH * (1 - nestScale)) / 2;
  const birdTransform = [
    { translateX: takeoff.interpolate({ inputRange: [0, 1], outputRange: [nestDx, 0] }) },
    { translateY: takeoff.interpolate({ inputRange: [0, 1], outputRange: [nestDy, 0] }) },
    { scale: takeoff.interpolate({ inputRange: [0, 1], outputRange: [nestScale, 1] }) },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg {...svgProps} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.sky[0]} />
            <Stop offset="0.55" stopColor={p.sky[1]} />
            <Stop offset="1" stopColor={p.sky[2]} />
          </LinearGradient>
        </Defs>
        <Rect x={-SW} y={-SH} width={SW * 3} height={SH * 2} fill="url(#sky)" />
        {p.stars && STARS.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.6} fill="#fff" opacity={0.8} />)}
        <Circle cx={p.sunAt[0]} cy={p.sunAt[1]} r={p.sunAt[2]} fill={p.sun} opacity={0.9} />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: takeoff }]}>
        <Svg {...svgProps}>
          <Path d={SKYLINE} fill={p.skyline} transform="translate(-30 520) scale(1.2 0.667)" />
          <Rect x={-SW} y={590} width={SW * 3} height={60} fill={p.water} />
          <Path d="M0 604 H300 M40 620 H160" stroke={p.waterLine} strokeWidth={2} />
          <Path d="M-10 584 Q150 556 310 584" fill="none" stroke="#e9eef2" strokeWidth={3} />
          <Path d="M60 570 V598 M240 570 V598" stroke="#e9eef2" strokeWidth={4} />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: nestOpacity }]}>
        <Svg {...svgProps}>
          <Path d={SKYLINE} fill={p.skyline} transform="translate(0 430)" />
          <Rect x={-SW} y={540} width={SW * 3} height={110} fill={p.water} />
          <Path d="M0 556 H300 M30 576 H140 M170 596 H280" stroke={p.waterLine} strokeWidth={2} />
          <Path d="M-20 650 L-20 560 L120 500 L260 560 L260 650 Z" fill={p.roof} />
          <Path d="M-20 560 L120 500 L260 560" fill="none" stroke={p.roofEdge} strokeWidth={6} />
          <Path d="M10 580 L120 532 L230 580 M-10 610 L120 554 L250 610" fill="none" stroke={p.roofEdge} strokeWidth={2} opacity={0.6} />
          <Rect x={150} y={440} width={44} height={90} fill={p.chimney} />
          <Rect x={144} y={432} width={56} height={14} rx={3} fill={p.chimneyTop} />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { flexDirection: 'row', width: W * 2, transform: [{ translateX: clouds }] }]}>
        {[0, 1].map((i) => (
          <Svg key={i} {...svgProps}>
            <Path d={CLOUD} fill="#fff" opacity={0.85} transform="translate(190 140) scale(1.3)" />
            <Path d={CLOUD} fill="#fff" opacity={0.7} transform="translate(30 240) scale(0.9)" />
            {flying && <Path d={CLOUD} fill="#fff" opacity={0.6} transform="translate(220 380) scale(0.85)" />}
          </Svg>
        ))}
      </Animated.View>

      <Animated.View style={{ position: 'absolute', left: ox + air.x * k, top: oy + air.y * k, transform: birdTransform }}>
        <StorkView mode={mode} pulseKey={pulseKey} size={birdW} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: nestOpacity }]}>
        <Svg {...svgProps}>
          <Ellipse cx={172} cy={432} rx={44} ry={13} fill={p.nest} />
          <Path
            d="M132 428 Q150 440 172 436 Q194 440 212 428 M136 436 Q160 446 186 440 M150 424 L196 438 M140 432 L206 426"
            stroke={p.twigs}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
