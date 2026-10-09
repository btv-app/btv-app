import { AppText } from '@/components/app-text';
import { EventCard } from '@/components/event-card';
import { Screen } from '@/components/screen';
import { useStore } from '@/data/store';

export default function SavedScreen() {
  const { approved, savedIds, role } = useStore();
  const saved = approved.filter((e) => savedIds.has(e.id));

  return (
    <Screen>
      <AppText type="title">Going</AppText>
      <AppText type="small">
        {role === 'guest'
          ? 'Saved on this phone. Sign in to keep them on every device and get reminders.'
          : "We'll remind you the day before each one."}
      </AppText>
      {saved.length ? (
        saved.map((e) => <EventCard key={e.id} event={e} />)
      ) : (
        <AppText style={{ marginTop: 24, textAlign: 'center' }}>
          No saved events yet. Tap the heart on any event to keep it here.
        </AppText>
      )}
    </Screen>
  );
}
