# jibi

Personal finance tracker. One TypeScript codebase for **web, iOS and Android**.

| Layer | Choice |
| --- | --- |
| App | [Expo](https://expo.dev) (React Native + Expo Router), TypeScript |
| Data | On-device SQLite ([expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)), one database per person |
| Legacy cloud | [Supabase](https://supabase.com): only used once per device to import existing data |
| Web hosting | [Render](https://render.com) static site (`render.yaml`) |
| Mobile builds | EAS Build / Submit (`eas.json`) |

All data lives on the device in SQLite (`jibi-<username>.db`; on web it runs as WebAssembly in the browser).
Nothing syncs between devices. The first time someone signs in on a device with their existing password, the app
checks it against the old Supabase project and copies their data over once; after that it works offline.
People who never had a cloud account just create a local password.

On web, SQLite needs a cross-origin-isolated page: `metro.config.js` (dev) and `render.yaml` (production) send
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Browser data can be
cleared by the user or by Safari for sites not added to the Home Screen, so install the web app to the Home Screen.

## Setup

1. Create a Supabase project. In **SQL Editor**, run `supabase/migrations/20261012000000_init.sql`
   (or, with the Supabase CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`).
2. Copy `.env.example` to `.env` and fill in the URL and the **publishable** key (Project Settings > API).
3. `npm install`, then:
   - `npm run web`: browser
   - `npm start`: scan the QR code with Expo Go (iOS/Android)

Before you commit, run `npm run typecheck`.

## Project layout

```
src/app/                 routes (Expo Router)
  _layout.tsx            auth gate: (app) when signed in, sign-in otherwise
  sign-in.tsx
  (app)/index.tsx        monthly overview
  (app)/transactions.tsx add / list / delete
src/lib/db/              on-device SQLite: schema + history triggers, Supabase-shaped query API, cloud import
src/lib/supabase.ts      legacy cloud client (one-time import only)
src/lib/database.types.ts row types shared by the app
src/lib/money.ts         amounts are integer minor units everywhere
supabase/migrations/     legacy cloud schema (source of the one-time import)
```

## Deploy web to Render

1. Push to GitHub. In Render: **New > Blueprint**, then pick the repo.
2. When prompted, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase, go to **Authentication > URL Configuration** and set the Site URL to your Render URL so confirmation emails link back correctly.

## Mobile release (later)

```
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios
```
Before the first store build, set `ios.bundleIdentifier` and `android.package` in `app.json`.
