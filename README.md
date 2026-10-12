# jibi

Personal finance tracker. One TypeScript codebase for **web, iOS and Android**.

| Layer | Choice |
| --- | --- |
| App | [Expo](https://expo.dev) (React Native + Expo Router), TypeScript |
| Backend | [Supabase](https://supabase.com): Postgres, Auth, row-level security |
| Web hosting | [Render](https://render.com) static site (`render.yaml`) |
| Mobile builds | EAS Build / Submit (`eas.json`) |

All data lives in Supabase Postgres, so it's the same on every device. The app only keeps the login session locally.

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
src/lib/supabase.ts      Supabase client
src/lib/database.types.ts DB types (regenerate: npx supabase gen types typescript --project-id <ref>)
src/lib/money.ts         amounts are integer cents everywhere
supabase/migrations/     schema + RLS + new-user seed trigger
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
