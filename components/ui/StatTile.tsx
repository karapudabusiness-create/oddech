import { Card } from './Card';
import { Text } from './Text';
import { useTheme } from '@/theme';

/** Kafelek statystyki: duża liczba + opis. */
export function StatTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  const { spacing } = useTheme();
  return (
    <Card
      style={{ flexBasis: '47%', flexGrow: 1, gap: spacing.xs }}
      accessible
      accessibilityLabel={`${label}: ${value}${suffix ? ` ${suffix}` : ''}`}
    >
      <Text variant="stat" color="primaryText">
        {value}
        {suffix ? (
          <Text variant="subheading" color="textMuted">
            {' '}
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </Card>
  );
}
