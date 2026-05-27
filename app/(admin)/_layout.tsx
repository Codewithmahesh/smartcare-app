import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Text } from 'react-native';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cities"
        options={{
          title: 'Cities',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏙️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="hospitals"
        options={{
          title: 'Hospitals',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="waitlist"
        options={{
          title: 'Waitlist',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
