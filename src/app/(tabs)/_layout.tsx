import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Fonts } from '@/constants/theme';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabLayout() {
  const theme = useTheme();
  const { role, pending } = useStore();

  return (
    <Tabs
      screenOptions={{
        header: () => <BrandHeader />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: Fonts.bodySemiBold, fontSize: 11 },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Events', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: icon('heart-outline') }} />
      <Tabs.Screen name="submit" options={{ title: 'Submit', tabBarIcon: icon('add-circle-outline') }} />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: icon('checkmark-done-outline'),
          tabBarBadge: pending.length || undefined,
          tabBarBadgeStyle: { backgroundColor: theme.accent, color: theme.background },
          // Only the owner sees the review queue.
          href: role === 'owner' ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: role === 'guest' ? 'Sign in' : 'Account', tabBarIcon: icon('person-outline') }}
      />
    </Tabs>
  );
}
