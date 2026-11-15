import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ScenePalette } from './theme';
import { StorkMode, StorkView } from './StorkView';

// Full-screen backdrop: Istanbul skyline, Bosphorus, and Leyleko's chimney nest, or, once the
// round trip is done, the fisherman's boat on Lake Uluabat.
// Everything is laid out in a 300x640 scene anchored to the bottom of the screen
// (like preserveAspectRatio "xMidYMax slice"), so the bird can be placed on the nest.

const SW = 300;
const SH = 640;

type Props = {
  palette: ScenePalette;
  mode: StorkMode;
  pulseKey?: number;
  // Where Leyleko rests: the Istanbul chimney, or the fisherman's boat after the round trip.
  home?: 'chimney' | 'lake';
  // Plays the reunion: the fisherman waves, offers a fish, and hearts rise.
  celebrate?: boolean;
};

const SKYLINE =
  'M0 120 L0 92 L20 92 L20 84 Q34 66 48 84 L48 92 L58 92 L58 40 L60 30 L62 40 L62 92 L74 92 L74 78 Q98 46 122 78 L122 92 L132 92 L132 36 L134 24 L136 36 L136 92 L150 92 L150 86 Q160 74 170 86 L170 92 L196 92 L196 60 L200 56 L204 60 L204 92 L220 92 L220 82 Q238 60 256 82 L256 92 L266 92 L266 44 L268 34 L270 44 L270 92 L300 92 L300 120 Z';
const CLOUD =
  'M10 28 Q0 28 2 20 Q4 12 14 14 Q18 2 32 6 Q40 -2 52 6 Q66 2 68 14 Q80 14 78 22 Q76 28 68 28 Z';
const HEART = 'M0 3 C0 -1 6 -1 6 3 C6 -1 12 -1 12 3 C12 7 6 10 6 12 C6 10 0 7 0 3 Z';
const STARS: [number, number][] = [[30, 60], [80, 110], [140, 50], [190, 120], [260, 70], [50, 200], [120, 170], [280, 230], [170, 250], [20, 300]];

// The boat and fisherman are drawn at boat scale, then enlarged and raised into place.
const BOAT = 'translate(150 530) scale(1.15) translate(-150 -548)';
// The fisherman's shoulder in scene units (his arm's pivot), after BOAT's transform.
const SHOULDER = { x: 209.8, y: 509.3 };
// Arm angles in degrees: resting in his lap, waving, and holding the fish out to Leyleko.
const ARM_REST = -55;
const ARM_UP = 22;
const ARM_MID = -5;

export function Scene({ palette: p, mode, pulseKey, home = 'chimney', celebrate = false }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const k = Math.max(W / SW, H / SH);
  const ox = (W - SW * k) / 2;
  const oy = H - SH * k;
  const flying = mode === 'fly';
  const lake = home === 'lake';

  // 0 = on the perch, 1 = flying. The two grounds crossfade and Leyleko lifts off between them.
  // Leyleko keeps flapping until it touches down; the boat landing is a slower glide.
  const takeoff = useRef(new Animated.Value(flying ? 1 : 0)).current;
  const [landed, setLanded] = useState(!flying);
  useEffect(() => {
    const anim = Animated.timing(takeoff, {
      toValue: flying ? 1 : 0,
      duration: flying ? 800 : lake ? 1600 : 1000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setLanded(!flying);
    });
    return () => anim.stop();
  }, [flying]);
  const nestOpacity = takeoff.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const birdMode: StorkMode = flying || !landed ? 'fly' : mode;

  // The boat rocks gently on the lake, carrying the fisherman and Leyleko with it.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lake) return;
    const swell = (toValue: number) =>
      Animated.timing(bob, { toValue, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const anim = Animated.loop(Animated.sequence([swell(1), swell(0)]));
    anim.start();
    return () => anim.stop();
  }, [lake]);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [-1.5 * k, 1.5 * k] });

  // The reunion: wave, offer the fish just as Leyleko lands, Leyleko takes it, hearts rise.
  const arm = useRef(new Animated.Value(ARM_REST)).current;
  const fish = useRef(new Animated.Value(1)).current; // 0 = in his hand, 1 = eaten
  const hearts = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    arm.setValue(ARM_REST);
    hearts.setValue(0);
    fish.setValue(celebrate ? 0 : 1);
    if (!celebrate) return;
    const to = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
    const anim = Animated.sequence([
      Animated.delay(300),
      to(arm, ARM_UP, 300),
      to(arm, ARM_MID, 250),
      to(arm, ARM_UP, 250),
      to(arm, ARM_MID, 250),
      to(arm, 0, 350),
      Animated.delay(250),
      to(fish, 1, 450, Easing.in(Easing.quad)),
      Animated.parallel([
        to(hearts, 1, 1600, Easing.out(Easing.quad)),
        Animated.sequence([Animated.delay(500), to(arm, ARM_REST, 700)]),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [celebrate]);

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

  // RN rotates a view around its center; shift so a full-screen layer turns around a scene point.
  function around(sx: number, sy: number, rotate: Animated.AnimatedInterpolation<string>) {
    const dx = ox + sx * k - W / 2;
    const dy = oy + sy * k - H / 2;
    return [{ translateX: dx }, { translateY: dy }, { rotate }, { translateX: -dx }, { translateY: -dy }];
  }

  // Leyleko placement in scene units: top-left of its 220-wide drawing and its width.
  // It is drawn at flight size and scaled down onto its perch, so takeoff is one smooth move.
  const air = { x: 66, y: 350, w: 174 };
  // The boat perch is the stern seat, after BOAT's transform.
  const nest = lake ? { x: 39.6, y: 444.9, w: 138 } : { x: 99, y: 343, w: 139 };
  const birdW = air.w * k;
  const birdH = (birdW * 230) / 220;
  const nestScale = nest.w / air.w;
  const nestDx = (nest.x - air.x) * k - (birdW * (1 - nestScale)) / 2;
  const nestDy = (nest.y - air.y) * k - (birdH * (1 - nestScale)) / 2;
  // Between perch and sky Leyleko swoops up a little, so the move reads as a glide, not a slide.
  const glideY = Animated.add(
    takeoff.interpolate({ inputRange: [0, 1], outputRange: [nestDy, 0] }),
    takeoff.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -30 * k, 0] }),
  );
  const birdTransform = [
    { translateX: takeoff.interpolate({ inputRange: [0, 1], outputRange: [nestDx, 0] }) },
    { translateY: lake ? Animated.add(glideY, Animated.multiply(bobY, nestOpacity)) : glideY },
    { scale: takeoff.interpolate({ inputRange: [0, 1], outputRange: [nestScale, 1] }) },
  ];

  const boatStyle = [StyleSheet.absoluteFill, { opacity: nestOpacity, transform: [{ translateY: bobY }] }];
  const armRotate = arm.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

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
          {lake ? (
            <LakeShore p={p} />
          ) : (
            <G>
              <Path d={SKYLINE} fill={p.skyline} transform="translate(0 430)" />
              <Rect x={-SW} y={540} width={SW * 3} height={110} fill={p.water} />
              <Path d="M0 556 H300 M30 576 H140 M170 596 H280" stroke={p.waterLine} strokeWidth={2} />
              <Path d="M-20 650 L-20 560 L120 500 L260 560 L260 650 Z" fill={p.roof} />
              <Path d="M-20 560 L120 500 L260 560" fill="none" stroke={p.roofEdge} strokeWidth={6} />
              <Path d="M10 580 L120 532 L230 580 M-10 610 L120 554 L250 610" fill="none" stroke={p.roofEdge} strokeWidth={2} opacity={0.6} />
              <Rect x={150} y={440} width={44} height={90} fill={p.chimney} />
              <Rect x={144} y={432} width={56} height={14} rx={3} fill={p.chimneyTop} />
            </G>
          )}
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

      {lake && (
        <Animated.View style={boatStyle}>
          <Svg {...svgProps} style={StyleSheet.absoluteFill}>
            <Fisherman p={p} />
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: around(SHOULDER.x, SHOULDER.y, armRotate) }]}>
            <Svg {...svgProps} style={StyleSheet.absoluteFill}>
              <Arm />
            </Svg>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: fish.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                  transform: [
                    { translateX: fish.interpolate({ inputRange: [0, 1], outputRange: [0, -8 * k] }) },
                    { translateY: fish.interpolate({ inputRange: [0, 1], outputRange: [0, -5 * k] }) },
                  ],
                },
              ]}
            >
              <Svg {...svgProps}>
                <Fish />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}

      <Animated.View style={{ position: 'absolute', left: ox + air.x * k, top: oy + air.y * k, transform: birdTransform }}>
        <StorkView mode={birdMode} pulseKey={pulseKey} size={birdW} />
      </Animated.View>

      {lake ? (
        <Animated.View style={boatStyle}>
          <Svg {...svgProps}>
            <Hull p={p} />
          </Svg>
        </Animated.View>
      ) : (
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
      )}

      {lake && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: hearts.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: hearts.interpolate({ inputRange: [0, 1], outputRange: [0, -40 * k] }) }],
            },
          ]}
        >
          <Svg {...svgProps}>
            <Path d={HEART} fill="#e8505b" transform="translate(184 452) scale(0.9)" />
            <Path d={HEART} fill="#e8505b" opacity={0.85} transform="translate(198 440) scale(0.65)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const INK = '#1d2830';
const JACKET = '#2f4a6b';
const SKIN = '#e8b48a';

// Lake Uluabat: far hills with the stork village, the water and reeds. Drawn behind the boat.
function LakeShore({ p }: { p: ScenePalette }) {
  return (
    <G>
      <Path d="M-20 506 L-20 482 Q40 440 100 470 Q160 432 230 464 Q280 444 320 474 L320 506 Z" fill={p.skyline} />
      <G fill={p.roof}>
        <Rect x={8} y={462} width={16} height={12} />
        <Path d="M5 463 L16 454 L27 463 Z" />
        <Rect x={32} y={458} width={14} height={10} />
        <Path d="M29 459 L39 451 L49 459 Z" />
        <Rect x={19} y={448} width={3} height={8} />
      </G>
      <Ellipse cx={20.5} cy={448} rx={5} ry={1.8} fill={p.nest} />
      <Rect x={-SW} y={500} width={SW * 3} height={150} fill={p.water} />
      <Path d="M10 512 H90 M150 508 H280 M30 576 H140 M190 588 H290" stroke={p.waterLine} strokeWidth={2} />
      <Path
        d="M276 600 Q274 566 282 540 M284 602 Q288 570 294 552 M268 604 Q262 580 264 560"
        stroke="#6b7a45"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={282} cy={544} rx={2.5} ry={7} fill={p.twigs} />
      <Ellipse cx={294} cy={556} rx={2.5} ry={6} fill={p.twigs} />
    </G>
  );
}

// The fisherman at the bow with his rod; his arm is a separate layer so it can wave.
function Fisherman({ p }: { p: ScenePalette }) {
  return (
    <G transform={BOAT}>
      <Path d="M228 538 L262 470" stroke={p.twigs} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M262 470 Q270 510 266 560" stroke="#fff" strokeOpacity={0.6} strokeWidth={1} fill="none" />
      <Path d="M194 556 L198 522 Q212 512 226 522 L230 556 Z" fill={JACKET} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={212} cy={507} r={11} fill={SKIN} stroke={INK} strokeWidth={2} />
      <Path d="M200 503 Q201 492 213 492 Q224 492 224 503 Z" fill="#4a4038" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M193 503 H212" stroke="#4a4038" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={206} cy={507} r={1.5} fill={INK} />
      <Path d="M203 513 Q206 516 210 513" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Arm() {
  return (
    <G transform={BOAT}>
      <Path d="M202 530 Q192 522 186 514" stroke={JACKET} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={185} cy={512} r={3.5} fill={SKIN} stroke={INK} strokeWidth={1.2} />
    </G>
  );
}

function Fish() {
  return (
    <G transform={BOAT}>
      <Path
        d="M182 508 Q174 502 164 508 Q174 514 182 508 Z M164 508 L158 503 L158 513 Z"
        fill="#9fb7c4"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </G>
  );
}

// The boat's hull, drawn in front of Leyleko and the fisherman so they sit inside it.
function Hull({ p }: { p: ScenePalette }) {
  return (
    <G transform={BOAT}>
      <Path d="M24 548 L276 548 Q268 586 236 592 L64 592 Q32 586 24 548 Z" fill={p.nest} />
      <Path d="M22 548 H278" stroke={p.twigs} strokeWidth={5} strokeLinecap="round" />
      <Path d="M36 566 H264" stroke="#2f8f83" strokeWidth={4} />
    </G>
  );
}
