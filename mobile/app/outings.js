import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import HeartButton from '../components/HeartButton';
import { PressScale, rise, riseUp } from '../components/Motion';
import { useChatStore } from '../store/useChatStore';
import PlaceFacts from '../components/PlaceFacts';
import { openDirections } from '../lib/directions';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// Go Out: the 3–4 places Chatora found, each with drive time now, why it fits
// and a Directions button.

export default function Outings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const places = useChatStore((s) => s.outings);
  const plan = useChatStore((s) => s.conversation?.slip?.outing);
  const bandHeight = 150 + insets.top;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label={t('Back')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              {t('Places to go')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {plan ? t('{plan} near you', { plan }) : t('Near you, with drive time now')}
            </Text>
          </View>
        </View>
      </MaroonBand>

      <View style={[styles.list, { marginTop: bandHeight - 48 }]}>
        {!places.length ? (
          <Animated.View entering={riseUp(0, 150)} style={[styles.card, { alignItems: 'center' }]}>
            <Text style={type.head} role="heading">{t('No places yet')}</Text>
            <Text style={[type.small, { marginTop: space.sm, textAlign: 'center' }]}>{t('Tell Chatora you want to go out, and places near you will appear here.')}</Text>
            <Button title={t('Ask Chatora')} onPress={() => router.replace('/chat')} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
          </Animated.View>
        ) : (
          places.map((p, i) => {
            // Chatora's own line, or a weather note; the facts row already says the rest.
            const why = p.reasons?.find((r) => r.icon === 'spark') ?? p.reasons?.find((r) => r.icon === 'cloud' || r.icon === 'sun');
            return (
              <Animated.View key={p.id} entering={i === 0 ? riseUp(0, 150) : rise(i, 250)} style={styles.card}>
                <PressScale scaleTo={0.98} role="button" aria-label={t('Open {name}', { name: p.name })} onPress={() => router.push(`/place/${encodeURIComponent(p.id)}`)} style={{ gap: 6 }}>
                  <View style={styles.topRow}>
                    <View style={[styles.rank, i === 0 && styles.rankTop]}>
                      <Text style={[styles.rankText, i === 0 && { color: colors.gold }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.name} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={type.small} numberOfLines={1}>
                        {[p.restaurant, p.area].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                  <PlaceFacts place={p} />
                  {why ? (
                    <View style={styles.why}>
                      <Icon name={why.icon} size={14} color={colors.goldText} />
                      <Text style={styles.whyText}>{why.text}</Text>
                    </View>
                  ) : null}
                </PressScale>
                <View style={styles.actions}>
                  <Button title={t('Directions')} icon={<Icon name="route" size={18} color="#FFFFFF" />} onPress={() => openDirections(p)} style={{ flex: 1 }} />
                  <HeartButton pick={p} />
                </View>
              </Animated.View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  list: { gap: space.md, marginHorizontal: space.base },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, gap: space.md, ...shadow.card },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  rankTop: { backgroundColor: colors.maroon },
  rankText: { fontFamily: fonts.display, fontSize: 16, color: colors.goldText },
  name: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  why: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: colors.goldSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  whyText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.body },
  actions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
});
