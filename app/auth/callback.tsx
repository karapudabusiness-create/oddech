import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, LoadingState, Text } from '@/components/ui';
import { completeMagicLink } from '@/features/account/actions';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

/** Obsługa linku logowania z e-maila: oddech://auth/callback?code=… */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { spacing, colors } = useTheme();
  const [exchangeFailed, setFailed] = useState(false);
  const failed = !code || exchangeFailed;

  useEffect(() => {
    if (!code) return;
    completeMagicLink(code)
      .then(() => router.replace('/account'))
      .catch(() => setFailed(true));
  }, [code]);

  if (!failed) return <LoadingState label={strings.account.linkSigningIn} />;
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xxl,
        gap: spacing.lg,
        backgroundColor: colors.background,
      }}
    >
      <Text align="center">{strings.account.linkFailed}</Text>
      <Button
        label={strings.account.title}
        onPress={() => router.replace('/account')}
        style={{ alignSelf: 'center' }}
      />
    </View>
  );
}
