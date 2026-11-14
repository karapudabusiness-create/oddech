import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { strings } from '@/i18n';
import { fontFamilies, useTheme } from '@/theme';

const DEBOUNCE_MS = 700;

/** Notatka z autozapisem (debounce + zapis przy opuszczeniu pola / odmontowaniu). */
export function NoteEditor({
  dateKey,
  value,
  onSave,
}: {
  dateKey: string;
  value: string;
  onSave: (note: string) => Promise<void>;
}) {
  const { colors, spacing, radii } = useTheme();
  const [text, setText] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  // Nowy dzień lub zmiana z zewnątrz (np. synchronizacja), gdy użytkownik nie pisze.
  const [synced, setSynced] = useState({ value, dateKey });
  if (synced.value !== value || synced.dateKey !== dateKey) {
    setSynced({ value, dateKey });
    if (synced.dateKey !== dateKey || text === synced.value) setText(value);
  }

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const toSave = pending.current;
    if (toSave === null) return;
    setStatus('saving');
    try {
      await saveRef.current(toSave);
      if (pending.current === toSave) pending.current = null;
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  // Zapis zaległej zmiany przy zmianie dnia / odmontowaniu.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(
    () => () => {
      void flushRef.current();
    },
    [dateKey],
  );

  const onChange = (t: string) => {
    setText(t);
    pending.current = t;
    setStatus('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text variant="subheading">{strings.today.note.title}</Text>
        <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
          {status === 'saving'
            ? strings.today.note.saving
            : status === 'saved'
              ? strings.today.note.saved
              : ''}
        </Text>
      </View>
      <TextInput
        value={text}
        onChangeText={onChange}
        onBlur={() => void flush()}
        placeholder={strings.today.note.placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={strings.today.note.title}
        multiline
        textAlignVertical="top"
        style={{
          minHeight: 96,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceSoft,
          padding: spacing.md,
          color: colors.text,
          fontFamily: fontFamilies.regular,
          fontSize: 16,
          lineHeight: 22,
        }}
      />
    </Card>
  );
}
