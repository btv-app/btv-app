import { Linking } from 'react-native';

/** Where residents send event changes and advertising questions. */
export const BTV_EMAIL = 'betweenthevilles@gmail.com';

/** Opens the person's mail app with a message to BTV started. */
export function emailBtv(subject: string) {
  Linking.openURL(`mailto:${BTV_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});
}
