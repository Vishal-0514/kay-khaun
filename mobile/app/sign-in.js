import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { glideTo, leave, rise, smoothLayout } from '../components/Motion';
import { api, errorMessage } from '../lib/api';
import { homeRouteFor } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const COPY = {
  login: { title: 'Welcome back', subtitle: 'Log in with your email and password.', cta: 'Log in' },
  signup: { title: 'Create your account', subtitle: 'Takes 20 seconds. Then tell us what you like to eat.', cta: 'Create account' },
};

// Log in / Create account switch; the gold pill glides between the two.
function ModeSwitch({ mode, onChange }) {
  const [width, setWidth] = useState(0);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: glideTo(mode === 'login' ? 0 : width / 2) }] }), [mode, width]);
  return (
    <View style={styles.switch} role="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}>
      {width ? <Animated.View style={[styles.switchPill, { width: width / 2 }, pill]} /> : null}
      {['login', 'signup'].map((m) => (
        <Pressable key={m} role="tab" aria-selected={mode === m} onPress={() => onChange(m)} style={styles.switchItem}>
          <Text style={[styles.switchText, mode === m && styles.switchTextOn]}>{m === 'login' ? 'Log in' : 'Create account'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({ label, error, children, right }) {
  return (
    <View style={{ marginTop: space.base }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error && styles.fieldError]}>
        {children}
        {right}
      </View>
    </View>
  );
}

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bandHeight = useBandHeight(200);
  const setSession = useAuthStore((s) => s.setSession);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [mode, setMode] = useState(params.mode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signup = mode === 'signup';
  const t = COPY[mode];
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordOk = signup ? password.length >= 8 : password.length > 0;
  const valid = emailOk && passwordOk && (!signup || name.trim());

  function switchMode(m) {
    setMode(m);
    setError('');
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const body = signup ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password };
      const { data } = await api.post(`/auth/email/${signup ? 'sign-up' : 'log-in'}`, body);
      setSession(data);
      router.replace(homeRouteFor(data.user));
    } catch (err) {
      setError(errorMessage(err));
      // Already registered? Flip to log in, keeping what they typed.
      if (err.response?.data?.code === 'EMAIL_TAKEN') setMode('login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BandHeader height={bandHeight} title={t.title} subtitle={t.subtitle} />
      <ScrollView contentContainerStyle={{ paddingTop: bandHeight - 28, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={rise(0, 120)} layout={smoothLayout} style={styles.card}>
          <ModeSwitch mode={mode} onChange={switchMode} />

          {signup ? (
            <Animated.View entering={rise(0)} exiting={leave}>
              <Field label="Your name">
                <TextInput
                  aria-label="Your name"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="What should Chatora call you?"
                  placeholderTextColor="#B3A196"
                  autoComplete="name"
                  textContentType="name"
                  maxLength={60}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </Field>
            </Animated.View>
          ) : null}

          <Animated.View layout={smoothLayout}>
            <Field label="Email">
              <TextInput
                ref={emailRef}
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
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </Field>

            <Field
              label="Password"
              right={
                <Pressable role="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eye}>
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            >
              <TextInput
                ref={passwordRef}
                aria-label="Password"
                style={styles.input}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError('');
                }}
                placeholder={signup ? 'At least 8 characters' : 'Your password'}
                placeholderTextColor="#B3A196"
                secureTextEntry={!showPassword}
                textContentType={signup ? 'newPassword' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={128}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </Field>
            {signup && password.length > 0 && password.length < 8 ? <Text style={styles.hint}>{8 - password.length} more characters</Text> : null}

            {error ? (
              <Animated.View entering={rise(0)} style={styles.errorBox} aria-live="polite">
                <Icon name="close" size={14} color={colors.red} strokeWidth={2.6} />
                <Text style={styles.error}>{error}</Text>
              </Animated.View>
            ) : null}

            <Button sheen title={t.cta} onPress={submit} loading={busy} disabled={!valid} style={{ marginTop: space.lg }} />
            {!signup ? (
              <Button variant="link" title="Forgot password?" onPress={() => router.push({ pathname: '/forgot', params: { email: email.trim() } })} />
            ) : (
              <Text style={styles.small}>By creating an account you agree to our Terms and Privacy Policy.</Text>
            )}
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: space.lg, paddingBottom: space.sm, ...shadow.lifted },
  switch: { flexDirection: 'row', height: 48, padding: 4, borderRadius: radius.full, backgroundColor: colors.soft },
  switchPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.full, backgroundColor: colors.maroon },
  switchItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  switchTextOn: { color: colors.cream },
  label: { ...type.label },
  field: { marginTop: space.sm, height: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  fieldError: { borderColor: colors.red },
  input: { flex: 1, height: '100%', paddingHorizontal: space.base, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  eye: { paddingHorizontal: space.base, height: '100%', justifyContent: 'center' },
  eyeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.goldText },
  hint: { marginTop: space.xs, fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  errorBox: { flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.md, padding: space.md, borderRadius: 12, backgroundColor: colors.redSoft },
  error: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.red },
  small: { marginVertical: space.md, fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
