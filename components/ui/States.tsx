import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingState({ label = strings.common.loading }: { label?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xxl,
      }}
    >
      <ActivityIndicator color={colors.primary} />
      <Text color="textMuted">{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.lg,
      }}
    >
      {icon}
      <Text variant="subheading" align="center">
        {title}
      </Text>
      {body ? (
        <Text color="textMuted" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="soft" onPress={onAction} />
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { spacing } = useTheme();
  if (__DEV__ && error) console.warn(error, (error as { cause?: unknown }).cause);
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xxl,
      }}
    >
      <Text variant="heading" align="center">
        {strings.common.errorTitle}
      </Text>
      <Text color="textMuted" align="center">
        {strings.common.errorBody}
      </Text>
      {onRetry ? <Button label={strings.common.retry} variant="soft" onPress={onRetry} /> : null}
    </View>
  );
}
