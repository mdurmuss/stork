// The stork's autumn migration along the eastern flyway.
// `km` is the approximate distance from Istanbul at which each stop is reached.
export type Stop = {
  name: string;
  km: number;
};

// Development builds shrink the route to a tenth so a few breaks reach new stops.
const DEV_SCALE = __DEV__ ? 0.1 : 1;

export const ROUTE: Stop[] = [
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
].map((s) => ({ ...s, km: Math.round(s.km * DEV_SCALE) }));

export const ROUTE_KM = ROUTE[ROUTE.length - 1].km;

export function currentStop(km: number): Stop {
  return [...ROUTE].reverse().find((s) => km >= s.km) ?? ROUTE[0];
}

export function nextStop(km: number): Stop | undefined {
  return ROUTE.find((s) => s.km > km);
}
