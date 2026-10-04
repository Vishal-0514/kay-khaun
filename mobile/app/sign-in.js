import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import { api, errorMessage } from '../lib/api';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const copy = {
  phone: { title: "What's your number?", subtitle: "We'll text you a 6-digit code.", label: 'Mobile number' },
  email: { title: "What's your email?", subtitle: "We'll email you a 6-digit code.", label: 'Email address' },
};

export default function SignIn() {
  const router = useRouter();
  const { method = 'phone' } = useLocalSearchParams();
  const isPhone = method === 'phone';
  const t = copy[isPhone ? 'phone' : 'email'];
  const bandHeight = useBandHeight(200);

  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleaned = isPhone ? value.replace(/\D/g, '') : value.trim();
  const valid = isPhone ? /^[6-9]\d{9}$/.test(cleaned) : /^\S+@\S+\.\S+$/.test(cleaned);

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/auth/${isPhone ? 'phone' : 'email'}/send-otp`, { [isPhone ? 'phone' : 'email']: cleaned });
      router.push({
        pathname: '/verify',
        params: { method: isPhone ? 'phone' : 'email', value: cleaned, retryAfter: String(data.retryAfter), devConsole: data.devConsole ? '1' : '' },
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BandHeader height={bandHeight} title={t.title} subtitle={t.subtitle} />
      <View style={[styles.card, { marginTop: bandHeight - 28 }]}>
        <Text style={styles.label} nativeID="signin-label">
          {t.label}
        </Text>
        <View style={[styles.field, error && styles.fieldError]}>
          {isPhone && (
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
          )}
          <TextInput
            aria-labelledby="signin-label"
            aria-label={t.label}
            style={styles.input}
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setError('');
            }}
            placeholder={isPhone ? '98765 43210' : 'you@example.com'}
            placeholderTextColor="#B3A196"
            keyboardType={isPhone ? 'phone-pad' : 'email-address'}
            textContentType={isPhone ? 'telephoneNumber' : 'emailAddress'}
            autoComplete={isPhone ? 'tel' : 'email'}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={isPhone ? 14 : 254}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={() => valid && !busy && sendCode()}
          />
        </View>
        {error ? (
          <Text style={styles.error} aria-live="polite">
            {error}
          </Text>
        ) : null}
        <Button title="Send code" onPress={sendCode} loading={busy} disabled={!valid} style={{ marginTop: space.lg }} />
        <Button
          variant="link"
          title={isPhone ? 'Use email instead' : 'Use phone instead'}
          onPress={() => router.replace({ pathname: '/sign-in', params: { method: isPhone ? 'email' : 'phone' } })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: space.lg, paddingBottom: space.sm, ...shadow.lifted },
  label: { ...type.label },
  field: { marginTop: space.sm, height: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  fieldError: { borderColor: colors.red },
  prefix: { height: '100%', paddingHorizontal: space.base, justifyContent: 'center', backgroundColor: colors.soft, borderRightWidth: 1, borderRightColor: colors.hair },
  prefixText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  input: { flex: 1, height: '100%', paddingHorizontal: space.base, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  error: { marginTop: space.sm, fontFamily: fonts.medium, fontSize: 14, color: colors.red },
});
