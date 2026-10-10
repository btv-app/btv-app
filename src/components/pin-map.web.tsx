import { AppText } from '@/components/app-text';

type Coords = { latitude: number; longitude: number };

/** react-native-maps has no web support, so the web build only describes where the pin goes. */
export function PinMap(_: { coordinate: Coords; onChange: (coords: Coords) => void; title: string }) {
  return <AppText type="small">The map pin shows on iPhone and Android.</AppText>;
}
