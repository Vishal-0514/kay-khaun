import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import { api, errorMessage } from '../lib/api';
import { homeRouteFor } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

const LENGTH = 6;

function formatDestination(method, value) {
  return method === 'phone' ? `+91 ${value.slice(0, 5)} ${value.slice(5)}` : value;
}

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const method = params.method === 'email' ? 'email' : 'phone';
  const value = String(params.value || '');
  const bandHeight = useBandHeight(200);
  const setSession = useAuthStore((s) => s.setSession);
  const inputRef = useRef(null);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(Number(params.retryAfter) || 30);
  const [devConsole, setDevConsole] = useState(Boolean(params.devConsole));

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(entered) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/auth/${method}/verify-otp`, { [method]: value, code: entered });
      setSession(data);
      // Clear welcome → sign-in → verify so Back can't return to the login flow.
      if (router.canDismiss()) router.dismissAll();
      router.replace(homeRouteFor(data.user));
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      const { data } = await api.post(`/auth/${method}/send-otp`, { [method]: value });
      setWait(data.retryAfter);
      setDevConsole(Boolean(data.devConsole));
    } catch (err) {
      setError(errorMessage(err));
      if (err.response?.data?.retryAfter) setWait(err.response.data.retryAfter);
    }
  }

  function onChange(text) {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setError('');
    if (digits.length === LENGTH && !busy) verify(digits);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BandHeader height={bandHeight} title="Enter the code" subtitle={`Sent to ${formatDestination(method, value)}`} />
      <View style={[styles.card, { marginTop: bandHeight - 28 }]}>
        <Pressable onPress={() => inputRef.current?.focus()} aria-label="Enter the 6-digit code" style={styles.boxes}>
          {Array.from({ length: LENGTH }, (_, i) => {
            const active = i === code.length && !busy;
            return (
              <View key={i} style={[styles.box, active && styles.boxActive, error && styles.boxError]}>
                <Text style={styles.digit}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LENGTH}
          autoFocus
          style={styles.hiddenInput}
          aria-label="Verification code"
        />
        {error ? (
          <Text style={styles.error} aria-live="polite">
            {error}
          </Text>
        ) : null}
        {devConsole ? <Text style={styles.devNote}>Testing mode: the code is printed in the server terminal.</Text> : null}

        <Button title="Verify" onPress={() => verify(code)} loading={busy} disabled={code.length !== LENGTH} style={{ marginTop: space.lg }} />
        <View style={styles.resendRow}>
          {wait > 0 ? (
            <Text style={styles.wait}>Resend code in {wait}s</Text>
          ) : (
            <Button variant="link" title="Resend code" onPress={resend} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: space.lg, paddingBottom: space.sm, ...shadow.lifted },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  box: { flex: 1, height: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: colors.gold, borderWidth: 2, backgroundColor: colors.surface },
  boxError: { borderColor: colors.red },
  digit: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  error: { marginTop: space.md, fontFamily: fonts.medium, fontSize: 14, color: colors.red },
  devNote: { marginTop: space.md, fontFamily: fonts.medium, fontSize: 13, color: colors.goldText, backgroundColor: colors.goldSoft, padding: space.md, borderRadius: 12 },
  resendRow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  wait: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
});
