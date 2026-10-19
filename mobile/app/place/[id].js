import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import HeartButton from '../../components/HeartButton';
import PlaceFacts from '../../components/PlaceFacts';
import { rise, riseUp } from '../../components/Motion';
import { useChatStore } from '../../store/useChatStore';
import { meDish, useMeStore } from '../../store/useMeStore';
import { openDirections, openInGoogleMaps } from '../../lib/directions';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';
import { t } from '../../lib/i18n';

// One place to go out to: what it is, how long the drive is right now, why it
// fits, and Directions. Opened from Go Out, Saved or History.

const TILE = {
  spark: ['#FCF1DA', colors.goldText],
  route: ['#E8EEF7', '#3A5A8C'],
  star: ['#FCF1DA', colors.goldText],
  clock: ['#FCEBD0', '#A8670F'],
  rupee: ['#E3F2E7', colors.green],
  cloud: ['#E8EEF7', '#3A5A8C'],
  sun: ['#FCEBD0', '#A8670F'],
};

export default function Place() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const fromChat = useChatStore((s) => s.outings.find((p) => p.id === id));
  const fromMe = useMeStore((s) => meDish(s, id));
  const place = fromChat ?? fromMe;
  const track = useMeStore((s) => s.track);
  const bandHeight = 210 + insets.top;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  // Opening a place is a small sign of interest, for taste learning.
  useEffect(() => {
    if (place) track('opened', place);
  }, [place?.id]);

  if (!place) {
    return (
      <View style={[styles.root, styles.center, { padding: space.lg }]}>
        <Text style={type.head} role="heading">{t("This place isn't available any more")}</Text>
        <Button title={t('Back')} onPress={back} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.base }]}>
            <IconButton name="back" label={t('Back')} onDark onPress={back} />
            <HeartButton pick={place} onDark />
          </View>
          <View style={styles.hero}>
            <Text style={styles.kind}>{[place.restaurant, place.area].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.name} role="heading">
              {place.name}
            </Text>
            <PlaceFacts place={place} light />
          </View>
        </MaroonBand>

        <Animated.View entering={riseUp(0, 150)} style={[styles.card, { marginTop: space.base }]}>
          <Text style={type.label}>{place.reasons?.length ? t('Why it fits') : t('About this place')}</Text>
          {(place.reasons?.length ? place.reasons : [{ icon: 'route', text: t('{n} km from where you searched', { n: place.distanceKm }) }]).map((r, i) => {
            const [tint, ink] = TILE[r.icon] ?? TILE.spark;
            return (
              <Animated.View key={i} entering={rise(i, 250)} style={styles.reason}>
                <View style={[styles.tile, { backgroundColor: tint }]}>
                  <Icon name={r.icon} size={18} color={ink} strokeWidth={1.9} />
                </View>
                <Text style={styles.reasonText}>{r.text}</Text>
              </Animated.View>
            );
          })}
          <Text style={styles.note}>{t('Ratings, hours and drive times come from Google. Check the place before you go.')}</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={t('Directions')} icon={<Icon name="route" size={18} color="#FFFFFF" />} onPress={() => openDirections(place)} style={{ flex: 1 }} />
        <Button variant="outline" title={t('Google Maps')} onPress={() => openInGoogleMaps(place)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  hero: { paddingHorizontal: space.lg, marginTop: space.base, gap: 6 },
  kind: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.cream },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, gap: space.md, ...shadow.card },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reasonText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
  note: { ...type.small, fontSize: 12 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: space.sm, paddingHorizontal: space.base, paddingTop: space.md, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.hair },
});
