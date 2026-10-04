import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import MumbaiScene from '../components/MumbaiScene';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { api, errorMessage } from '../lib/api';
import { googleUnavailableReason, getGoogleIdToken } from '../lib/googleSignIn';
import { homeRouteFor } from '../lib/session';
import { notify } from '../lib/notify';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, type, space, radius } from '../lib/theme';

const SHEET_HEIGHT = 400;

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

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const setSession = useAuthStore((s) => s.setSession);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  const sceneHeight = Math.max(360, height - SHEET_HEIGHT + 40);

  async function continueWithGoogle() {
    const reason = googleUnavailableReason();
    if (reason) return notify('Google sign-in', reason);
    setGoogleBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      const { data } = await api.post('/auth/google', { idToken });
      setSession(data);
      router.replace(homeRouteFor(data.user));
    } catch (err) {
      notify("Couldn't sign in with Google", errorMessage(err));
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
      notify('Skip login', err.response?.status === 404 ? 'Skipping login is turned off on the server (ALLOW_GUEST_LOGIN).' : errorMessage(err));
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.scene, { height: sceneHeight }]}>
        <MumbaiScene width={width} height={sceneHeight} />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + space.lg }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>K</Text>
          </View>
          <Text style={styles.brandName}>Kya Khaun?</Text>
        </View>
        <Text style={[styles.kicker, { marginTop: space.lg }]}>Your AI food guide</Text>
        <Text style={styles.hero}>Hungry tonight?</Text>

        <View style={styles.askBubble}>
          <View style={styles.askMic}>
            <Icon name="mic" size={16} color={colors.maroon} strokeWidth={2.4} />
          </View>
          <Text style={styles.askText}>"Something spicy under ₹400, in 30 minutes"</Text>
        </View>
        <View style={styles.replyBubble}>
          <View style={styles.replyTick}>
            <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.2} />
          </View>
          <Text style={styles.replyText}>Found 5 picks near you</Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.base }]}>
        <Text style={styles.title} role="heading">
          Can't decide{'\n'}what to eat?
        </Text>
        <Text style={styles.lede}>Tell me your craving, budget and time. I'll find the right meal in seconds.</Text>
        <View style={styles.buttons}>
          <Button variant="outline" title="Continue with Google" icon={<GoogleG />} loading={googleBusy} onPress={continueWithGoogle} />
          <Button
            title="Continue with phone"
            icon={<Icon name="phone" color="#FFFFFF" />}
            onPress={() => router.push({ pathname: '/sign-in', params: { method: 'phone' } })}
          />
        </View>
        <View style={styles.footer}>
          <Button variant="link" title="Use email instead" onPress={() => router.push({ pathname: '/sign-in', params: { method: 'email' } })} />
          <Text style={styles.legal}>By continuing you agree to our Terms and Privacy Policy.</Text>
          {__DEV__ ? <Button variant="link" title="Skip login (testing only)" loading={guestBusy} onPress={skipLogin} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.maroonDeep },
  scene: { position: 'absolute', left: 0, right: 0, top: 0 },
  top: { paddingHorizontal: space.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandMark: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.maroon, lineHeight: 22 },
  brandName: { fontFamily: fonts.display, fontSize: 20, color: colors.cream },
  kicker: { ...type.label, color: '#F4C766', letterSpacing: 1.5 },
  hero: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, color: colors.cream, marginTop: space.xs },
  askBubble: {
    marginTop: space.xl,
    alignSelf: 'flex-start',
    maxWidth: 270,
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
  askMic: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4C766', alignItems: 'center', justifyContent: 'center' },
  askText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.cream },
  replyBubble: {
    marginTop: space.md,
    alignSelf: 'flex-end',
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
