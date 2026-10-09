# Between the Villes

The mobile app for Between the Villes, local events in Cheatham County, TN. Built with Expo (React Native), so one codebase runs on iPhone, Android and the web.

## What's here

- **Events** in three views: list (grouped "today", "this weekend", "next week"), map, and month calendar.
- **Search and filters**: search by name or venue; filter by when (today, this weekend, next 7 days, or a picked date), category, town, and free events. Quick chips cover Today, This weekend, Live music, Free, Support a cause and Community resources.
- **Event pages** with save, plus calendar, directions and share buttons (those three are not wired up yet).
- **Saved** events, kept on the device for now.
- **Submit an event** (including whether it's free): residents' events go to a review queue; the owner's publish right away.
- **Owner review**: approve or decline submissions. The tab only appears for the owner.
- **Ad slots**: a sponsored card every third event in the list, and a banner on event pages.

Events, saved events, submissions and sign-in (a one-time code by email) live in Supabase. The connection settings are in `.env`; while the key there is empty, the app runs on sample events with a demo sign-in. The database, with row-level security so only the owner can approve, is in `supabase/schema.sql`, and `supabase/SETUP.md` walks through setting it up.

## Brand

Colors come from BTV's social graphics: slate `#517C9F`, royal `#003087`, navy `#011C53`, sky `#9FC4F0`, ice `#BDDEFF`. Headlines use Bodoni Moda; everything else uses Montserrat. Tokens live in `src/constants/theme.ts`.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `w` for the web version. The map only renders on iPhone and Android.

## Next steps

1. Add Apple and Google sign-in alongside the email code.
2. Wire up add-to-calendar, directions and share.
3. Push reminders for saved events and approval notices.
4. Google AdMob (needs a development build, not Expo Go).
5. App Store and Google Play builds with EAS.
