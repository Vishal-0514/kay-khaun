import { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { PressScale, rise, riseUp } from '../components/Motion';
import { ACHIEVEMENTS, earned, useKitchen } from '../lib/kitchen';
import { confirm } from '../lib/notify';
import { toast } from '../components/Toast';
import { dayLabel } from '../lib/dates';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// My Kitchen: everything you've cooked with Kya Khaun, your dish photos and
// your achievements. It all lives on this phone (lib/kitchen.js).
export default function MyKitchen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dishes = useKitchen((s) => s.dishes);
  const load = useKitchen((s) => s.load);
  const removeDish = useKitchen((s) => s.removeDish);
  useEffect(() => {
    load();
  }, [load]);

  const list = dishes ?? [];
  const got = new Set(earned(list).map((a) => a.id));
  const photos = list.filter((d) => d.photo).length;
  const bandHeight = 200 + insets.top;

  async function remove(dish) {
    const yes = await confirm(t('Remove this dish?'), t('{name} and its photo will be removed from My Kitchen.', { name: dish.name }), t('Remove'));
    if (!yes) return;
    await removeDish(dish.id);
    toast(t('Removed'), 'check');
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.sm }]}>
          <IconButton name="back" label={t('Back')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <Text style={styles.title} role="heading">
            {t('My Kitchen')}
          </Text>
        </View>
        <Text style={styles.sub}>{t('Dishes you cooked, and what you have achieved. Kept on this phone.')}</Text>
      </MaroonBand>

      <Animated.View entering={riseUp(0, 150)} style={[styles.stats, { marginTop: bandHeight - 56 }]}>
        {[
          [list.length, t('Dishes cooked')],
          [photos, t('Photos')],
          [`${got.size}/${ACHIEVEMENTS.length}`, t('Achievements')],
        ].map(([n, label]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statNum}>{n}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </Animated.View>

      <Text style={[type.head, styles.section]} role="heading">
        {t('Achievements')}
      </Text>
      <View style={styles.badges}>
        {ACHIEVEMENTS.map((a, i) => {
          const on = got.has(a.id);
          return (
            <Animated.View key={a.id} entering={rise(i, 250)} style={[styles.badge, !on && styles.badgeLocked]} aria-label={`${t(a.title)}: ${t(a.text)}${on ? '' : ` (${t('not yet')})`}`}>
              <View style={[styles.badgeIcon, on ? styles.badgeIconOn : null]}>
                <Icon name={on ? a.icon : 'lock'} size={20} color={on ? colors.maroon : colors.muted} />
              </View>
              <Text style={[styles.badgeTitle, !on && { color: colors.muted }]} numberOfLines={2}>
                {t(a.title)}
              </Text>
              <Text style={styles.badgeText} numberOfLines={2}>
                {t(a.text)}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      <Text style={[type.head, styles.section]} role="heading">
        {t('Your dishes')}
      </Text>
      {list.length ? (
        <View style={styles.grid}>
          {list.map((dish, i) => (
            <Animated.View key={dish.id} entering={rise(Math.min(i, 8), 300)} style={styles.cell}>
              <PressScale scaleTo={0.97} role="button" aria-label={`${dish.name}, ${dayLabel(dish.at)}. ${t('Long press to remove')}`} onLongPress={() => remove(dish)} style={styles.tile}>
                {dish.photo ? (
                  <Image source={{ uri: dish.photo }} style={styles.tilePhoto} />
                ) : (
                  <View style={[styles.tilePhoto, styles.noPhoto]}>
                    <Icon name="pot" size={34} color={colors.goldText} />
                  </View>
                )}
                <View style={styles.tileFoot}>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {dish.name}
                  </Text>
                  <Text style={styles.tileWhen}>{dayLabel(dish.at)}</Text>
                </View>
              </PressScale>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Icon name="pot" size={36} color={colors.goldText} />
          <Text style={styles.emptyTitle}>{t('Nothing cooked yet')}</Text>
          <Text style={styles.emptyText}>{t('Cook a recipe with Chatora, snap your dish at the end, and it shows up here.')}</Text>
          <Button title={t('Cook something')} icon={<Icon name="pot" size={18} color="#FFFFFF" />} onPress={() => router.push('/kitchen')} style={{ alignSelf: 'stretch', marginTop: space.base }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.base },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.cream },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted, marginHorizontal: space.lg, marginTop: space.md },
  stats: { marginHorizontal: space.base, flexDirection: 'row', paddingVertical: space.base, backgroundColor: colors.surface, borderRadius: radius.card, ...shadow.lifted },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  section: { marginHorizontal: space.lg, marginTop: space.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginHorizontal: space.base, marginTop: space.md },
  badge: { width: '31.5%', minHeight: 128, padding: space.md, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', ...shadow.card },
  badgeLocked: { backgroundColor: colors.soft, shadowOpacity: 0, elevation: 0 },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.hair, alignItems: 'center', justifyContent: 'center' },
  badgeIconOn: { backgroundColor: colors.gold },
  badgeTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.ink, textAlign: 'center', marginTop: space.sm },
  badgeText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.muted, textAlign: 'center', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginHorizontal: space.base, marginTop: space.md },
  cell: { width: '47.5%' },
  tile: { borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden', ...shadow.card },
  tilePhoto: { width: '100%', aspectRatio: 1 },
  noPhoto: { backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  tileFoot: { padding: space.md, gap: 2 },
  tileName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  tileWhen: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  empty: { marginHorizontal: space.base, marginTop: space.md, padding: space.lg, borderRadius: radius.card, backgroundColor: colors.surface, alignItems: 'center', ...shadow.card },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: space.sm },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
