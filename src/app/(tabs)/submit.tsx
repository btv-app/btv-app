import { router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/controls';
import { EventForm } from '@/components/event-form';
import { Screen } from '@/components/screen';
import { useStore } from '@/data/store';

export default function SubmitScreen() {
  const { role } = useStore();
  const [sent, setSent] = useState(false);
  const isOwner = role === 'owner';

  if (role === 'guest') {
    return (
      <Screen>
        <AppText type="title">Share a local event</AppText>
        <AppText>Sign in so we can let you know when it&apos;s approved.</AppText>
        <Button title="Sign in to submit" onPress={() => router.push('/account')} />
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen>
        <AppText type="title">{isOwner ? 'Event published' : "Thanks! It's in the queue"}</AppText>
        <AppText>
          {isOwner
            ? "It's live in the list, map and calendar now."
            : 'The BTV team reviews every submission. You can check its status under Account.'}
        </AppText>
        <Button title="Add another" variant="secondary" onPress={() => setSent(false)} />
      </Screen>
    );
  }

  return <EventForm onSaved={() => setSent(true)} />;
}
