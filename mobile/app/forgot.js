import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { fromRight, leave, rise } from '../components/Motion';
import { api, errorMessage } from '../lib/api';
import { homeRouteFor } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

// Forgot password: we email a 6-digit code, they pick a new password, and
// they're signed in.
export default function Forgot() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bandHeight = useBandHeight(200);
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState('email'); // email -> reset
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const [devConsole, setDevConsole] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const resetOk = /^\d{6}$/.test(code) && password.length >= 8;

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/password/forgot', { email: email.trim() });
      setWait(data.retryAfter ?? 30);
      setDevConsole(Boolean(data.devConsole));
      setStep('reset');
    } catch (err) {
      setError(errorMessage(err));
      if (err.response?.data?.retryAfter) setWait(err.response.data.retryAfter);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/password/reset', { email: email.trim(), code, password });
      setSession(data);
      router.dismissAll?.();
      router.replace(homeRouteFor(data.user));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BandHeader
        height={bandHeight}
        title={step === 'email' ? 'Forgot your password?' : 'Check your email'}
        subtitle={step === 'email' ? "We'll email you a code to set a new one." : `If ${email.trim()} has an account, a 6-digit code is on its way.`}
      />
      <ScrollView contentContainerStyle={{ paddingTop: bandHeight - 28, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={rise(0, 120)} style={styles.card}>
          {step === 'email' ? (
            <Animated.View key="email" exiting={leave}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.field}>
                <TextInput
                  aria-label="Email"
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#B3A196"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={() => emailOk && sendCode()}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title="Email me a code" onPress={sendCode} loading={busy} disabled={!emailOk} style={{ marginTop: space.lg }} />
            </Animated.View>
          ) : (
            <Animated.View key="reset" entering={fromRight()}>
              {devConsole ? (
                <View style={styles.devNote}>
                  <Icon name="spark" size={16} color={colors.goldText} />
                  <Text style={styles.devText}>Testing mode: the code is printed in the server terminal, not emailed.</Text>
                </View>
              ) : null}
              <Text style={styles.label}>6-digit code</Text>
              <View style={styles.field}>
                <TextInput
                  aria-label="6-digit code"
                  style={[styles.input, styles.code]}
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  placeholder="••••••"
                  placeholderTextColor="#C9B48F"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <Text style={[styles.label, { marginTop: space.base }]}>New password</Text>
              <View style={styles.field}>
                <TextInput
                  aria-label="New password"
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError('');
                  }}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#B3A196"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  maxLength={128}
                  returnKeyType="go"
                  onSubmitEditing={() => resetOk && reset()}
                />
              </View>
              {error ? (
                <Animated.Text entering={rise(0)} style={styles.error}>
                  {error}
                </Animated.Text>
              ) : null}
              <Button title="Save and sign in" onPress={reset} loading={busy} disabled={!resetOk} style={{ marginTop: space.lg }} />
              <Pressable onPress={wait ? undefined : sendCode} disabled={wait > 0 || busy} style={styles.resend} role="button">
                <Text style={[styles.resendText, wait > 0 && { color: colors.muted, textDecorationLine: 'none' }]}>
                  {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
                </Text>
              </Pressable>
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
  code: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: 8 },
  error: { marginTop: space.sm, fontFamily: fonts.medium, fontSize: 14, color: colors.red },
  devNote: { flexDirection: 'row', gap: space.sm, alignItems: 'center', padding: space.md, marginBottom: space.base, borderRadius: 12, backgroundColor: colors.goldSoft },
  devText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.goldText },
  resend: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
  resendText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
