import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { rise, riseUp, sheetUp } from '../components/Motion';
import { useAuthStore } from '../store/useAuthStore';
import { api, errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { PAGES, openPage } from '../lib/pages';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// "Chatora uses AI": asked once after "Your taste", and again from Profile.
// App Store and Play want people told plainly what goes to an AI company, and
// asked first. Saying no keeps the app working in basic mode.

const SHARED = [
  { icon: 'chat', text: 'What you type or say to Chatora, and the recent chat' },
  { icon: 'leaf', text: 'Your taste settings and first name' },
  { icon: 'camera', text: 'Photos of your fridge, only when you choose to scan' },
];
const NOT_SHARED = 'Not your email, your exact location or anything else on your phone.';

export default function AiConsent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams();
  const fromProfile = from === 'profile';
  const setUser = useAuthStore((s) => s.setUser);
  const current = useAuthStore((s) => s.user?.aiConsent);
  const [busy, setBusy] = useState(null);
  const bandHeight = useBandHeight(200);

  async function choose(aiConsent) {
    setBusy(aiConsent ? 'yes' : 'no');
    try {
      const { data } = await api.patch('/profile', { aiConsent });
      setUser(data.user);
      if (fromProfile && router.canGoBack()) router.back();
      else router.replace('/home');
    } catch (err) {
      notify(t("Couldn't save your choice"), errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.root}>
      <BandHeader height={bandHeight} title={t('Chatora uses AI')} subtitle={t('Here is what that means, before you start.')} onBack={fromProfile ? undefined : false} />
      <ScrollView contentContainerStyle={{ paddingTop: bandHeight - 32, paddingBottom: 200 + insets.bottom }}>
        <Animated.View entering={riseUp(0, 150)} style={styles.card}>
          <Text style={type.body}>
            {t("Chatora's replies, recipe ideas and fridge scans are made by Claude, an AI model from Anthropic. To answer you, Kya Khaun sends Anthropic:")}
          </Text>
          {SHARED.map((s, i) => (
            <Animated.View key={s.icon} entering={rise(i, 300)} style={styles.row}>
              <View style={styles.icon}>
                <Icon name={s.icon} size={18} color={colors.red} />
              </View>
              <Text style={styles.rowText}>{t(s.text)}</Text>
            </Animated.View>
          ))}
          <Text style={type.small}>{t(NOT_SHARED)}</Text>
          <View style={styles.facts}>
            <Text style={styles.fact}>• {t('Anthropic uses it only to write the reply, and does not train its AI on it.')}</Text>
            <Text style={styles.fact}>• {t('AI can be wrong. Always check allergens with the restaurant, and tap Report on any reply that looks wrong.')}</Text>
            <Text style={styles.fact}>• {t('You can change this any time in Profile → Use AI.')}</Text>
          </View>
          <Pressable role="link" onPress={() => openPage(PAGES.privacy)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.link}>{t('Read our privacy policy')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={rise(0, 500)} style={styles.basic}>
          <Icon name="spark" size={18} color={colors.goldText} />
          <Text style={styles.basicText}>{t('Prefer not to? Basic mode still finds food for you: Chatora understands simpler requests, and photo scan is off.')}</Text>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={sheetUp(400)} style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={fromProfile && current === true ? t('Keep using AI') : t('Allow AI')} sheen loading={busy === 'yes'} disabled={Boolean(busy)} onPress={() => choose(true)} />
        <Button variant="link" title={fromProfile && current === false ? t('Stay in basic mode') : t('Not now, use basic mode')} loading={busy === 'no'} disabled={Boolean(busy)} onPress={() => choose(false)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, padding: 20, gap: space.md, backgroundColor: colors.surface, borderRadius: radius.cardLg, ...shadow.lifted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  facts: { gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.hair },
  fact: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.body },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  basic: { flexDirection: 'row', gap: space.sm, marginHorizontal: space.base, marginTop: space.base, padding: space.base, borderRadius: 16, backgroundColor: colors.goldSoft },
  basicText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.goldText },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hair },
});
