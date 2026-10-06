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
import { notify } from '../../lib/notify';
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
              <DietMark type={dish.diet === 'veg' ? 'veg' : 'nonveg'} size={16} />
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
          <Stat label="Price" value={`₹${dish.price}`} />
          <Stat label="Arrives in" value={`${dish.eta} min`} />
          <Stat label="Rating" value={`${dish.rating} ★`} />
        </Animated.View>

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
          <View style={styles.reason}>
            <View style={[styles.tile, { backgroundColor: colors.soft }]}>
              <Icon name="route" size={20} color={colors.muted} strokeWidth={1.9} />
            </View>
            <Text style={styles.reasonText}>
              {dish.distanceKm} km away · {dish.cuisine} · {dish.spiceLabel}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barPrice}>₹{dish.price}</Text>
          <Text style={type.small} numberOfLines={1}>
            {dish.restaurant}
          </Text>
        </View>
        <Button
          title="Order on partner app"
          icon={<Icon name="external" size={18} color="#FFFFFF" />}
          onPress={() => notify('Ordering partners', `Direct ordering arrives in a later phase. For now, search "${dish.restaurant}" in your food delivery app.`)}
        />
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
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: space.base, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hair },
  barPrice: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
});
