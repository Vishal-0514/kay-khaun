import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { restoreSession } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../lib/theme';
import { ToastHost } from '../components/Toast';
import { listenForReminders } from '../lib/reminders';
import { useLang } from '../lib/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = useAuthStore((s) => s.ready);
  const lang = useLang((s) => s.lang);
  const langReady = useLang((s) => s.ready);

  useEffect(() => {
    useLang.getState().load();
    restoreSession();
    // Tapping a meal reminder opens the app on the right screen.
    return listenForReminders((url) => router.push(url));
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready && langReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready, langReady]);

  if (!fontsLoaded || !ready || !langReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* Page transitions: screens slide in from the right; sheets like the kitchen rise from
          the bottom; welcome and the main tabs cross-fade. */}
      {/* key: switching language rebuilds every screen in the new language. */}
      <Stack key={lang} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'slide_from_right', animationDuration: 320 }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="taste" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="kitchen" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="cook/[id]" options={{ animation: 'fade_from_bottom' }} />
      </Stack>
      <ToastHost />
    </SafeAreaProvider>
  );
}
