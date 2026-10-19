import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { PressScale, rise, riseUp } from '../components/Motion';
import { SONG_LANGUAGES, useSongStore } from '../store/useSongStore';
import { errorMessage } from '../lib/api';
import { openLink } from '../lib/safeLink';
import { notify } from '../lib/notify';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// Songs for this moment: 3–4 real songs (checked against Apple's catalogue),
// each opening in Spotify, YouTube Music or Apple Music. Nothing plays here.

const APPS = [
  ['spotify', 'Spotify'],
  ['youtubeMusic', 'YouTube Music'],
  ['apple', 'Apple Music'],
];

async function open(url, app) {
  tap();
  try {
    await openLink(url);
  } catch {
    notify(t("Couldn't open {app}", { app }), t('Search for the song in {app}.', { app }));
  }
}

export default function Songs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { moment, songs, language, again } = useSongStore();
  const [busy, setBusy] = useState(null); // language being loaded
  const bandHeight = 190 + insets.top;

  async function retry(lang) {
    tap();
    setBusy(lang);
    try {
      const data = await again(lang);
      if (data?.unusable) notify(t('No songs this time'), data.message);
    } catch (err) {
      notify(t("Couldn't pick songs"), errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label={t('Back')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              {t('Songs for this moment')}
            </Text>
            {moment ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {moment}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.langs} role="radiogroup" aria-label={t('Song language')}>
          {SONG_LANGUAGES.map((l) => (
            <PressScale key={l.id} role="radio" aria-checked={language === l.id} disabled={Boolean(busy)} onPress={() => language !== l.id && retry(l.id)} style={[styles.lang, language === l.id && styles.langOn]}>
              <Text style={[styles.langText, language === l.id && styles.langTextOn]}>{busy === l.id ? t('Loading…') : l.id === 'hindi' ? l.label : t(l.label)}</Text>
            </PressScale>
          ))}
        </View>
      </MaroonBand>

      <View style={[styles.list, { marginTop: bandHeight - 40 }]}>
        {!songs.length ? (
          <Animated.View entering={riseUp(0, 150)} style={[styles.card, { alignItems: 'center' }]}>
            <Text style={type.head} role="heading">{t('No songs yet')}</Text>
            <Text style={[type.small, { textAlign: 'center' }]}>{t('Snap your food and Chatora will pick songs for the moment.')}</Text>
            <Button title={t('Snap my food')} onPress={() => router.replace({ pathname: '/snap', params: { mode: 'food' } })} style={{ alignSelf: 'stretch' }} />
          </Animated.View>
        ) : (
          songs.map((s, i) => (
            <Animated.View key={`${s.title}-${s.artist}`} entering={i === 0 ? riseUp(0, 150) : rise(i, 250)} style={styles.card}>
              <View style={styles.songRow}>
                {s.artwork ? (
                  <Image source={{ uri: s.artwork }} style={styles.art} aria-label={t('Cover of {title}', { title: s.title })} />
                ) : (
                  <View style={[styles.art, styles.artEmpty]}>
                    <Icon name="music" size={22} color={colors.gold} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.songTitle} numberOfLines={2}>
                    {s.title}
                  </Text>
                  <Text style={type.small} numberOfLines={1}>
                    {[s.artist, s.year].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.reason}>{s.reason}</Text>
              <View style={styles.apps}>
                {APPS.filter(([key]) => s.links?.[key]).map(([key, label]) => (
                  <PressScale key={key} role="link" aria-label={t('Open {title} in {app}', { title: s.title, app: label })} onPress={() => open(s.links[key], label)} style={styles.app}>
                    <Icon name="play" size={12} color={colors.ink} />
                    <Text style={styles.appText}>{label}</Text>
                  </PressScale>
                ))}
              </View>
            </Animated.View>
          ))
        )}

        {songs.length ? (
          <>
            <Button variant="outline" title={busy === language ? t('Picking…') : t('Try other songs')} loading={busy === language} onPress={() => retry(language)} />
            <Text style={styles.note}>{t("Songs open in your music app. Kya Khaun isn't linked to Spotify, YouTube Music or Apple Music.")}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.creamMuted },
  langs: { flexDirection: 'row', gap: 4, marginHorizontal: space.lg, marginTop: space.base, padding: 4, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  lang: { flex: 1, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  langOn: { backgroundColor: colors.gold },
  langText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  langTextOn: { color: colors.maroonDeep },
  list: { gap: space.md, marginHorizontal: space.base },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, gap: space.md, ...shadow.card },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  art: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.soft },
  artEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.maroon },
  songTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  reason: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.body },
  apps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  app: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface },
  appText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  note: { ...type.small, fontSize: 12, textAlign: 'center' },
});
