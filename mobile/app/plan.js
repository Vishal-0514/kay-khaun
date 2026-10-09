import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon, { DietMark } from '../components/Icon';
import DishMeta, { isPlace } from '../components/DishMeta';
import { PressScale, TypingDots, rise } from '../components/Motion';
import { toast } from '../components/Toast';
import { MEAL_KEYS, dayTotal, shownPick, usePlanStore } from '../store/usePlanStore';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { planMessage, shareText } from '../lib/share';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';
import Tip from '../components/Tip';
import { useAuthStore } from '../store/useAuthStore';
import { ReportLink } from '../components/ReportSheet';
import { press, success, tap } from '../lib/haptics';

const BUDGETS = [500, 800, 1200, 2000];
const PEOPLE = [1, 2, 3, 4, 5, 6];
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

// One meal: the dish to order, or — after "cook it at home" — its home recipe.
function MealCard({ m, n, last, choice, cooking, loading, onSwap, onCook, onOpen, onRecipe }) {
  const pick = shownPick(m, choice);
  const look = MEAL_LOOK[m.meal];
  const home = pick.home;
  const atHome = cooking && home;
  return (
    <Animated.View entering={rise(n, 150)} style={styles.mealRow}>
      <View style={styles.rail}>
        <View style={[styles.dot, atHome && { backgroundColor: colors.goldSoft }]}>
          <Icon name={atHome ? 'pot' : look.icon} size={16} color={atHome ? colors.goldText : colors.red} />
        </View>
        {last ? null : <View style={styles.line} />}
      </View>
      <View style={{ flex: 1, gap: space.sm }}>
        <View style={styles.mealHead}>
          <Text style={styles.mealLabel}>{t(m.label)}</Text>
          <Text style={styles.mealTime}>{m.time}</Text>
        </View>
        <View style={[styles.card, atHome && styles.cardHome, loading && { opacity: 0.5 }]}>
          {/* key = what's showing, so a swap or a switch to cooking fades in. */}
          {atHome ? (
            <PressScale scaleTo={0.98} role="button" aria-label={t('Open recipe {name}', { name: home.name })} onPress={() => onRecipe(home)}>
              <Animated.View key={`home-${home.id}`} entering={FadeIn.duration(260)} style={{ gap: 4 }}>
                <Text style={styles.homeTag}>{t("Cook at home")}</Text>
                <Text style={[styles.name, styles.nameWithSwap]} numberOfLines={2}>
                  {home.name}
                </Text>
                <Text style={type.small}>
                  {t('{n} min · {level} · ₹0, from your kitchen', { n: home.time, level: t(home.level) })}
                </Text>
              </Animated.View>
            </PressScale>
          ) : (
            <PressScale scaleTo={0.98} role="button" aria-label={t('Open {name}', { name: pick.name })} onPress={() => onOpen(pick)}>
              <Animated.View key={pick.id} entering={FadeIn.duration(260)} style={{ gap: 4 }}>
                <View style={[styles.nameRow, styles.nameWithSwap]}>
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
          )}

          {home ? (
            <PressScale role="button" onPress={() => onCook(m.meal)} style={styles.switchRow}>
              <Icon name={atHome ? 'bag' : 'pot'} size={16} color={colors.goldText} />
              <Text style={styles.switchText} numberOfLines={1}>
                {atHome ? t('Order {name} instead', { name: pick.name }) : t('or cook {name} at home', { name: home.name })}
              </Text>
              <Icon name="chevron" size={14} color={colors.goldText} />
            </PressScale>
          ) : null}

          {m.options.length ? (
            <PressScale scaleTo={0.92} role="button" aria-label={t('Swap {meal}', { meal: t(look.name) })} onPress={() => onSwap(m.meal)} hitSlop={6} style={styles.swap}>
              <Icon name="restart" size={15} color={colors.red} />
              <Text style={styles.swapText}>{t("Swap")}</Text>
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
  const { saved } = useLocalSearchParams();
  const plan = usePlanStore((s) => s.plan);
  const choice = usePlanStore((s) => s.choice);
  const cook = usePlanStore((s) => s.cook);
  const note = usePlanStore((s) => s.note);
  // Notes are written by AI only for people who allowed it.
  const aiOn = useAuthStore((s) => s.user?.aiConsent === true);
  const noteStale = usePlanStore((s) => s.noteStale);
  const loading = usePlanStore((s) => s.loading);
  const savedAt = usePlanStore((s) => s.savedAt);
  const settings = usePlanStore((s) => s.settings);
  const make = usePlanStore((s) => s.make);
  const swap = usePlanStore((s) => s.swap);
  const toggleCook = usePlanStore((s) => s.toggleCook);
  const saveDay = usePlanStore((s) => s.saveDay);
  const [saving, setSaving] = useState(false);

  async function remake(changes) {
    try {
      await make(changes);
    } catch (err) {
      notify(t("Couldn't plan your day"), errorMessage(err));
    }
  }

  // Plan straight away (Home has already found where they are), unless they
  // opened a day saved in History.
  useEffect(() => {
    if (!saved) remake();
  }, []);

  function toggleMeal(key) {
    const on = settings.meals.includes(key);
    if (on && settings.meals.length === 1) return;
    const meals = MEAL_KEYS.filter((k) => (k === key ? !on : settings.meals.includes(k)));
    remake({ meals });
  }

  async function save() {
    setSaving(true);
    try {
      await saveDay();
      success();
      toast(t('Saved to your History'));
    } catch (err) {
      notify(t("Couldn't save this day"), errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const total = dayTotal(plan, choice, cook);
  const budget = plan?.budget ?? settings.budget;
  const over = total != null && budget && total > budget;
  const people = plan?.people > 1 ? plan.people : 1;
  const bandHeight = 150 + insets.top;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.base }]}>
            <IconButton name="back" label={t("Back")} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} role="heading">
                {t("Plan my whole day")}
              </Text>
              <Text style={styles.subtitle}>{t("Breakfast to dinner, within your budget")}</Text>
            </View>
          </View>
        </MaroonBand>

        <Animated.View entering={rise(0)} style={[styles.settings, { marginTop: bandHeight - 44 }]}>
          <Text style={type.label}>{t("Who's eating")}</Text>
          <View style={styles.chips}>
            {PEOPLE.map((n) => (
              <Chip key={n} label={n === 1 ? t('Just me') : n === 6 ? '6+' : String(n)} on={(settings.people ?? 1) === n} disabled={loading} onPress={() => remake({ people: n })} />
            ))}
            <Chip label={t("All veg")} on={Boolean(settings.veg)} disabled={loading} onPress={() => remake({ veg: !settings.veg })} />
          </View>
          <Text style={[type.label, { marginTop: space.base }]}>{settings.people > 1 ? t('Day budget per person') : t('Day budget')}</Text>
          <View style={styles.chips}>
            {/* The budget from their taste profile joins the list in order. */}
            {[...new Set([...BUDGETS, ...(budget ? [budget] : [])])].sort((a, b) => a - b).map((b) => (
              <Chip key={b} label={rupees(b)} on={budget === b} disabled={loading} onPress={() => remake({ budget: b })} />
            ))}
          </View>
          <Text style={[type.label, { marginTop: space.base }]}>{t("Mood of the day")}</Text>
          <View style={styles.chips}>
            {MOODS.map(([key, label]) => (
              <Chip key={key} label={t(label)} on={settings.mood === key} disabled={loading} onPress={() => remake({ mood: key })} />
            ))}
          </View>
          <Text style={[type.label, { marginTop: space.base }]}>{t("Meals")}</Text>
          <View style={styles.chips}>
            {MEAL_KEYS.map((key) => (
              <Chip key={key} label={t(MEAL_LOOK[key].name)} on={settings.meals.includes(key)} disabled={loading} onPress={() => toggleMeal(key)} />
            ))}
          </View>
        </Animated.View>

        <View style={styles.noteRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>K</Text>
          </View>
          {loading || !plan ? (
            <View style={styles.typing} aria-label={t("Chatora is planning")}>
              <TypingDots color={colors.red} />
            </View>
          ) : (
            <View style={{ flex: 1, gap: space.xs }}>
              <Animated.Text key={note} entering={FadeIn.duration(300)} style={[styles.note, noteStale && styles.noteStale]} aria-live="polite">
                {note}
              </Animated.Text>
              {note && aiOn ? <ReportLink target={{ kind: 'plan', text: note }} /> : null}
            </View>
          )}
        </View>

        {plan?.meals.length ? <Tip id="plan-swap" icon="restart" style={styles.tip} text={t('Not feeling a meal? Tap Swap. Want to make it yourself? Tap \"or cook it at home\".')} /> : null}

        <View style={styles.timeline}>
          {plan?.meals.map((m, n) => (
            <MealCard
              key={m.meal}
              m={m}
              n={n}
              last={n === plan.meals.length - 1}
              choice={choice}
              cooking={Boolean(cook[m.meal])}
              loading={loading}
              onSwap={(meal) => {
                press();
                swap(meal);
              }}
              onCook={(meal) => {
                tap();
                toggleCook(meal);
              }}
              onOpen={(p) => router.push(`/dish/${p.id}`)}
              onRecipe={(r) => router.push(`/recipe/${r.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      {plan?.meals.length ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          {total != null ? (
            <>
              <View style={styles.barTop}>
                <Text style={styles.barLabel}>{people > 1 ? t('Per person · {total} for {n}', { total: rupees(total * people), n: people }) : t('Day total')}</Text>
                <Text style={[styles.barTotal, over && { color: colors.red }]}>
                  {rupees(total)} <Text style={styles.barOf}>{t('of {amount}', { amount: rupees(budget) })}</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, (total / budget) * 100)}%`, backgroundColor: over ? colors.red : colors.green }]} />
              </View>
            </>
          ) : null}
          <View style={styles.barBottom}>
            <Text style={[styles.barNote, over && { color: colors.red }]}>
              {total == null
                ? 'Tap a meal to order on Zomato or Swiggy.'
                : over
                  ? t('{amount} over — swap a meal or cook one', { amount: rupees(total - budget) })
                  : t('{amount} left for chai and extras', { amount: rupees(budget - total) })}
            </Text>
            <PressScale scaleTo={0.9} role="button" aria-label={t("Share this day plan")} disabled={loading} onPress={() => shareText(planMessage(plan, choice, cook))} style={styles.shareBtn}>
              <Icon name="share" size={16} color={colors.ink} />
            </PressScale>
            <PressScale role="button" disabled={saving || Boolean(savedAt) || loading} onPress={save} style={[styles.saveBtn, savedAt && styles.saveBtnDone]}>
              <Icon name={savedAt ? 'check' : 'heart'} size={15} color={savedAt ? colors.green : colors.red} />
              <Text style={[styles.saveText, savedAt && { color: colors.green }]}>{savedAt ? t('Saved') : t('Save this day')}</Text>
            </PressScale>
          </View>
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
  noteStale: { opacity: 0.45 },
  tip: { marginHorizontal: space.base, marginTop: space.base },
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
  cardHome: { backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: colors.goldSoft },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameWithSwap: { paddingRight: 72 },
  name: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink, flexShrink: 1 },
  homeTag: { ...type.label, fontSize: 11 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.hair },
  switchText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.goldText },
  swap: { position: 'absolute', top: space.md, right: space.md, height: 30, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.redSoft, flexDirection: 'row', alignItems: 'center', gap: 4 },
  swapText: { fontFamily: fonts.bold, fontSize: 12, color: colors.red },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.base, gap: 8, ...shadow.lifted },
  barTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  barLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  barTotal: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.ink },
  barOf: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.soft, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  barBottom: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barNote: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  saveBtn: { height: 36, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.redSoft, backgroundColor: colors.redSoft, flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center' },
  saveBtnDone: { backgroundColor: colors.greenSoft, borderColor: colors.greenSoft },
  saveText: { fontFamily: fonts.bold, fontSize: 13, color: colors.red },
});
