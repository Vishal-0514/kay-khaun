import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { Glow, rise, riseUp } from '../components/Motion';
import { confirmEmailVerified, endFirebaseSession, resendVerificationEmail } from '../lib/firebase';
import { homeRouteFor } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

const RESEND_SECONDS = 30;

// After signing up (or logging in before verifying): they tap the link Firebase
// emailed them and come back. Coming back to the app checks automatically, so
// usually nothing needs tapping here.
export default function VerifyEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const bandHeight = useBandHeight(200);
  const setSession = useAuthStore((s) => s.setSession);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [wait, setWait] = useState(RESEND_SECONDS);
  const busy = useRef(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function check({ quiet = false } = {}) {
    if (busy.current) return;
    busy.current = true;
    setError('');
    setNotice('');
    setChecking(true);
    try {
      const session = await confirmEmailVerified();
      if (session) {
        setSession(session);
        router.dismissAll?.();
        router.replace(homeRouteFor(session.user));
      } else if (!quiet) {
        setNotice('Not verified yet. Tap the link in our email first — check your spam folder too.');
      }
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }

  // Back from the mail app: try straight away.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check({ quiet: true });
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resend() {
    setError('');
    setNotice('');
    try {
      await resendVerificationEmail();
      setWait(RESEND_SECONDS);
      setNotice('A new link is on its way.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function differentEmail() {
    await endFirebaseSession();
    router.back();
  }

  return (
    <View style={styles.root}>
      <BandHeader height={bandHeight} title="Check your inbox" subtitle="One tap and you're in." onBack={differentEmail} />
      <Animated.View entering={riseUp(0, 120)} style={[styles.card, { marginTop: bandHeight - 28 }]}>
        <View style={styles.iconWrap}>
          <Glow size={84} color={colors.gold} />
          <View style={styles.icon}>
            <Icon name="mail" size={30} color={colors.maroon} />
          </View>
        </View>
        <Text style={styles.text}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{email}</Text>
          {'\n'}Tap it, then come back here.
        </Text>

        <Button sheen title="I've verified my email" onPress={() => check()} loading={checking} style={{ alignSelf: 'stretch', marginTop: space.lg }} />

        {error ? (
          <Animated.Text entering={rise(0)} style={styles.error}>
            {error}
          </Animated.Text>
        ) : null}
        {notice ? (
          <Animated.Text entering={rise(0)} style={styles.notice}>
            {notice}
          </Animated.Text>
        ) : null}

        <View style={styles.links}>
          {wait > 0 ? (
            <Text style={styles.wait}>Send a new link in {wait}s</Text>
          ) : (
            <Pressable role="button" onPress={resend} hitSlop={8}>
              <Text style={styles.link}>Send a new link</Text>
            </Pressable>
          )}
          <Pressable role="button" onPress={differentEmail} hitSlop={8}>
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: space.lg, alignItems: 'center', ...shadow.lifted },
  iconWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  text: { marginTop: space.md, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.body, textAlign: 'center' },
  email: { fontFamily: fonts.semibold, color: colors.ink },
  error: { marginTop: space.md, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.red, textAlign: 'center' },
  notice: { marginTop: space.md, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.goldText, textAlign: 'center' },
  links: { alignItems: 'center', gap: space.md, marginTop: space.lg, marginBottom: space.sm },
  wait: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
