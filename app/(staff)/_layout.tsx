import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function StaffLayout() {
  const { role } = useAuth();
  const isAdmin = role === 'hospital_admin';

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
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎟️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="beds"
        options={{
          title: 'Beds',
          tabBarIcon: ({ focused }) => <TabIcon icon="🛏️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="prescription"
        options={{
          title: 'Prescription',
          tabBarIcon: ({ focused }) => <TabIcon icon="💊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
