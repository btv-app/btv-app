import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Coords = { latitude: number; longitude: number };

/** A small map with one pin the person can drag to the right spot. */
export function PinMap({ coordinate, onChange, title }: { coordinate: Coords; onChange: (coords: Coords) => void; title: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.frame, { borderColor: theme.border }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...coordinate, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
        <Marker
          coordinate={coordinate}
          title={title}
          draggable
          pinColor={theme.primary}
          onDragEnd={(e) => onChange(e.nativeEvent.coordinate)}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 220, borderRadius: Radius.large, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
