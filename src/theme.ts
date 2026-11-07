export const colors = {
  ink: '#1d2830',
  cloud: '#f7fbfd',
  teal: '#2f8f83',
  beak: '#ee7a2a',
  leg: '#d9412f',
};

export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Figtree_500Medium',
  bodyBold: 'Figtree_700Bold',
};

export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

export function timeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'noon';
  if (h >= 16 && h < 20) return 'evening';
  return 'night';
}

export type ScenePalette = {
  sky: [string, string, string];
  sun: string;
  sunAt: [number, number, number]; // cx, cy, r in scene units
  skyline: string;
  water: string;
  waterLine: string;
  roof: string;
  roofEdge: string;
  chimney: string;
  chimneyTop: string;
  nest: string;
  twigs: string;
  stars: boolean;
  text: string;
};

const roof = { roof: '#c4553f', roofEdge: '#9e3f2e', chimney: '#b85a3e', chimneyTop: '#8f4330', nest: '#8a6440', twigs: '#5e4329' };

export const scenes: Record<TimeOfDay, ScenePalette> = {
  morning: {
    sky: ['#7fb8e0', '#cfe3ef', '#f7d6c2'],
    sun: '#ffe9c9',
    sunAt: [232, 300, 34],
    skyline: '#9db4c6',
    water: '#7fa6bf',
    waterLine: '#a9c6d8',
    ...roof,
    stars: false,
    text: colors.ink,
  },
  noon: {
    sky: ['#3f96d4', '#9fd0ee', '#d9eef8'],
    sun: '#fff6d8',
    sunAt: [60, 150, 30],
    skyline: '#8fa9bd',
    water: '#5d8bab',
    waterLine: '#86aac2',
    ...roof,
    stars: false,
    text: colors.ink,
  },
  evening: {
    sky: ['#3b5a8c', '#e58a6a', '#f8c98a'],
    sun: '#ffd79a',
    sunAt: [80, 420, 40],
    skyline: '#6d5368',
    water: '#5a4c66',
    waterLine: '#f0a777',
    roof: '#a1473a',
    roofEdge: '#7d3529',
    chimney: '#9a4a35',
    chimneyTop: '#753627',
    nest: '#77563a',
    twigs: '#4f3823',
    stars: false,
    text: '#ffffff',
  },
  night: {
    sky: ['#0d1630', '#1f2d55', '#3d4675'],
    sun: '#f1ecd2',
    sunAt: [220, 170, 22],
    skyline: '#232b48',
    water: '#1a2140',
    waterLine: '#3a4778',
    roof: '#5a2e33',
    roofEdge: '#40202a',
    chimney: '#5b3236',
    chimneyTop: '#3f2226',
    nest: '#4d3a2c',
    twigs: '#2e2219',
    stars: true,
    text: '#ffffff',
  },
};
