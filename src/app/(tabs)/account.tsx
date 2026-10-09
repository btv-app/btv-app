import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/controls';
import { Screen } from '@/components/screen';
import { Radius } from '@/constants/theme';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

const STATUS_LABEL = { pending: 'In review', approved: 'Approved', declined: 'Declined' } as const;

export default function AccountScreen() {
  const theme = useTheme();
  const { role, displayName, signIn, signOut, mySubmissions } = useStore();

  if (role === 'guest') {
    return (
      <Screen>
        <View style={styles.hero}>
          <AppText type="script" style={{ fontSize: 26 }}>this weekend in</AppText>
          <AppText type="title" style={{ fontSize: 34, lineHeight: 36, textAlign: 'center' }}>Cheatham County</AppText>
          <AppText type="small" style={{ textAlign: 'center' }}>
            Sign in to save events across devices, get reminders and submit your own.
          </AppText>
        </View>
        {/* Placeholder sign-in until Supabase Auth (Apple, Google, email) is connected. */}
        <Button title="Continue as a resident" onPress={() => signIn('resident')} />
        <Button title="Sign in as the BTV owner" variant="accent" onPress={() => signIn('owner')} />
        <AppText type="small" style={{ textAlign: 'center' }}>
          Demo sign-in. Apple, Google and email sign-in arrive with the backend.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText type="title">{displayName}</AppText>
      <AppText type="small">{role === 'owner' ? 'Owner · can approve events' : 'Resident'}</AppText>
      <AppText type="script">my submissions</AppText>
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {mySubmissions.length ? (
          mySubmissions.map((e) => (
            <View key={e.id} style={styles.row}>
              <AppText style={{ flex: 1 }} numberOfLines={1}>{e.title}</AppText>
              <AppText type="label">{STATUS_LABEL[e.status]}</AppText>
            </View>
          ))
        ) : (
          <AppText type="small">Nothing submitted yet.</AppText>
        )}
      </View>
      <Button title="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  panel: { padding: 14, gap: 10, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
