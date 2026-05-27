import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

function NavigationGuard() {
  const { appUser, loading, isFirstLogin } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!appUser) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (isFirstLogin && appUser.role !== 'patient' && appUser.role !== 'superadmin') {
      router.replace('/(auth)/change-password');
      return;
    }

    if (inAuth || segments[0] === undefined) {
      switch (appUser.role) {
        case 'superadmin':    router.replace('/(admin)/dashboard'); break;
        case 'hospital_admin': router.replace('/(staff)/dashboard'); break;
        case 'staff':         router.replace('/(staff)/queue'); break;
        case 'patient':       router.replace('/(patient)/(tabs)/home'); break;
        default:              router.replace('/(auth)/login');
      }
    }
  }, [appUser, loading, isFirstLogin]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
