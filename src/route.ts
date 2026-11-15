// The stork's yearly round trip along the eastern flyway: south to Cape Town in autumn,
// then back north in spring to the fisherman's boat on Lake Uluabat.
// `km` is the approximate distance flown when each stop is reached.
export type Stop = {
  name: string;
  km: number;
};

// Development builds shrink the route to a tenth so a few breaks reach new stops.
const DEV_SCALE = __DEV__ ? 0.1 : 1;

const scale = (stops: Stop[]) => stops.map((s) => ({ ...s, km: Math.round(s.km * DEV_SCALE) }));

export const AUTUMN: Stop[] = scale([
  { name: 'Istanbul · Bosphorus', km: 0 },
  { name: 'Konya · Anatolian plateau', km: 550 },
  { name: 'Belen Pass · Hatay', km: 1100 },
  { name: 'Hula Valley', km: 1450 },
  { name: 'Sinai', km: 1750 },
  { name: 'Nile Delta', km: 2000 },
  { name: 'Khartoum', km: 3600 },
  { name: 'Lake Victoria', km: 5400 },
  { name: 'Victoria Falls', km: 7500 },
  { name: 'Cape Town', km: 10000 },
]);

export const SPRING: Stop[] = scale([
  { name: 'Cape Town', km: 10000 },
  { name: 'Victoria Falls', km: 12500 },
  { name: 'Lake Victoria', km: 14600 },
  { name: 'Khartoum', km: 16400 },
  { name: 'Nile Delta', km: 18000 },
  { name: 'Hula Valley', km: 18250 },
  { name: 'Belen Pass · Hatay', km: 18600 },
  { name: 'Konya · Anatolian plateau', km: 19150 },
  { name: 'Lake Uluabat · Home', km: 19700 },
]);

export const ROUTE: Stop[] = [...AUTUMN, ...SPRING.slice(1)];

export const ROUTE_KM = ROUTE[ROUTE.length - 1].km;
export const HOME = ROUTE[ROUTE.length - 1];

// The leg Leyleko is on: autumn until Cape Town is reached, then spring.
export function legOf(km: number): Stop[] {
  return km < SPRING[0].km ? AUTUMN : SPRING;
}

export function currentStop(km: number): Stop {
  return [...ROUTE].reverse().find((s) => km >= s.km) ?? ROUTE[0];
}

export function nextStop(km: number): Stop | undefined {
  return ROUTE.find((s) => s.km > km);
}
