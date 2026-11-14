import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

/** Karta wykresu: tytuł, podtytuł z kluczową liczbą, legenda, wykres i widok tabeli (dostępność). */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  tableHeader,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  table: { label: string; value: string }[];
  tableHeader?: [string, string];
  empty?: string;
  children: ReactNode;
}) {
  const { spacing, colors } = useTheme();
  const [showTable, setShowTable] = useState(false);
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text variant="subheading" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!empty ? (
          <Pressable
            onPress={() => setShowTable((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showTable }}
            hitSlop={10}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <Text
              variant="caption"
              color="primaryText"
              style={{ fontFamily: 'NunitoSans_700Bold' }}
            >
              {showTable ? strings.progress.showChart : strings.progress.showTable}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {legend}
      {empty ? (
        <View style={{ paddingVertical: spacing.xxl }}>
          <Text color="textMuted" align="center">
            {empty}
          </Text>
        </View>
      ) : showTable ? (
        <View>
          {tableHeader ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingBottom: spacing.xs,
              }}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <Text variant="label" color="textMuted">
                {tableHeader[0]}
              </Text>
              <Text variant="label" color="textMuted">
                {tableHeader[1]}
              </Text>
            </View>
          ) : null}
          {table.map((r, i) => (
            <View
              key={r.label}
              accessible
              accessibilityLabel={`${r.label}: ${tableHeader ? `${tableHeader[1]} ` : ''}${r.value}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.xs,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text variant="caption" color="textMuted">
                {r.label}
              </Text>
              <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        children
      )}
    </Card>
  );
}

export function LegendItem({
  label,
  kind,
  color,
}: {
  label: string;
  kind: 'line' | 'dot' | 'bar' | 'dash';
  color: string;
}) {
  const { spacing } = useTheme();
  const glyph =
    kind === 'line' ? (
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
    ) : kind === 'dot' ? (
      <View
        style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: 0.35 }}
      />
    ) : kind === 'dash' ? (
      <View
        style={{
          width: 16,
          height: 0,
          borderTopWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: color,
        }}
      />
    ) : (
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {glyph}
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}
