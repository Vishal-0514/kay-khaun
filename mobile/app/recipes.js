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
import { useCookStore } from '../store/useCookStore';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// What you can cook with what you have. Design: V5Recipes.
const missingText = (r) => (r.missing.length ? t('Missing: {list}', { list: r.missing.map((m) => t(m.label).toLowerCase()).join(', ') }) : t('You have everything'));

export default function Recipes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recipes = useCookStore((s) => s.recipes);
  const kitchen = useCookStore((s) => s.kitchen);
  const count = kitchen.filter((k) => k.sure !== false).length;
  const [best, ...more] = recipes;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xl }}>
      <View style={styles.header}>
        <IconButton name="back" label={t("Back")} onPress={back} />
        <View style={{ flex: 1 }}>
          <Text style={type.title} role="heading">
            {t("Cook at home")}
          </Text>
          <Text style={styles.sub}>
            {t(count === 1 ? 'Using {n} thing from your kitchen' : 'Using {n} things from your kitchen', { n: count })}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/kitchen')} hitSlop={8}>
          <Text style={styles.edit}>{t("Edit")}</Text>
        </Pressable>
      </View>

      {!best ? (
        <Animated.View entering={riseUp(0, 100)} style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="basket" size={28} color={colors.goldText} />
          </View>
          <Text style={[type.head, { textAlign: 'center' }]}>{t("Nothing to cook with that yet")}</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>{t("Add a few more things you have — even onion, tomato or rice open up lots of recipes.")}</Text>
          <Button title={t("Add ingredients")} onPress={() => router.push('/kitchen')} style={{ alignSelf: 'stretch', marginTop: space.sm }} />
          <Button title={t("Order in instead")} variant="link" onPress={() => router.push('/chat')} />
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={riseUp(0, 120)}>
          <PressScale scaleTo={0.98} role="button" onPress={() => router.push(`/recipe/${best.id}`)} style={styles.heroWrap}>
            <MaroonBand height={268} rounded={false} style={styles.hero}>
              <View style={styles.heroRing}>
                <PlateRing size={96} value={best.have / best.total} dark>
                  <Text style={styles.ringValue}>
                    {best.have}/{best.total}
                  </Text>
                  <Text style={styles.ringLabel}>{t("you have")}</Text>
                </PlateRing>
              </View>
              <View style={styles.heroText}>
                <View style={styles.badge}>
                  <Icon name="spark" size={12} color={colors.maroon} />
                  <Text style={styles.badgeText}>{t("Best match")}</Text>
                </View>
                <Text style={styles.heroName} numberOfLines={2}>
                  {best.name}
                </Text>
                <Text style={styles.heroMeta}>
                  {t('{n} min', { n: best.time })} · {t(best.level)} · {t('Serves {n}', { n: best.serves })}
                </Text>
                <Text style={styles.heroReason} numberOfLines={2}>
                  {best.missing.length ? missingText(best) : best.reason}
                </Text>
              </View>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>{t("See recipe")}</Text>
                <Icon name="arrow" size={18} color={colors.maroon} />
              </View>
            </MaroonBand>
          </PressScale>
          </Animated.View>

          {more.length ? (
            <>
              <Animated.Text entering={rise(0, 320)} style={[type.head, styles.moreTitle]}>
                {t("More you can make")}
              </Animated.Text>
              <View style={styles.list}>
                {more.map((r, i) => (
                  <Animated.View key={r.id} entering={rise(i, 380)}>
                  <PressScale scaleTo={0.98} role="button" onPress={() => router.push(`/recipe/${r.id}`)} style={styles.row}>
                    <PlateRing size={52} value={r.have / r.total}>
                      <Text style={styles.rowRing}>
                        {r.have}/{r.total}
                      </Text>
                    </PlateRing>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.nameRow}>
                        <DietMark type={r.diet === 'veg' ? 'veg' : 'nonveg'} />
                        <Text style={styles.rowName} numberOfLines={1}>
                          {r.name}
                        </Text>
                      </View>
                      <Text style={styles.rowMeta}>
                        {t('{n} min', { n: r.time })} · {t(r.level)}
                      </Text>
                      <Text style={[styles.rowStatus, { color: r.missing.length ? colors.goldText : colors.green }]} numberOfLines={1}>
                        {missingText(r)}
                      </Text>
                    </View>
                    <Icon name="chevron" color={colors.muted} />
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
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  edit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  heroWrap: { marginHorizontal: space.base, marginTop: space.lg, borderRadius: radius.cardLg, ...shadow.lifted },
  hero: { position: 'relative', borderRadius: radius.cardLg },
  heroRing: { position: 'absolute', right: 18, top: 22 },
  ringValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: colors.cream },
  ringLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.creamMuted },
  heroText: { position: 'absolute', left: space.lg, right: 130, top: space.lg },
  badge: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.gold, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.maroon },
  heroName: { marginTop: space.md, fontFamily: fonts.display, fontSize: 28, lineHeight: 31, color: colors.cream },
  heroMeta: { marginTop: space.xs, fontFamily: fonts.regular, fontSize: 14, color: colors.creamMuted },
  heroReason: { marginTop: space.sm, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.gold },
  heroCta: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, height: 52, borderRadius: radius.button, backgroundColor: colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  heroCtaText: { fontFamily: fonts.bold, fontSize: 16, color: colors.maroon },
  moreTitle: { marginHorizontal: space.lg, marginTop: space.lg },
  list: { marginHorizontal: space.lg, marginTop: space.xs },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: space.base, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rowRing: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  rowStatus: { fontFamily: fonts.bold, fontSize: 12 },
  empty: { marginHorizontal: space.lg, marginTop: space.xxl, alignItems: 'center', gap: space.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
