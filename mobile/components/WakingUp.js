import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import MaroonBand from './MaroonBand';
import Button from './Button';
import { Glow, TypingDots } from './Motion';
import { useWake } from '../lib/wake';
import { homeRouteFor, restoreSession } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, space } from '../lib/theme';
import { t } from '../lib/i18n';

// Covers the app while the server wakes up (lib/wake.js), or when it couldn't
// be reached on launch, with a Try again button.
export default function WakingUp() {
  const waking = useWake((s) => s.waking);
  const slow = useWake((s) => s.slow);
  const offline = useWake((s) => s.offline);
  const [retrying, setRetrying] = useState(false);
  if (!waking && !offline) return null;

  async function retry() {
    setRetrying(true);
    await restoreSession();
    setRetrying(false);
    const user = useAuthStore.getState().user;
    if (user) router.replace(homeRouteFor(user));
  }

  const away = offline && !waking;
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill} aria-live="polite">
      <MaroonBand height="100%" rounded={false} style={styles.fill}>
        <View style={styles.center}>
          <View style={styles.avatarWrap}>
            {away ? null : <Glow size={150} color={colors.gold} />}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>K</Text>
            </View>
          </View>
          <Text style={styles.title} role="heading">
            {away ? t("Can't reach Kya Khaun") : t('Waking up Chatora…')}
          </Text>
          <Text style={styles.text}>
            {away
              ? t('Check your internet connection and try again.')
              : slow
                ? t('Still warming up. If this keeps going, check your internet.')
                : t('The kitchen was having a quick nap. This can take up to a minute.')}
          </Text>
          {away ? (
            <Button title={t('Try again')} variant="gold" loading={retrying} onPress={retry} style={styles.button} />
          ) : (
            <View style={styles.dots}>
              <TypingDots color={colors.gold} />
            </View>
          )}
        </View>
      </MaroonBand>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, gap: space.base },
  avatarWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.maroon, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 54, color: colors.gold },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.cream, textAlign: 'center' },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.creamMuted, textAlign: 'center', maxWidth: 300 },
  dots: { marginTop: space.sm },
  button: { alignSelf: 'stretch', marginTop: space.sm },
});
