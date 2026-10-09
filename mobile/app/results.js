import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon, { DietMark } from '../components/Icon';
import PlateRing from '../components/PlateRing';
import Button from '../components/Button';
import Animated from 'react-native-reanimated';
import { PressScale, rise, riseUp } from '../components/Motion';
import { useChatStore } from '../store/useChatStore';
import DishMeta, { isPlace, shortPrice, SampleTag } from '../components/DishMeta';
import { ORDER_APPS, openOrderApp } from '../lib/orderLinks';
import HeartButton from '../components/HeartButton';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

const MOOD_TITLE = { spicy: 'Spicy', comfort: 'Comfort', light: 'Light', street: 'Street', sweet: 'Sweet' };

function subtitleFor(source, slip) {
  if (source?.kind === 'mood') return t('{mood} picks near you', { mood: t(MOOD_TITLE[source.label]) });
  if (source?.kind === 'pick') return t('Based on your taste profile');
  if (source?.kind === 'occasion') return t('{name} near you', { name: source.label });
  if (!slip) return t('Order in');
  return [slip.craving, slip.budget && t('under ₹{n}', { n: slip.budget }), slip.time && t('{n} min', { n: slip.time })].filter(Boolean).join(' · ');
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function Results() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const picks = useChatStore((s) => s.picks);
  const source = useChatStore((s) => s.picksSource);
  const slip = useChatStore((s) => s.conversation?.slip);
  const bandHeight = 236 + insets.top;
  const [top, ...rest] = picks;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label={t("Back")} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              {t('Top {n} for you', { n: picks.length || 5 })}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitleFor(source, slip)}
            </Text>
          </View>
          <Pressable role="button" aria-label={t('Change what you asked for')} onPress={() => router.push('/chat')} hitSlop={8}>
            <Text style={styles.edit}>{t("Edit")}</Text>
          </Pressable>
        </View>
        <View style={styles.segment}>
          <View style={[styles.segItem, styles.segOn]}>
            <Icon name="bag" size={16} color={colors.maroon} />
            <Text style={[styles.segText, { color: colors.maroon, fontFamily: fonts.bold }]}>{t("Order in")}</Text>
          </View>
          <PressScale role="button" style={styles.segItem} onPress={() => router.push('/kitchen')}>
            <Icon name="pot" size={16} color={colors.cream} />
            <Text style={styles.segText}>{t("Cook at home")}</Text>
          </PressScale>
        </View>
      </MaroonBand>

      {!top ? (
        <Animated.View entering={riseUp(0, 150)} style={[styles.card, { marginTop: bandHeight - 84, alignItems: 'center' }]}>
          <Text style={type.head} role="heading">{t("Nothing to show yet")}</Text>
          <Text style={[type.small, { marginTop: space.sm, textAlign: 'center' }]}>{t("Tell Chatora what you feel like, and your picks will appear here.")}</Text>
          <Button title={t("Ask Chatora")} onPress={() => router.replace('/chat')} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={riseUp(0, 150)} style={[styles.card, { marginTop: bandHeight - 84 }]}>
            <View style={styles.topRow}>
              <PlateRing size={84} value={top.match / 100}>
                <Text style={styles.match}>{top.match}</Text>
                <Text style={styles.matchLabel}>{t("% match")}</Text>
              </PlateRing>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Icon name="spark" size={12} color={colors.gold} />
                    <Text style={styles.badgeText}>{t("Chatora's pick")}</Text>
                  </View>
                  {top.source === 'sample' ? <SampleTag /> : null}
                </View>
                <View style={styles.nameRow}>
                  {isPlace(top) ? null : <DietMark type={top.diet === 'veg' ? 'veg' : 'nonveg'} />}
                  <Text style={styles.name}>{top.name}</Text>
                </View>
                <Text style={type.small}>
                  {top.restaurant}, {top.area}
                </Text>
              </View>
            </View>
            <View style={styles.stats}>
              {isPlace(top) ? (
                <>
                  <Stat label={t("Rating")} value={top.rating ? `${top.rating.toFixed(1)} ★` : '—'} />
                  <Stat label={t("Distance")} value={t('{n} km', { n: top.distanceKm })} />
                  <Stat label={t("For one")} value={shortPrice(top.priceLabel) ?? '—'} />
                </>
              ) : (
                <>
                  {top.people > 1 ? <Stat label={t('For {n} (₹{price} each)', { n: top.people, price: top.price })} value={`₹${top.groupPrice}`} /> : <Stat label={t("Price")} value={`₹${top.price}`} />}
                  <Stat label={t("Arrives in")} value={t('{n} min', { n: top.eta })} />
                  <Stat label={t("Rating")} value={`${top.rating} ★`} />
                </>
              )}
            </View>
            <Text style={styles.reason}>{top.reasons.map((r) => r.text).slice(0, 2).join('. ')}.</Text>
            <View style={styles.actions}>
              {isPlace(top) ? (
                Object.entries(ORDER_APPS).map(([app, a]) => (
                  <Button key={app} variant="outline" title={t(a.label)} onPress={() => openOrderApp(top, app)} style={{ flex: 1 }} />
                ))
              ) : (
                <Button title={t("See details")} onPress={() => router.push(`/dish/${top.id}`)} style={{ flex: 1 }} />
              )}
              <HeartButton pick={top} />
            </View>
          </Animated.View>

          {rest.length ? (
            <>
              <Animated.Text entering={rise(0, 350)} style={[type.head, styles.also]}>
                {t("Also good")}
              </Animated.Text>
              <View style={styles.list}>
                {rest.map((p, i) => (
                  <Animated.View key={p.id} entering={rise(i, 420)}>
                  <PressScale scaleTo={0.98} role="button" onPress={() => router.push(`/dish/${p.id}`)} style={styles.row}>
                    <View style={styles.rank}>
                      <Text style={styles.rankText}>{i + 2}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.nameRow}>
                        {isPlace(p) ? null : <DietMark type={p.diet === 'veg' ? 'veg' : 'nonveg'} />}
                        <Text style={styles.rowName} numberOfLines={1}>
                          {p.name}
                        </Text>
                      </View>
                      <Text style={type.small} numberOfLines={1}>
                        {isPlace(p) ? `${p.restaurant} · ${t('{n} km', { n: p.distanceKm })}` : `${p.restaurant} · ${t('{n} min', { n: p.eta })}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.rowPrice}>{isPlace(p) ? (p.rating ? `★ ${p.rating.toFixed(1)}` : shortPrice(p.priceLabel) ?? '') : `₹${p.price}`}</Text>
                      <Text style={styles.rowMatch}>{p.match}% match</Text>
                    </View>
                  </PressScale>
                  </Animated.View>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  edit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold, textDecorationLine: 'underline' },
  segment: { flexDirection: 'row', gap: 4, marginHorizontal: space.lg, marginTop: space.base, height: 44, padding: 4, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  segItem: { flex: 1, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segOn: { backgroundColor: colors.gold },
  segText: { fontFamily: fonts.medium, fontSize: 14, color: colors.cream },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, ...shadow.lifted },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  match: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.ink },
  matchLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  badge: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.maroon, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.gold },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...type.head, color: colors.ink, flex: 1 },
  stats: { flexDirection: 'row', marginTop: space.base, paddingVertical: space.md, borderRadius: 14, backgroundColor: colors.soft },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  statValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  reason: { marginTop: space.md, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.body },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.base },
  also: { marginHorizontal: space.lg, marginTop: space.lg },
  list: { marginHorizontal: 20, marginTop: space.xs },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingHorizontal: 4 },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.display, fontSize: 16, color: colors.goldText },
  rowName: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowPrice: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowMatch: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
});
