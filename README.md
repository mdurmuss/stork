# Stork

A Pomodoro app where breaks have a job: walk. Focus for 25 minutes, then walk during the 5-minute break. Every step flies your stork further along its migration from Istanbul to Cape Town.

## Run

```bash
npm install
npx expo start
```

- **iOS:** step counting works in Expo Go.
- **Android:** Expo Go lacks the activity-recognition permission, so use a development build: `npx expo run:android`.

In development builds a "Skip (dev)" link fast-forwards the timer.

## How it works

- `App.tsx` handles the focus, break, and result phases. The timer counts down to a fixed end timestamp, so it stays correct after backgrounding.
- `src/route.ts` lists the migration stops and their distances.
- `src/storage.ts` saves progress locally with AsyncStorage.
- A break counts if you take at least 50 steps. Each step is 1 km of flight.
