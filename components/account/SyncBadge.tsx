import { Cloud, CloudOff, CloudUpload, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { strings } from '@/i18n';
import { useAccount, type SyncState } from '@/stores/account';
import { useTheme } from '@/theme';

export function useSyncLabel(): { state: SyncState; label: string } {
  const sync = useAccount((s) => s.sync);
  return { state: sync, label: strings.account.state[sync] };
}

/** Ikona i opis stanu synchronizacji (kolor + ikona + tekst – nie sam kolor). */
export function SyncBadge({ compact }: { compact?: boolean }) {
  const { colors, spacing } = useTheme();
  const { state, label } = useSyncLabel();
  const color =
    state === 'error'
      ? colors.dangerText
      : state === 'idle'
        ? colors.secondaryText
        : colors.textMuted;
  const Icon =
    state === 'syncing'
      ? RefreshCw
      : state === 'offline'
        ? CloudOff
        : state === 'error'
          ? TriangleAlert
          : state === 'pending'
            ? CloudUpload
            : Cloud;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${strings.account.syncTitle}: ${label}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
    >
      <Icon color={color} size={compact ? 18 : 16} />
      {compact ? null : (
        <Text variant="caption" style={{ color }}>
          {label}
        </Text>
      )}
    </View>
  );
}
