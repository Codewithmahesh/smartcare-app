import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../../constants/theme';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function PatientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} /> }} />
      <Tabs.Screen name="my-tokens" options={{ title: 'My Tokens', tabBarIcon: ({ focused }) => <TabIcon icon="🎟️" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tabs>
  );
}
