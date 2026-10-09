import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/controls';
import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Radius } from '@/constants/theme';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

const STATUS_LABEL = { pending: 'In review', approved: 'Approved', declined: 'Declined' } as const;

export default function AccountScreen() {
  const theme = useTheme();
  const { role, displayName, email, signOut, mySubmissions } = useStore();

  if (role === 'guest') {
    return (
      <Screen>
        <View style={styles.hero}>
          <AppText type="script" style={{ fontSize: 26 }}>this weekend in</AppText>
          <AppText type="title" style={{ fontSize: 34, lineHeight: 36, textAlign: 'center' }}>Cheatham County</AppText>
          <AppText type="small" style={{ textAlign: 'center' }}>
            Sign in to save events across devices and submit your own.
          </AppText>
        </View>
        <SignIn />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText type="title">{displayName}</AppText>
      <AppText type="small">
        {role === 'owner' ? 'Owner · can approve events' : 'Resident'}
        {email ? ` · ${email}` : ''}
      </AppText>
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

/** Email sign-in with a one-time code; no passwords to remember. */
function SignIn() {
  const { backend, demoSignIn, sendCode, verifyCode } = useStore();
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (backend === 'demo') {
    return (
      <>
        <Button title="Continue as a resident" onPress={() => demoSignIn('resident')} />
        <Button title="Sign in as the BTV owner" variant="accent" onPress={() => demoSignIn('owner')} />
        <AppText type="small" style={{ textAlign: 'center' }}>
          Demo sign-in. Email sign-in turns on once the app is connected to its database.
        </AppText>
      </>
    );
  }

  const run = async (action: () => Promise<string | null>, onSuccess?: () => void) => {
    setBusy(true);
    setError('');
    const failure = await action();
    setBusy(false);
    if (failure) setError(failure);
    else onSuccess?.();
  };

  const send = () => {
    if (!/^\S+@\S+\.\S+$/.test(address.trim())) return setError('Enter your email address.');
    run(() => sendCode(address), () => setCodeSent(true));
  };

  if (!codeSent) {
    return (
      <>
        <Field
          label="Email"
          value={address}
          onChangeText={setAddress}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={send}
        />
        {!!error && <AppText themeColor="danger">{error}</AppText>}
        <Button title={busy ? 'Sending…' : 'Email me a sign-in code'} disabled={busy} onPress={send} />
      </>
    );
  }

  const verify = () => {
    if (!/^\d{6,10}$/.test(code.trim())) return setError('Enter the code from the email.');
    run(() => verifyCode(address, code));
  };

  return (
    <>
      <AppText>We sent a code to {address.trim()}.</AppText>
      <Field
        label="Code"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={verify}
      />
      {!!error && <AppText themeColor="danger">{error}</AppText>}
      <Button title={busy ? 'Checking…' : 'Sign in'} disabled={busy} onPress={verify} />
      <Button
        title="Use a different email"
        variant="secondary"
        onPress={() => {
          setCodeSent(false);
          setCode('');
          setError('');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  panel: { padding: 14, gap: 10, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
