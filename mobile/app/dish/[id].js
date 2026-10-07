import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon, { DietMark } from '../../components/Icon';
import PlateRing from '../../components/PlateRing';
import Button from '../../components/Button';
import Animated from 'react-native-reanimated';
import { appear, rise, riseUp } from '../../components/Motion';
import { useChatStore } from '../../store/useChatStore';
import { isPlace, shortPrice } from '../../components/DishMeta';
import { ORDER_APPS, openOrderApp } from '../../lib/orderLinks';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';

// Each reason gets its own soft colour tile (design: V5 "Why I picked this").
const TILE = {
  flame: ['#FDE3E1', colors.red],
  bowl: ['#FDE8D6', '#B8501A'],
  rupee: ['#E3F2E7', colors.green],
  clock: ['#FCEBD0', '#A8670F'],
  heart: ['#FBE4EC', '#A92E5A'],
  star: ['#FCF1DA', colors.goldText],
  spark: ['#FCF1DA', colors.goldText],
  route: ['#E8EEF7', '#3A5A8C'],
};

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function Dish() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const dish = useChatStore((s) => s.picks.find((p) => p.id === id));
  const [saved, setSaved] = useState(false);
  const bandHeight = 404 + insets.top;
  const place = isPlace(dish);

  if (!dish) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', padding: space.lg }]}>
        <Text style={type.head}>This pick isn't available any more</Text>
        <Button title="Back to Home" onPress={() => router.replace('/home')} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.base }]}>
            <IconButton name="back" label="Back" onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <IconButton name="heart" label={saved ? 'Saved' : 'Save'} onDark onPress={() => setSaved((v) => !v)} />
          </View>
          <Animated.View entering={appear(0, 100)} style={styles.hero}>
            <PlateRing size={196} value={dish.match / 100} dark ticks>
              <Text style={styles.bigMatch}>
                {dish.match}
                <Text style={styles.bigPercent}>%</Text>
              </Text>
              <Text style={styles.bigLabel}>match for you</Text>
            </PlateRing>
            <View style={styles.nameRow}>
              {place ? null : <DietMark type={dish.diet === 'veg' ? 'veg' : 'nonveg'} size={16} />}
              <Text style={styles.name} role="heading">
                {dish.name}
              </Text>
            </View>
            <Text style={styles.place}>
              {dish.restaurant} · {dish.area}
            </Text>
          </Animated.View>
        </MaroonBand>

        <Animated.View entering={riseUp(0, 300)} style={[styles.stats, { marginTop: bandHeight - 36 }]}>
          {place ? (
            <>
              <Stat label="Google rating" value={dish.rating ? `${dish.rating.toFixed(1)} ★` : '—'} />
              <Stat label="Distance" value={`${dish.distanceKm} km`} />
              <Stat label="For one" value={shortPrice(dish.priceLabel) ?? '—'} />
            </>
          ) : (
            <>
              <Stat label="Price" value={`₹${dish.price}`} />
              <Stat label="Arrives in" value={`${dish.eta} min`} />
              <Stat label="Rating" value={`${dish.rating} ★`} />
            </>
          )}
        </Animated.View>

        {place && dish.ideas?.length ? (
          <Animated.View entering={rise(0, 380)} style={styles.ideas}>
            <Text style={type.head}>Try here</Text>
            <View style={styles.ideaRow}>
              {dish.ideas.map((idea) => (
                <View key={idea} style={styles.idea}>
                  <Text style={styles.ideaText}>{idea}</Text>
                </View>
              ))}
            </View>
            <Text style={type.small}>Popular at places like this. Check today's menu and prices on Zomato or Swiggy.</Text>
          </Animated.View>
        ) : null}

        <View style={styles.why}>
          <Text style={type.head}>Why I picked this</Text>
          {dish.reasons.map((r, i) => {
            const [tint, ink] = TILE[r.icon] ?? TILE.spark;
            return (
              <Animated.View key={r.text} entering={rise(i, 450)} style={styles.reason}>
                <View style={[styles.tile, { backgroundColor: tint }]}>
                  <Icon name={r.icon} size={20} color={ink} strokeWidth={1.9} />
                </View>
                <Text style={styles.reasonText}>{r.text}</Text>
              </Animated.View>
            );
          })}
          {place ? null : (
            <View style={styles.reason}>
              <View style={[styles.tile, { backgroundColor: colors.soft }]}>
                <Icon name="route" size={20} color={colors.muted} strokeWidth={1.9} />
              </View>
              <Text style={styles.reasonText}>
                {dish.distanceKm} km away · {dish.cuisine} · {dish.spiceLabel} · sample dish
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Kya Khaun suggests; they order on Zomato or Swiggy. */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={styles.barTitle}>Order from {place ? dish.name : 'a delivery app'}</Text>
        <View style={styles.barButtons}>
          {Object.entries(ORDER_APPS).map(([app, a]) => (
            <Button
              key={app}
              title={a.label}
              icon={<Icon name="external" size={18} color="#FFFFFF" />}
              onPress={() => openOrderApp(dish, app)}
              style={[styles.orderBtn, { backgroundColor: a.color, shadowColor: a.color }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  hero: { alignItems: 'center', marginTop: space.sm },
  bigMatch: { fontFamily: fonts.display, fontSize: 58, lineHeight: 62, color: colors.cream },
  bigPercent: { fontSize: 24, color: colors.gold },
  bigLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.creamMuted },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm, paddingHorizontal: space.lg },
  name: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: colors.cream, textAlign: 'center', flexShrink: 1 },
  place: { fontFamily: fonts.regular, fontSize: 14, color: colors.creamMuted, marginTop: 2 },
  stats: { marginHorizontal: space.base, flexDirection: 'row', paddingVertical: space.base, backgroundColor: colors.surface, borderRadius: radius.card, ...shadow.lifted },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  why: { marginHorizontal: space.lg, marginTop: space.lg, gap: 6 },
  reason: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reasonText: { ...type.body, color: colors.ink, flex: 1 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hair },
  barTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, marginBottom: space.sm },
  barButtons: { flexDirection: 'row', gap: space.sm },
  orderBtn: { flex: 1 },
  ideas: { marginHorizontal: space.lg, marginTop: space.lg, gap: space.sm },
  ideaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  idea: { paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.goldSoft },
  ideaText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.goldText },
  barPrice: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
});
