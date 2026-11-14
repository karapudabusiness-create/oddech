import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SyncBadge } from '@/components/account/SyncBadge';
import { Divider, Row, Section } from '@/components/settings/controls';
import { Button, Card, Text } from '@/components/ui';
import {
  AuthActionError,
  deleteAccount,
  hasUnsyncedChanges,
  sendLoginCode,
  signOut,
  verifyLoginCode,
} from '@/features/account/actions';
import { strings } from '@/i18n';
import { supabaseUrlIssue } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/stores/account';
import { useToast } from '@/stores/toast';
import { syncNow } from '@/sync/manager';
import { fontFamilies, useTheme } from '@/theme';

const t = strings.account;
const RESEND_S = 60;

function errorText(e: unknown): string {
  const base = t.errors[e instanceof AuthActionError ? e.code : 'other'];
  const detail =
    e instanceof AuthActionError ? e.detail : e instanceof Error ? e.message : undefined;
  return detail ? `${base}\n\n${t.details(detail)}` : base;
}

function SignInForm() {
  const { colors, spacing, radii } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const showToast = useToast((s) => s.show);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const input = {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: 17,
  } as const;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendLoginCode(email);
      setStep('code');
      setCooldown(RESEND_S);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyLoginCode(email, code);
      showToast(t.signedIn);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Text>{t.intro}</Text>
      <Text variant="caption" color="textMuted">
        {t.localNote}
      </Text>
      {step === 'email' ? (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.emailPlaceholder}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={() => void send()}
            style={input}
          />
          <Button
            label={t.sendCode}
            fullWidth
            loading={busy}
            disabled={!email.trim()}
            onPress={() => void send()}
          />
        </>
      ) : (
        <>
          <Text color="textMuted">{t.codeSentTo(email.trim())}</Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 10))}
            placeholder="123456"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t.code}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={() => void verify()}
            style={[
              input,
              {
                fontSize: 24,
                letterSpacing: 6,
                textAlign: 'center',
                fontFamily: fontFamilies.bold,
              },
            ]}
          />
          <Button
            label={t.verify}
            fullWidth
            loading={busy}
            disabled={code.length < 6}
            onPress={() => void verify()}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button
              label={t.changeEmail}
              variant="ghost"
              size="sm"
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            />
            <Button
              label={cooldown > 0 ? t.resendIn(cooldown) : t.resend}
              variant="ghost"
              size="sm"
              disabled={cooldown > 0 || busy}
              onPress={() => void send()}
            />
          </View>
        </>
      )}
      {error ? (
        <Text color="dangerText" accessibilityLiveRegion="assertive">
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function SignedIn() {
  const { spacing } = useTheme();
  const { session, pending, lastSyncedAt, sync } = useAccount();
  const showToast = useToast((s) => s.show);
  const [busy, setBusy] = useState(false);
  const email = session?.user.email ?? '';
  const when = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('pl-PL', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const confirmSignOut = async () => {
    const unsynced = await hasUnsyncedChanges();
    Alert.alert(
      t.signOutTitle,
      unsynced && sync === 'offline' ? t.signOutUnsynced : t.signOutBody,
      [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: t.signOutConfirm,
          style: unsynced ? 'destructive' : 'default',
          onPress: async () => {
            setBusy(true);
            try {
              await signOut();
              showToast(t.signedOut);
              router.back();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const confirmDelete = () =>
    Alert.alert(t.deleteTitle, t.deleteBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: t.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteAccount();
            showToast(t.deleted);
            router.back();
          } catch (e) {
            showToast(errorText(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <View style={{ gap: spacing.xl }}>
      <Section title={t.signedInAs}>
        <Row label={email} />
      </Section>
      <Section title={t.syncTitle} footer={pending > 0 ? t.pending(pending) : undefined}>
        <View style={{ paddingVertical: spacing.md, gap: spacing.xs }}>
          <SyncBadge />
          <Text variant="caption" color="textMuted">
            {when ? t.lastSync(when) : t.neverSynced}
          </Text>
        </View>
        <Divider />
        <View style={{ paddingVertical: spacing.md }}>
          <Button
            label={t.syncNow}
            variant="soft"
            fullWidth
            loading={sync === 'syncing'}
            onPress={() => void syncNow()}
          />
        </View>
      </Section>
      <Section title={strings.settings.sections.account}>
        <Row label={t.signOut} onPress={() => void confirmSignOut()} disabled={busy} />
        <Divider />
        <Row label={t.deleteAccount} danger onPress={confirmDelete} disabled={busy} />
      </Section>
      {busy ? <ActivityIndicator /> : null}
    </View>
  );
}

export default function AccountScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { session, ready } = useAccount();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: true, title: t.title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.xl,
          paddingBottom: insets.bottom + spacing.huge,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {!supabase ? (
          <Card tone="soft" style={{ gap: spacing.sm }}>
            <Text variant="subheading">{t.notConfiguredTitle}</Text>
            <Text color="textMuted">{t.notConfiguredBody}</Text>
          </Card>
        ) : null}
        {supabase && supabaseUrlIssue() ? (
          <Card tone="soft" style={{ gap: spacing.sm }}>
            <Text variant="subheading" color="dangerText">
              {t.urlIssueTitle}
            </Text>
            <Text>{t.urlIssues[supabaseUrlIssue()!]}</Text>
            <Text variant="caption" color="textMuted">
              {t.urlIssueRestart}
            </Text>
          </Card>
        ) : null}
        {!supabase ? null : !ready ? (
          <ActivityIndicator />
        ) : session ? (
          <SignedIn />
        ) : (
          <SignInForm />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
