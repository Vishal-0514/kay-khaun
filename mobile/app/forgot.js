import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { fromRight, leave, rise } from '../components/Motion';
import { sendPasswordReset } from '../lib/firebase';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// Forgot password: Firebase emails a link to set a new password; then they log in.
export default function Forgot() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bandHeight = useBandHeight(200);
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  async function send() {
    setBusy(true);
    setError('');
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      // Don't reveal whether an account exists: "no such user" still looks sent.
      if (err.code === 'auth/user-not-found') setSent(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BandHeader
        height={bandHeight}
        title={sent ? t('Check your email') : t('Forgot your password?')}
        subtitle={sent ? t('Follow the link to choose a new password.') : t("We'll email you a link to set a new one.")}
      />
      <ScrollView contentContainerStyle={{ paddingTop: bandHeight - 28, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={rise(0, 120)} style={styles.card}>
          {!sent ? (
            <Animated.View key="email" exiting={leave}>
              <Text style={styles.label}>{t("Email")}</Text>
              <View style={styles.field}>
                <TextInput
                  aria-label={t("Email")}
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError('');
                  }}
                  placeholder={t("you@example.com")}
                  placeholderTextColor="#B3A196"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={() => emailOk && send()}
                />
              </View>
              {error ? (
                <Animated.Text entering={rise(0)} style={styles.error}>
                  {error}
                </Animated.Text>
              ) : null}
              <Button sheen title={t("Email me a reset link")} onPress={send} loading={busy} disabled={!emailOk} style={{ marginTop: space.lg }} />
            </Animated.View>
          ) : (
            <Animated.View key="sent" entering={fromRight()} style={{ alignItems: 'center' }}>
              <View style={styles.icon}>
                <Icon name="mail" size={28} color={colors.maroon} />
              </View>
              <Text style={styles.text}>
                If <Text style={styles.email}>{email.trim()}</Text> has an account, a reset link is on its way. Check your spam folder too.
              </Text>
              <Button title={t("Back to log in")} onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
              <Button variant="link" title={t("Send it again")} onPress={send} loading={busy} />
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: space.lg, ...shadow.lifted },
  label: { ...type.label },
  field: { marginTop: space.sm, height: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  input: { flex: 1, height: '100%', paddingHorizontal: space.base, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  error: { marginTop: space.sm, fontFamily: fonts.medium, fontSize: 14, color: colors.red },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  text: { marginTop: space.md, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.body, textAlign: 'center' },
  email: { fontFamily: fonts.semibold, color: colors.ink },
});
