import { Plus, Undo2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Card, IconButton, Text } from '@/components/ui';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export function CatchCounter({
  count,
  goal,
  onAdd,
  onUndo,
}: {
  count: number;
  goal: number;
  onAdd: () => void;
  onUndo: () => void;
}) {
  const { colors, spacing, radii } = useTheme();
  const scale = useSharedValue(1);
  const bump = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const reached = goal > 0 && count >= goal;

  const add = () => {
    scale.set(withSequence(withTiming(1.12, { duration: 90 }), withTiming(1, { duration: 160 })));
    onAdd();
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="subheading">{strings.today.catches.title}</Text>
        <IconButton
          accessibilityLabel={strings.today.catches.undo}
          onPress={onUndo}
          disabled={count === 0}
        >
          <Undo2 color={colors.textMuted} size={20} />
        </IconButton>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Pressable
          onPress={add}
          accessibilityRole="button"
          accessibilityLabel={strings.today.catches.add}
          accessibilityValue={{ text: strings.today.catches.goal(count, goal) }}
          style={({ pressed }) => ({
            width: 88,
            height: 88,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Plus color={colors.onPrimary} size={26} strokeWidth={3} />
            <Text variant="heading" style={{ color: colors.onPrimary }}>
              1
            </Text>
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Animated.View style={bump}>
            <Text variant="stat" accessibilityElementsHidden importantForAccessibility="no">
              {count}
            </Text>
          </Animated.View>
          <Text color={reached ? 'secondaryText' : 'textMuted'} variant="caption">
            {reached ? strings.today.catches.goalReached : strings.today.catches.goal(count, goal)}
          </Text>
        </View>
      </View>
      <Text variant="caption" color="textMuted">
        {strings.today.catches.hint}
      </Text>
    </Card>
  );
}
