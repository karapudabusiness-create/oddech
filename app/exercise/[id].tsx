import { useLiveQuery } from '@/hooks/useLiveQuery';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorState, LoadingState, Text } from '@/components/ui';
import { db } from '@/db/client';
import {
  createExercise,
  exerciseByIdQuery,
  setExerciseDeleted,
  updateExercise,
  validateExercise,
  type ExerciseErrors,
  type ExerciseInput,
} from '@/db/repositories/exercises';
import { SLOTS, type Slot } from '@/db/schema';
import { strings } from '@/i18n';
import { useToast } from '@/stores/toast';
import { fontFamilies, useTheme } from '@/theme';

const EMPTY: ExerciseInput = {
  name: '',
  slot: 'morning',
  minutes: 3,
  inhaleS: 4,
  exhaleS: 6,
  description: '',
  active: true,
};

type FormState = Omit<ExerciseInput, 'minutes' | 'inhaleS' | 'exhaleS'> & {
  minutes: string;
  inhaleS: string;
  exhaleS: string;
};

const toForm = (e: ExerciseInput): FormState => ({
  ...e,
  minutes: String(e.minutes),
  inhaleS: String(e.inhaleS),
  exhaleS: String(e.exhaleS),
});

const toInput = (f: FormState): ExerciseInput => ({
  ...f,
  minutes: Number(f.minutes.replace(',', '.')),
  inhaleS: Number(f.inhaleS.replace(',', '.')),
  exhaleS: Number(f.exhaleS.replace(',', '.')),
});

export default function ExerciseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { data, error } = useLiveQuery(exerciseByIdQuery(db, isNew ? '' : id), [id]);
  const existing = data[0];
  const [edited, setForm] = useState<FormState | null>(isNew ? toForm(EMPTY) : null);
  const form = edited ?? (existing ? toForm(existing) : null);
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [saving, setSaving] = useState(false);
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);

  if (error) return <ErrorState error={error} />;
  if (!form) return <LoadingState />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...(f ?? form), [key]: value }));

  const save = async () => {
    const input = toInput(form);
    const errs = validateExercise(input);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (isNew) await createExercise(db, input);
      else await updateExercise(db, id, input);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert(strings.exercises.deleteConfirmTitle, strings.exercises.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          await setExerciseDeleted(db, id, true);
          router.back();
          showToast(strings.exercises.deleted(form.name), {
            label: strings.common.undo,
            onPress: () => void setExerciseDeleted(db, id, false),
          });
        },
      },
    ]);
  };

  const inputStyle = {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  } as const;

  const field = (label: string, child: React.ReactNode, err?: string) => (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      {child}
      {err ? (
        <Text variant="caption" color="dangerText" accessibilityLiveRegion="assertive">
          {err}
        </Text>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: 'modal',
          title: isNew ? strings.exercises.newTitle : strings.exercises.editTitle,
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.lg,
          paddingBottom: insets.bottom + spacing.huge,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {field(
          strings.exercises.fields.name,
          <TextInput
            value={form.name}
            onChangeText={(t) => set('name', t)}
            placeholder={strings.exercises.fields.namePlaceholder}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={strings.exercises.fields.name}
            style={inputStyle}
          />,
          errors.name ? strings.exercises.errors.nameRequired : undefined,
        )}

        {field(
          strings.exercises.fields.slot,
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
            accessibilityRole="radiogroup"
          >
            {SLOTS.map((s: Slot) => {
              const selected = form.slot === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => set('slot', s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radii.pill,
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.primary : colors.surfaceSoft,
                  }}
                >
                  <Text
                    variant="bodyStrong"
                    style={{ color: selected ? colors.onPrimary : colors.text }}
                  >
                    {strings.slots[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>,
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {(
            [
              ['minutes', strings.exercises.fields.minutes],
              ['inhaleS', strings.exercises.fields.inhale],
              ['exhaleS', strings.exercises.fields.exhale],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={{ flex: 1 }}>
              {field(
                label,
                <TextInput
                  value={form[key]}
                  onChangeText={(t) => set(key, t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  accessibilityLabel={label}
                  maxLength={3}
                  style={[inputStyle, { textAlign: 'center' }]}
                />,
              )}
            </View>
          ))}
        </View>
        {errors.minutes ? (
          <Text variant="caption" color="dangerText">
            {strings.exercises.errors.minutes}
          </Text>
        ) : null}
        <Text variant="caption" color={errors.tempo ? 'dangerText' : 'textMuted'}>
          {errors.tempo ? strings.exercises.errors.tempo : strings.exercises.fields.pacerHint}
        </Text>

        {field(
          strings.exercises.fields.description,
          <TextInput
            value={form.description}
            onChangeText={(t) => set('description', t)}
            placeholder={strings.exercises.fields.descriptionPlaceholder}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={strings.exercises.fields.description}
            multiline
            textAlignVertical="top"
            style={[inputStyle, { minHeight: 140, lineHeight: 22 }]}
          />,
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 44,
          }}
        >
          <Text variant="bodyStrong">{strings.exercises.fields.active}</Text>
          <Switch
            value={form.active}
            onValueChange={(v) => set('active', v)}
            accessibilityLabel={strings.exercises.fields.active}
            trackColor={{ true: colors.secondary, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Button
          label={strings.common.save}
          fullWidth
          loading={saving}
          onPress={() => void save()}
        />
        {!isNew ? (
          <Button
            label={strings.common.delete}
            variant="danger"
            fullWidth
            icon={<Trash2 color={colors.dangerText} size={18} />}
            onPress={remove}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
