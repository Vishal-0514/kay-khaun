import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon, { DietMark } from '../components/Icon';
import DishMeta, { isPlace } from '../components/DishMeta';
import { PressScale, TypingDots, rise } from '../components/Motion';
import { MEAL_KEYS, dayTotal, shownPick, usePlanStore } from '../store/usePlanStore';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const BUDGETS = [500, 800, 1200, 2000];
const MOODS = [
  ['balanced', 'Balanced'],
  ['light', 'Light'],
  ['comfort', 'Comfort'],
  ['spicy', 'Spicy'],
  ['street', 'Street'],
];
const MEAL_LOOK = {
  breakfast: { name: 'Breakfast', icon: 'spark' },
  lunch: { name: 'Lunch', icon: 'pot' },
  snack: { name: 'Snack', icon: 'sweet' },
  dinner: { name: 'Dinner', icon: 'moon' },
};
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;

function Chip({ label, on, onPress, disabled }) {
  return (
    <PressScale role="button" aria-selected={on} disabled={disabled} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </PressScale>
  );
}

function MealCard({ m, n, choice, onSwap, onOpen, loading }) {
  const pick = shownPick(m, choice);
  const look = MEAL_LOOK[m.meal];
  const swaps = m.options.length;
  return (
    <Animated.View entering={rise(n, 150)} style={styles.mealRow}>
      <View style={styles.rail}>
        <View style={styles.dot}>
          <Icon name={look.icon} size={16} color={colors.red} />
        </View>
        {n < 3 ? <View style={styles.line} /> : null}
      </View>
      <View style={{ flex: 1, gap: space.sm }}>
        <View style={styles.mealHead}>
          <Text style={styles.mealLabel}>{m.label}</Text>
          <Text style={styles.mealTime}>{m.time}</Text>
        </View>
        <View style={[styles.card, loading && { opacity: 0.5 }]}>
          {/* key = dish id, so a swap fades the new dish in. */}
          <PressScale scaleTo={0.98} role="button" aria-label={`Open ${pick.name}`} onPress={() => onOpen(pick)}>
          <Animated.View key={pick.id} entering={FadeIn.duration(260)} style={{ gap: 4 }}>
            <View style={styles.nameRow}>
              {isPlace(pick) ? null : <DietMark type={pick.diet === 'veg' ? 'veg' : 'nonveg'} />}
              <Text style={styles.name} numberOfLines={2}>
                {pick.name}
              </Text>
            </View>
            <Text style={type.small} numberOfLines={1}>
              {pick.restaurant}
              {pick.cuisine && pick.cuisine !== pick.restaurant ? ` · ${pick.cuisine}` : ''}
            </Text>
            <View style={{ marginTop: 2 }}>
              <DishMeta pick={pick} />
            </View>
          </Animated.View>
          </PressScale>
          {swaps ? (
            <PressScale scaleTo={0.92} role="button" aria-label={`Swap ${look.name.toLowerCase()}`} onPress={() => onSwap(m.meal)} hitSlop={6} style={styles.swap}>
              <Icon name="restart" size={15} color={colors.red} />
              <Text style={styles.swapText}>Swap</Text>
            </PressScale>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export default function Plan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.plan);
  const choice = usePlanStore((s) => s.choice);
  const loading = usePlanStore((s) => s.loading);
  const settings = usePlanStore((s) => s.settings);
  const make = usePlanStore((s) => s.make);
  const swap = usePlanStore((s) => s.swap);

  async function remake(changes) {
    try {
      await make(changes);
    } catch (err) {
      notify("Couldn't plan your day", errorMessage(err));
    }
  }

  // Home has already found where they are, so plan straight away.
  useEffect(() => {
    remake();
  }, []);

  function toggleMeal(key) {
    const on = settings.meals.includes(key);
    if (on && settings.meals.length === 1) return;
    const meals = MEAL_KEYS.filter((k) => (k === key ? !on : settings.meals.includes(k)));
    remake({ meals });
  }

  const total = dayTotal(plan, choice);
  const budget = plan?.budget ?? settings.budget;
  const over = total != null && budget && total > budget;
  const bandHeight = 150 + insets.top;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.base }]}>
            <IconButton name="back" label="Back" onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} role="heading">
                Plan my whole day
              </Text>
              <Text style={styles.subtitle}>Breakfast to dinner, within your budget</Text>
            </View>
          </View>
        </MaroonBand>

        <Animated.View entering={rise(0)} style={[styles.settings, { marginTop: bandHeight - 44 }]}>
          <Text style={type.label}>Day budget</Text>
          <View style={styles.chips}>
            {/* The budget from their taste profile joins the list in order. */}
            {[...new Set([...BUDGETS, ...(budget ? [budget] : [])])].sort((a, b) => a - b).map((b) => (
              <Chip key={b} label={rupees(b)} on={budget === b} disabled={loading} onPress={() => remake({ budget: b })} />
            ))}
          </View>
          <Text style={[type.label, { marginTop: space.base }]}>Mood of the day</Text>
          <View style={styles.chips}>
            {MOODS.map(([key, label]) => (
              <Chip key={key} label={label} on={settings.mood === key} disabled={loading} onPress={() => remake({ mood: key })} />
            ))}
          </View>
          <Text style={[type.label, { marginTop: space.base }]}>Meals</Text>
          <View style={styles.chips}>
            {MEAL_KEYS.map((key) => (
              <Chip key={key} label={MEAL_LOOK[key].name} on={settings.meals.includes(key)} disabled={loading} onPress={() => toggleMeal(key)} />
            ))}
          </View>
        </Animated.View>

        <View style={styles.noteRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>K</Text>
          </View>
          {loading || !plan ? (
            <View style={styles.typing} aria-label="Chatora is planning">
              <TypingDots color={colors.red} />
            </View>
          ) : (
            <Animated.Text key={plan.note} entering={FadeIn.duration(300)} style={styles.note}>
              {plan.note}
            </Animated.Text>
          )}
        </View>

        <View style={styles.timeline}>
          {plan?.meals.map((m, n) => (
            <MealCard key={m.meal} m={m} n={n} choice={choice} loading={loading} onSwap={swap} onOpen={(p) => router.push(`/dish/${p.id}`)} />
          ))}
        </View>
      </ScrollView>

      {plan?.meals.length ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          {total != null ? (
            <>
              <View style={styles.barTop}>
                <Text style={styles.barLabel}>Day total</Text>
                <Text style={[styles.barTotal, over && { color: colors.red }]}>
                  {rupees(total)} <Text style={styles.barOf}>of {rupees(budget)}</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, (total / budget) * 100)}%`, backgroundColor: over ? colors.red : colors.green }]} />
              </View>
              <Text style={[styles.barNote, over && { color: colors.red }]}>
                {over ? `${rupees(total - budget)} over — swap a meal to bring it down` : `${rupees(budget - total)} left for chai and extras`}
              </Text>
            </>
          ) : (
            <Text style={styles.barNote}>Tap a meal to see it and order on Zomato or Swiggy. Prices are on their menus.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  settings: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, ...shadow.lifted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.gold },
  noteRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', marginHorizontal: space.lg, marginTop: space.lg },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.maroon, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 18, color: colors.gold },
  note: { flex: 1, ...type.body, color: colors.ink },
  typing: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderTopLeftRadius: 4, backgroundColor: colors.surface, ...shadow.card },
  timeline: { marginHorizontal: space.lg, marginTop: space.lg },
  mealRow: { flexDirection: 'row', gap: space.md },
  rail: { width: 32, alignItems: 'center' },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: colors.hair },
  mealHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 6 },
  mealLabel: { ...type.head, color: colors.ink },
  mealTime: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, marginBottom: space.lg, ...shadow.card },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 72 },
  name: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink, flexShrink: 1 },
  swap: { position: 'absolute', top: space.md, right: space.md, height: 30, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.redSoft, flexDirection: 'row', alignItems: 'center', gap: 4 },
  swapText: { fontFamily: fonts.bold, fontSize: 12, color: colors.red },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.base, gap: 6, ...shadow.lifted },
  barTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  barLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  barTotal: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.ink },
  barOf: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.soft, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  barNote: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
});
