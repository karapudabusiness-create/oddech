import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';

import { Button, Card, Sheet, Text } from '@/components/ui';
import { strings } from '@/i18n';
import { formatTime, fromDateKey, parseTime, toDateKey, type DateKey } from '@/lib/dates';
import { MIN_TOUCH, useTheme } from '@/theme';

export function Section({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        variant="label"
        color="textMuted"
        accessibilityRole="header"
        style={{ paddingHorizontal: spacing.xs }}
      >
        {title}
      </Text>
      <Card style={{ paddingVertical: spacing.xs, gap: 0 }}>{children}</Card>
      {footer ? (
        <Text variant="caption" color="textMuted" style={{ paddingHorizontal: spacing.xs }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Row({
  label,
  hint,
  value,
  onPress,
  right,
  disabled,
  danger,
}: {
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TOUCH + 8,
        gap: spacing.md,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1, paddingVertical: spacing.sm }}>
        <Text variant="bodyStrong" color={danger ? 'dangerText' : 'text'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? <Text color="textMuted">{value}</Text> : null}
      {right}
      {onPress && !right ? <ChevronRight color={colors.textMuted} size={18} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityHint={hint}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Row
      label={label}
      hint={hint}
      disabled={disabled}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          accessibilityLabel={label}
          accessibilityHint={hint}
          trackColor={{ true: colors.secondary, false: colors.border }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.border}
        />
      }
    />
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel: string;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH,
              borderRadius: radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xs,
              backgroundColor: selected ? colors.primary : colors.surfaceSoft,
            }}
          >
            <Text
              variant="bodyStrong"
              style={{ color: selected ? colors.onPrimary : colors.text, fontSize: 15 }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PickerMode = 'time' | 'date';

/**
 * Wiersz z wartością godziny/daty. Android: natywny dialog. iOS: arkusz z kołem wyboru.
 * Wartość: 'HH:MM' (time) lub 'YYYY-MM-DD' (date).
 */
export function PickerRow({
  label,
  hint,
  mode,
  value,
  onChange,
  maximumDate,
  disabled,
}: {
  label: string;
  hint?: string;
  mode: PickerMode;
  value: string;
  onChange: (v: string) => void;
  maximumDate?: DateKey;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toDate = () => {
    if (mode === 'date') return fromDateKey(value);
    const d = new Date();
    const m = parseTime(value);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    return d;
  };
  const [draft, setDraft] = useState<Date>(toDate);
  const fromDate = (d: Date) =>
    mode === 'date' ? toDateKey(d) : formatTime(d.getHours() * 60 + d.getMinutes());
  const display =
    mode === 'date'
      ? fromDateKey(value).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : value;
  const max = maximumDate ? fromDateKey(maximumDate) : undefined;

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(),
        mode,
        is24Hour: true,
        maximumDate: max,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(fromDate(d));
        },
      });
      return;
    }
    setDraft(toDate());
    setOpen(true);
  };

  return (
    <>
      <Row label={label} hint={hint} value={display} onPress={press} disabled={disabled} />
      {Platform.OS === 'ios' ? (
        <Sheet
          visible={open}
          onClose={() => setOpen(false)}
          title={label}
          footer={
            <Button
              label={strings.common.done}
              fullWidth
              onPress={() => {
                onChange(fromDate(draft));
                setOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            value={draft}
            mode={mode}
            display="spinner"
            locale="pl-PL"
            is24Hour
            maximumDate={max}
            onChange={(_, d) => d && setDraft(d)}
          />
        </Sheet>
      ) : null}
    </>
  );
}

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.sm }}
      accessibilityLabel={strings.settings.reminders.weekdays}
    >
      {strings.calendar.weekdays.map((label, i) => {
        const day = i + 1;
        const selected = value.includes(day);
        return (
          <Pressable
            key={label}
            onPress={() =>
              onChange(selected ? value.filter((d) => d !== day) : [...value, day].sort())
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={strings.calendar.weekdaysLong[i]}
            style={{
              flex: 1,
              aspectRatio: 1,
              maxHeight: 48,
              minHeight: MIN_TOUCH,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.primary : colors.surfaceSoft,
            }}
          >
            <Text
              variant="caption"
              style={{
                color: selected ? colors.onPrimary : colors.text,
                fontFamily: 'NunitoSans_700Bold',
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
