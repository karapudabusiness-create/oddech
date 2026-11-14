import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, ToastHost } from '@/components/ui';
import { db, prepareDb } from '@/db/client';
import { seedIfNeeded } from '@/db/seed';
import { useDbMigrations } from '@/db/useDbMigrations';
import { useSettings } from '@/features/settings/useSettings';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

function ThemedApp({ children }: { children: ReactNode }) {
  const settings = useSettings();
  return <ThemeProvider mode={settings?.theme ?? 'system'}>{children}</ThemeProvider>;
}

function Navigation() {
  const { colors, scheme } = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primaryText,
          headerTitleStyle: { fontFamily: 'NunitoSans_700Bold', color: colors.text },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="day/[date]"
          options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="pacer/[exerciseId]"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<unknown>(null);
  useEffect(() => {
    prepareDb()
      .then(() => setDbReady(true))
      .catch(setDbError);
  }, []);
  if (dbError) return <Failure error={dbError} />;
  if (!dbReady) return null;
  return <App />;
}

function Failure({ error }: { error: unknown }) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider mode="system">
        <ErrorState error={error} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function App() {
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });
  const migration = useDbMigrations();
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<unknown>(null);

  useEffect(() => {
    if (!migration.success) return;
    seedIfNeeded(db)
      .then(() => setSeeded(true))
      .catch(setSeedError);
  }, [migration.success]);

  const ready = (fontsLoaded || !!fontError) && seeded;
  const failed = migration.error ?? seedError;

  useEffect(() => {
    if (ready || failed) void SplashScreen.hideAsync();
  }, [ready, failed]);

  if (failed) return <Failure error={failed} />;
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemedApp>
          <Navigation />
        </ThemedApp>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
