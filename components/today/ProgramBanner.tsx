import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, Leaf } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { ProgramPhase } from '@/features/program/plan';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export function ProgramBanner({
  phase,
  onApplyWeek,
}: {
  phase: ProgramPhase;
  /** Przekazane tylko, gdy są zalecane zmiany do zastosowania. */
  onApplyWeek?: () => void;
}) {
  const { colors, radii, spacing, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const fg = scheme === 'dark' ? colors.text : '#FFFFFF';

  let title: string;
  let tips: readonly string[] = [];
  if (phase.kind === 'week') {
    const week = strings.program.weeks[phase.week - 1]!;
    title = strings.program.weekBanner(phase.week, week.goal);
    tips = week.tips;
  } else if (phase.kind === 'maintenance') {
    title = strings.program.maintenanceTitle;
  } else {
    title = strings.program.notStarted(phase.daysUntilStart);
  }

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm }}
    >
      <Pressable
        onPress={tips.length ? toggle : undefined}
        accessibilityRole={tips.length ? 'button' : 'text'}
        accessibilityState={tips.length ? { expanded: open } : undefined}
        accessibilityHint={
          tips.length ? (open ? strings.program.hideTips : strings.program.showTips) : undefined
        }
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Leaf color={fg} size={20} />
        </View>
        <Text variant="subheading" style={{ color: fg, flex: 1 }}>
          {title}
        </Text>
        {tips.length ? (
          open ? (
            <ChevronUp color={fg} size={20} />
          ) : (
            <ChevronDown color={fg} size={20} />
          )
        ) : null}
      </Pressable>

      {phase.kind === 'maintenance' ? (
        <Text style={{ color: fg, opacity: 0.95 }}>{strings.program.maintenanceBody}</Text>
      ) : null}

      {open ? (
        <View style={{ gap: spacing.xs, paddingLeft: spacing.xs }}>
          {tips.map((tip) => (
            <Text key={tip} style={{ color: fg }}>
              • {tip}
            </Text>
          ))}
          {onApplyWeek ? (
            <Button
              label={strings.program.applyWeek}
              size="sm"
              variant="soft"
              onPress={onApplyWeek}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
        </View>
      ) : null}
    </LinearGradient>
  );
}
