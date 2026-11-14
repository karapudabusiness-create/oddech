import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { CalendarDays, ChartLine, ListChecks, Settings, Wind } from 'lucide-react-native';

import { useSettings } from '@/features/settings/useSettings';
import { strings } from '@/i18n';
import { fontFamilies, useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const settings = useSettings();
  if (settings && !settings.onboardingDone) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fontFamilies.semibold, fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.today,
          tabBarIcon: ({ color, size }) => <Wind color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: strings.tabs.calendar,
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: strings.tabs.progress,
          tabBarIcon: ({ color, size }) => <ChartLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: strings.tabs.exercises,
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: strings.tabs.settings,
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
