import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import MumbaiScene from '../components/MumbaiScene';
import Button from '../components/Button';
import LegalLine from '../components/LegalLine';
import Icon from '../components/Icon';
import { Float, Glow, Reveal, TypingDots, appear, fromLeft, fromRight, leave, rise, sheetUp } from '../components/Motion';
import { api, errorMessage } from '../lib/api';
import { googleUnavailableReason, signInWithGoogle } from '../lib/googleSignIn';
import { signInWithGoogleToken } from '../lib/firebase';
import { homeRouteFor } from '../lib/session';
import { notify } from '../lib/notify';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, type, space, radius } from '../lib/theme';
import { t } from '../lib/i18n';

const SHEET_HEIGHT = 400;

// The little conversation that plays on the welcome screen, on a loop.
const DEMOS = [
  { ask: 'Something spicy under ₹400, in 30 minutes', reply: 'Found 5 picks near you', icon: 'bag' },
  { ask: 'Ghar pe kya banaun? Aloo, pyaaz, dahi hai', reply: '3 recipes from your kitchen', icon: 'pot' },
  { ask: 'Light veg dinner, jaldi please', reply: 'Top 5, ready in 25 min', icon: 'clock' },
];
const TYPE_MS = 32; // per character
const THINK_MS = 900;
const HOLD_MS = 2600;

function GoogleG() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

// Types out a craving, shows Chatora thinking, then pops in the answer — then the next one.
function CravingDemo() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState('typing'); // typing -> thinking -> answered -> leaving
  const demo = DEMOS[index];

  useEffect(() => {
    setTyped(0);
    setPhase('typing');
    const timers = [];
    const typing = setInterval(() => setTyped((n) => Math.min(n + 1, demo.ask.length)), TYPE_MS);
    const typedAt = 500 + demo.ask.length * TYPE_MS;
    const leaveAt = typedAt + THINK_MS + HOLD_MS;
    timers.push(setTimeout(() => setPhase('thinking'), typedAt));
    timers.push(setTimeout(() => setPhase('answered'), typedAt + THINK_MS));
    // Let both bubbles fade away before the next craving starts typing.
    timers.push(setTimeout(() => setPhase('leaving'), leaveAt));
    timers.push(setTimeout(() => setIndex((i) => (i + 1) % DEMOS.length), leaveAt + 350));
    return () => {
      clearInterval(typing);
      timers.forEach(clearTimeout);
    };
  }, [index, demo.ask.length]);

  return (
    <View style={styles.demo} aria-label={t('Example: {ask}. {reply}.', { ask: demo.ask, reply: t(demo.reply) })}>
      {phase !== 'leaving' ? (
        <Animated.View key={`ask${index}`} entering={fromLeft()} exiting={leave} style={styles.askBubble}>
          <View style={styles.askMic}>
            <Glow size={46} color="#F4C766" />
            <Icon name="mic" size={16} color={colors.maroon} strokeWidth={2.4} />
          </View>
          <Text style={styles.askText}>
            “{demo.ask.slice(0, typed)}
            {typed < demo.ask.length ? <Text style={{ color: colors.gold }}>|</Text> : '”'}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.askPlaceholder} />
      )}

      <View style={styles.replySlot}>
        {phase === 'thinking' ? (
          <Animated.View key={`think${index}`} entering={fromRight()} exiting={leave} style={styles.thinking}>
            <TypingDots color={colors.maroon} />
          </Animated.View>
        ) : null}
        {phase === 'answered' ? (
          <Animated.View key={`reply${index}`} entering={fromRight()} exiting={leave} style={styles.replyBubble}>
            <View style={styles.replyTick}>
              <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.2} />
            </View>
            <Text style={styles.replyText}>{t(demo.reply)}</Text>
            <Icon name={demo.icon} size={16} color={colors.goldText} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const setSession = useAuthStore((s) => s.setSession);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  const sceneHeight = Math.max(360, height - SHEET_HEIGHT + 40);

  // Slow "camera push" into the Mumbai scene.
  const zoom = useSharedValue(1.14);
  useEffect(() => {
    zoom.value = withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) });
  }, [zoom]);
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));

  async function continueWithGoogle() {
    const reason = googleUnavailableReason();
    if (reason) return notify(t('Google sign-in'), reason);
    setGoogleBusy(true);
    try {
      // Google's account picker -> Firebase -> our server's session (like KARIS).
      const googleToken = await signInWithGoogle();
      if (!googleToken) return;
      const session = await signInWithGoogleToken(googleToken);
      setSession(session);
      router.replace(homeRouteFor(session.user));
    } catch (err) {
      notify(t("Couldn't sign in with Google"), err.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  // Testing only: the server makes a throwaway account (ALLOW_GUEST_LOGIN=true).
  async function skipLogin() {
    setGuestBusy(true);
    try {
      const { data } = await api.post('/auth/guest');
      setSession(data);
      router.replace(homeRouteFor(data.user));
    } catch (err) {
      notify(t('Skip login'), err.response?.status === 404 ? 'Skipping login is turned off on the server (ALLOW_GUEST_LOGIN).' : errorMessage(err));
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.scene, { height: sceneHeight }, sceneStyle]}>
        <MumbaiScene width={width} height={sceneHeight} />
      </Animated.View>

      {/* Gold sparkles drifting over the city */}
      <Float style={[styles.spark, { right: 36, top: insets.top + 64 }]} distance={10} duration={2800}>
        <Icon name="spark" size={18} color={colors.gold} />
      </Float>
      <Float style={[styles.spark, { right: 86, top: insets.top + 132 }]} distance={7} duration={3400} delay={700}>
        <Icon name="spark" size={11} color="#F4C766" />
      </Float>
      <Float style={[styles.spark, { left: width * 0.62, top: insets.top + 18 }]} distance={6} duration={3000} delay={1300}>
        <Icon name="spark" size={9} color="#F4C766" />
      </Float>

      <View style={[styles.top, { paddingTop: insets.top + space.lg }]}>
        <Animated.View entering={rise(0, 150)} style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>K</Text>
          </View>
          <Text style={styles.brandName}>Kya Khaun?</Text>
        </Animated.View>
        <Reveal delay={250} style={{ marginTop: space.lg }}>
          <Text style={styles.kicker}>{t("Your AI food guide")}</Text>
        </Reveal>
        <Reveal delay={420}>
          <Text style={styles.hero}>{t("Hungry tonight?")}</Text>
        </Reveal>
        <Animated.View entering={appear(0, 900)}>
          <CravingDemo />
        </Animated.View>
      </View>

      <Animated.View entering={sheetUp(150)} style={[styles.sheet, { paddingBottom: insets.bottom + space.base }]}>
        <Animated.Text entering={rise(0, 550)} style={styles.title} role="heading">
          {t("Can't decide\nwhat to eat?")}
        </Animated.Text>
        <Animated.Text entering={rise(1, 550)} style={styles.lede}>
          {t("Tell me your craving, budget and time. I'll find the right meal in seconds.")}
        </Animated.Text>
        <View style={styles.buttons}>
          <Animated.View entering={rise(2, 550)}>
            <Button variant="outline" title={t("Continue with Google")} icon={<GoogleG />} loading={googleBusy} onPress={continueWithGoogle} />
          </Animated.View>
          <Animated.View entering={rise(3, 550)}>
            <Button sheen title={t("Continue with email")} icon={<Icon name="mail" color="#FFFFFF" />} onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'login' } })} />
          </Animated.View>
        </View>
        <Animated.View entering={rise(4, 550)} style={styles.footer}>
          <Button variant="link" title={t("New here? Create an account")} onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signup' } })} />
          <LegalLine style={styles.legal} text="By continuing you agree to our {terms} and {privacy}." />
          {__DEV__ ? <Button variant="link" title={t("Skip login (testing only)")} loading={guestBusy} onPress={skipLogin} /> : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.maroonDeep, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, right: 0, top: 0 },
  spark: { position: 'absolute' },
  top: { paddingHorizontal: space.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandMark: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.maroon, lineHeight: 22 },
  brandName: { fontFamily: fonts.display, fontSize: 20, color: colors.cream },
  kicker: { ...type.label, color: '#F4C766', letterSpacing: 1.5 },
  hero: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, color: colors.cream, marginTop: space.xs },
  demo: { marginTop: space.xl, minHeight: 124 },
  askBubble: {
    alignSelf: 'flex-start',
    maxWidth: 280,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingRight: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: 'rgba(30,3,5,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(244,199,102,0.35)',
  },
  askPlaceholder: { height: 52 },
  askMic: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4C766', alignItems: 'center', justifyContent: 'center' },
  askText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.cream },
  replySlot: { marginTop: space.md, minHeight: 40, alignItems: 'flex-end' },
  thinking: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18, borderBottomRightRadius: 4, backgroundColor: colors.cream },
  replyBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 9,
    paddingLeft: 9,
    paddingRight: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    backgroundColor: colors.cream,
  },
  replyTick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  replyText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: SHEET_HEIGHT,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 28,
    paddingHorizontal: space.lg,
  },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.ink },
  lede: { ...type.body, color: colors.muted, marginTop: space.md },
  buttons: { gap: space.md, marginTop: space.lg },
  footer: { marginTop: 'auto', alignItems: 'center', paddingTop: space.sm },
  legal: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
