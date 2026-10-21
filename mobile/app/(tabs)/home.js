import { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import Icon, { DietMark } from '../../components/Icon';
import PlateRing from '../../components/PlateRing';
import DishMeta, { isPlace } from '../../components/DishMeta';
import { useLocationStore } from '../../store/useLocationStore';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SkeletonCard } from '../../components/Skeleton';
import { WelcomeTips } from '../../components/Tip';
import { tap } from '../../lib/haptics';
import { Glow, PressScale, Reveal, rise, riseUp } from '../../components/Motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { orderAgain, useMeStore } from '../../store/useMeStore';
import { ORDER_APPS, openOrderApp } from '../../lib/orderLinks';
import { dayLabel } from '../../lib/dates';
import { api, errorMessage } from '../../lib/api';
import { notify } from '../../lib/notify';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { shouldShowWhatsNew } from '../../lib/version';
import { useTips } from '../../lib/tips';

const MOODS = [
  { id: 'spicy', label: 'Spicy', icon: 'flame', tint: '#FDE3E1', ink: colors.red },
  { id: 'comfort', label: 'Comfort', icon: 'bowl', tint: '#FCEBD0', ink: '#A8670F' },
  { id: 'light', label: 'Healthy', icon: 'leaf', tint: '#E3F2E7', ink: colors.green },
  { id: 'street', label: 'Street', icon: 'cart', tint: '#FDE8D6', ink: '#B8501A' },
  { id: 'sweet', label: 'Sweet', icon: 'sweet', tint: '#FBE4EC', ink: '#A92E5A' },
];
// The three ways Chatora helps (same look as the choice cards in Chat).
const MAIN = [
  { id: 'cook', label: 'Cook at Home', sub: 'With what you have', icon: 'pot', tint: colors.goldSoft, ink: colors.goldText },
  { id: 'order', label: 'Order Online', sub: 'Delivered to you', icon: 'bag', tint: colors.redSoft, ink: colors.red },
  { id: 'out', label: 'Go Out', sub: 'Places near you', icon: 'pin', tint: '#E8EEF7', ink: '#3A5A8C' },
];
const IDEAS = [
  { id: 'snap', title: 'Snap Your Order', text: 'Snap where you are, get dishes that fit', icon: 'camera', tint: '#FDE8D6', ink: '#B8501A' },
  { id: 'song', title: 'Snap Your Food, Get Your Song', text: 'A food photo, 3–4 songs for it', icon: 'music', tint: '#FBE4EC', ink: '#A92E5A' },
  { id: 'plan', title: 'Plan My Day', text: 'Breakfast to dinner, within your budget', icon: 'calendar', tint: '#E3F2E7', ink: colors.green },
  { id: 'group', title: 'Order for a Group', text: 'Friends, family or office, veg and non-veg', icon: 'people', tint: '#E8EEF7', ink: '#3A5A8C' },
];
const MEALS = [
  { id: 'breakfast', label: 'Breakfast', ask: 'Breakfast ideas', icon: 'cup', tint: '#FCEBD0', ink: '#A8670F' },
  { id: 'lunch', label: 'Lunch', ask: 'Lunch ideas', icon: 'bowl', tint: '#E3F2E7', ink: colors.green },
  { id: 'snacks', label: 'Snacks', ask: 'Snack ideas', icon: 'snack', tint: '#FDE8D6', ink: '#B8501A' },
  { id: 'dinner', label: 'Dinner', ask: 'Dinner ideas', icon: 'moon', tint: '#E8EEF7', ink: '#3A5A8C' },
];

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return { hello: t('Good morning'), when: t('this morning?') };
  if (h < 17) return { hello: t('Good afternoon'), when: t('this afternoon?') };
  return { hello: t('Good evening'), when: t('tonight?') };
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const slip = useChatStore((s) => s.conversation?.slip);
  const quickPicks = useChatStore((s) => s.quickPicks);
  const occasionPicks = useChatStore((s) => s.occasionPicks);
  const [occasion, setOccasion] = useState(null);
  const [loadingOccasion, setLoadingOccasion] = useState(null); // 'all' or a dish id
  const [topPick, setTopPick] = useState(null);
  const [pickFailed, setPickFailed] = useState(false);
  const [why, setWhy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMood, setLoadingMood] = useState(null);
  const { hello, when } = timeOfDay();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const bandHeight = 300 + insets.top;

  const craving = slip?.craving ?? t('Tell me what you feel like');
  const budget = slip?.budget;

  // After an update, "What's new" once. People who haven't seen any tip yet are new: they get the tips instead.
  const tipsSeen = useTips((s) => s.seen);
  const whatsNewChecked = useRef(false);
  useEffect(() => {
    useTips.getState().load?.();
  }, []);
  useEffect(() => {
    if (tipsSeen === null || whatsNewChecked.current) return;
    whatsNewChecked.current = true;
    shouldShowWhatsNew({ isNewUser: tipsSeen.length === 0 })
      .then((show) => show && setTimeout(() => router.push('/whats-new'), 600))
      .catch(() => {});
  }, [tipsSeen]);

  // Where they are, so picks are real places nearby.
  const locationStatus = useLocationStore((s) => s.status);
  const locationLabel = useLocationStore((s) => s.label());
  const locate = useLocationStore((s) => s.locate);
  useEffect(() => {
    if (locationStatus === 'idle') locate();
  }, [locationStatus, locate]);

  // Re-pick whenever Home comes back, so saves and "Not for me" show at once.
  useFocusEffect(
    useCallback(() => {
      if (locationStatus === 'idle' || locationStatus === 'locating') return undefined;
      let alive = true;
      loadTopPick(() => alive);
      return () => {
        alive = false;
      };
    }, [quickPicks, user?.preferences, locationStatus])
  );

  function loadTopPick(alive = () => true) {
    setPickFailed(false);
    return quickPicks()
      .then((picks) => {
        if (!alive()) return;
        if (picks[0]?.id !== topPick?.id) setWhy(false);
        setTopPick(picks[0] ?? null);
      })
      .catch(() => alive() && setPickFailed(true));
  }

  // Saved hearts and "Order again" stay fresh whenever Home comes back.
  const history = useMeStore((s) => s.history);
  const loadHistory = useMeStore((s) => s.loadHistory);
  const loadSaved = useMeStore((s) => s.loadSaved);
  useFocusEffect(
    useCallback(() => {
      loadHistory().catch(() => {});
      loadSaved().catch(() => {});
    }, [loadHistory, loadSaved])
  );
  const again = orderAgain(history);

  // Today's festival or season special.
  const loadOccasion = () => api.get('/chat/occasion').then(({ data }) => setOccasion(data.occasion)).catch(() => {});
  useEffect(() => {
    loadOccasion();
  }, []);

  // Pull down to refresh everything on Home.
  async function refresh() {
    setRefreshing(true);
    await Promise.all([loadTopPick(), loadOccasion(), loadHistory().catch(() => {}), loadSaved().catch(() => {})]);
    setRefreshing(false);
  }

  async function openOccasion(dish) {
    if (loadingOccasion) return;
    tap();
    setLoadingOccasion(dish?.id ?? 'all');
    try {
      await occasionPicks(occasion, dish);
      router.push('/results');
    } catch (err) {
      notify(t("Couldn't load picks"), errorMessage(err));
    } finally {
      setLoadingOccasion(null);
    }
  }

  const ask = (text) => router.push({ pathname: '/chat', params: { ask: text, at: String(Date.now()) } });

  // Order Online starts the chat: Chatora asks what they'd like, veg or non-veg and the budget.
  function choose(id) {
    tap();
    if (id === 'cook') return router.push('/kitchen');
    if (id === 'out') return ask(t('I want to go out'));
    return ask(t('I want to order food'));
  }

  function openIdea(id) {
    tap();
    if (id === 'snap') return router.push('/snap');
    if (id === 'song') return router.push('/snap?mode=food');
    if (id === 'plan') return router.push('/plan');
    return router.push('/group');
  }

  async function openMood(mood) {
    tap();
    setLoadingMood(mood);
    try {
      await quickPicks(mood);
      router.push('/results');
    } catch (err) {
      notify(t("Couldn't load picks"), errorMessage(err));
    } finally {
      setLoadingMood(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: space.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} tintColor={colors.gold} progressViewOffset={insets.top} />}
    >
      <MaroonBand height={bandHeight}>
        <View style={[styles.topRow, { marginTop: insets.top + space.base }]}>
          <Pressable role="button" style={styles.location} onPress={locate} aria-label={t("Update my location")} hitSlop={8}>
            <Icon name="pin" size={18} color={colors.gold} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
          </Pressable>
          <PressScale scaleTo={0.88} role="button" aria-label={t('Settings')} onPress={() => router.push('/settings')} style={styles.me}>
            {firstName ? <Text style={styles.meText}>{firstName[0].toUpperCase()}</Text> : <Icon name="user" size={20} color={colors.maroon} />}
          </PressScale>
        </View>
        <View style={styles.greeting}>
          <Animated.View entering={rise(0, 100)} style={styles.helloRow}>
            <Icon name="moon" size={16} color={colors.gold} />
            <Text style={styles.hello}>
              {hello}
              {firstName ? `, ${firstName}` : ''}
            </Text>
          </Animated.View>
          <Reveal delay={150}>
            <Text style={styles.title} role="heading">
              {t('What are you in the')}{'\n'}{t('mood for')} <Text style={{ color: colors.gold }}>{when}</Text>
            </Text>
          </Reveal>
        </View>
      </MaroonBand>

      {/* The order slip: what Chatora needs, and the big talk button. */}
      <Animated.View entering={riseUp(0, 260)} style={[styles.slip, { marginTop: bandHeight - 104 }]}>
        <Pressable role="button" style={styles.slipFields} onPress={() => router.push('/chat')} aria-label={t("Tell Chatora what you want")}>
          <View style={[styles.field, styles.fieldTop]}>
            <Text style={styles.fieldLabel}>{t("Craving")}</Text>
            <Text style={[styles.fieldValue, !slip?.craving && styles.placeholder]} numberOfLines={1}>
              {craving}
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldLeft]}>
              <Text style={styles.fieldLabel}>{t("Budget")}</Text>
              <Text style={styles.fieldValue}>{budget ? `₹${budget}` : t('Any')}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("Time")}</Text>
              <Text style={styles.fieldValue}>{slip?.time ? t('{n} min', { n: slip.time }) : t('Any')}</Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.talk}>
          <View style={styles.micWrap}>
            <Glow size={84} color={colors.red} />
            <PressScale scaleTo={0.9} role="button" aria-label={t("Talk to Chatora")} onPress={() => router.push('/talk')} style={styles.mic}>
              <Icon name="mic" size={26} color="#FFFFFF" />
            </PressScale>
          </View>
          <Text style={styles.talkText}>{t("Tap to talk")}</Text>
        </View>
      </Animated.View>

      <View style={styles.main}>
        {MAIN.map((m, i) => (
          <Animated.View key={m.id} entering={rise(i, 380)} style={{ flex: 1 }}>
            <PressScale scaleTo={0.95} role="button" aria-label={t(m.label)} onPress={() => choose(m.id)} style={styles.mainCard}>
              <View style={[styles.mainIcon, { backgroundColor: m.tint }]}>
                <Icon name={m.icon} size={26} color={m.ink} strokeWidth={1.9} />
              </View>
              <Text style={styles.mainLabel} numberOfLines={2}>
                {t(m.label)}
              </Text>
              <Text style={styles.mainSub} numberOfLines={2}>
                {t(m.sub)}
              </Text>
            </PressScale>
          </Animated.View>
        ))}
      </View>

      {occasion ? (
        <Animated.View entering={rise(0, 450)} style={styles.fest}>
          <PressScale scaleTo={0.99} role="button" aria-label={`${occasion.title}: ${occasion.subtitle}`} onPress={() => openOccasion()} style={styles.festHead}>
            <View style={styles.festIcon}>
              {loadingOccasion === 'all' ? <ActivityIndicator color={colors.maroon} /> : <Icon name={occasion.icon} size={24} color={colors.maroon} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.festTag}>{occasion.kind === 'festival' ? t('Festival special') : t('This season')}</Text>
              <Text style={styles.festTitle}>{occasion.title}</Text>
              <Text style={styles.festSub} numberOfLines={2}>
                {occasion.subtitle}
              </Text>
            </View>
            <Icon name="chevron" color={colors.gold} />
          </PressScale>
          {occasion.note || occasion.veg ? (
            <View style={styles.festNote}>
              <Icon name="leaf" size={14} color={colors.gold} />
              <Text style={styles.festNoteText}>{occasion.note ?? t('Pure veg picks')}</Text>
            </View>
          ) : null}
          <Text style={styles.festHint}>{t('Tap a dish to see restaurants near you')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.festDishes}>
            {occasion.dishes.map((dish, i) => (
              <Animated.View key={dish.id} entering={rise(i, 500)}>
                <PressScale scaleTo={0.94} role="button" aria-label={t('{dish} near you', { dish: dish.name })} onPress={() => openOccasion(dish)} style={styles.festDish}>
                  <View style={styles.festDishIcon}>
                    {loadingOccasion === dish.id ? <ActivityIndicator size="small" color={colors.red} /> : <Icon name={dish.icon} size={18} color={colors.red} strokeWidth={2} />}
                  </View>
                  <Text style={styles.festDishText}>{dish.name}</Text>
                </PressScale>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      <WelcomeTips style={styles.welcome} />

      <View style={styles.moods}>
        {MOODS.map((m, i) => (
          <Animated.View key={m.id} entering={rise(i, 450)}>
            <PressScale scaleTo={0.88} role="button" aria-label={t('{mood} picks', { mood: t(m.label) })} onPress={() => openMood(m.id)} style={styles.mood}>
              <View style={[styles.moodCircle, { backgroundColor: m.tint }]}>
                {loadingMood === m.id ? <ActivityIndicator color={m.ink} /> : <Icon name={m.icon} size={26} color={m.ink} strokeWidth={1.9} />}
              </View>
              <Text style={styles.moodLabel}>{t(m.label)}</Text>
            </PressScale>
          </Animated.View>
        ))}
      </View>


      <View style={styles.sectionHead}>
        <Text style={type.head} role="heading">
          {t('More Ways to Get Ideas')}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ideas}>
        {IDEAS.map((idea, i) => (
          <Animated.View key={idea.id} entering={rise(i, 600)}>
            <PressScale scaleTo={0.96} role="button" aria-label={t(idea.title)} onPress={() => openIdea(idea.id)} style={styles.idea}>
              <View style={[styles.ideaIcon, { backgroundColor: idea.tint }]}>
                <Icon name={idea.icon} size={24} color={idea.ink} strokeWidth={1.9} />
              </View>
              <Text style={styles.ideaTitle} numberOfLines={2}>
                {t(idea.title)}
              </Text>
              <Text style={styles.ideaText} numberOfLines={2}>
                {t(idea.text)}
              </Text>
            </PressScale>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={type.head} role="heading">
          {t('Quick Picks')}
        </Text>
      </View>
      <View style={styles.meals}>
        {MEALS.map((m, i) => (
          <Animated.View key={m.id} entering={rise(i, 640)} style={{ flex: 1 }}>
            <PressScale scaleTo={0.94} role="button" aria-label={t(m.ask)} onPress={() => ask(t(m.ask))} style={styles.meal}>
              <View style={[styles.mealIcon, { backgroundColor: m.tint }]}>
                <Icon name={m.icon} size={22} color={m.ink} strokeWidth={1.9} />
              </View>
              <Text style={styles.mealLabel} numberOfLines={1}>
                {t(m.label)}
              </Text>
            </PressScale>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={rise(0, 700)} style={styles.sectionHead}>
        <Text style={type.head} role="heading">{t("Chatora's pick for you")}</Text>
        <Pressable
          role="button"
          aria-label={t('See all 5 picks')}
          onPress={async () => {
            await quickPicks().catch(() => {});
            router.push('/results');
          }}
          hitSlop={8}
        >
          <Text style={styles.link}>{t("See all 5")}</Text>
        </Pressable>
      </Animated.View>
      {topPick ? (
        <Animated.View entering={rise(0, 760)}>
        <PressScale scaleTo={0.98} role="button" aria-label={t('{name}, {match}% match. Open details', { name: topPick.name, match: topPick.match })} style={styles.pick} onPress={() => router.push(`/dish/${topPick.id}`)}>
          <PlateRing size={72} value={topPick.match / 100}>
            <Text style={styles.matchValue}>{topPick.match}</Text>
            <Text style={styles.matchLabel}>{t("% match")}</Text>
          </PlateRing>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.nameRow}>
              {isPlace(topPick) ? null : <DietMark type={topPick.diet === 'veg' ? 'veg' : 'nonveg'} />}
              <Text style={styles.pickName} numberOfLines={1}>
                {topPick.name}
              </Text>
            </View>
            <Text style={type.small} numberOfLines={1}>
              {isPlace(topPick) ? topPick.restaurant : `${topPick.restaurant} · ${topPick.distanceKm} km`}
            </Text>
            <DishMeta pick={topPick} />
          </View>
          <Icon name="chevron" color={colors.muted} />
        </PressScale>
        {topPick.reasons?.length ? (
          <View style={styles.whyWrap}>
            <Pressable
              onPress={() => {
                tap();
                setWhy(!why);
              }}
              hitSlop={8}
              role="button"
              aria-expanded={why}
              style={styles.whyButton}
            >
              <Icon name="spark" size={14} color={colors.goldText} />
              <Text style={styles.whyLabel}>{why ? t('Hide why') : t('Why this?')}</Text>
            </Pressable>
            {why ? (
              <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.whyList}>
                {topPick.reasons.map((r, i) => (
                  <View key={i} style={styles.whyRow}>
                    <View style={styles.whyIcon}>
                      <Icon name={r.icon} size={14} color={colors.red} />
                    </View>
                    <Text style={styles.whyText}>{r.text}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>
        ) : null}
        </Animated.View>
      ) : pickFailed ? (
        <View style={[styles.pick, styles.pickError]}>
          <Text style={[type.small, { flex: 1 }]}>{t("Couldn't load your pick.")}</Text>
          <Pressable role="button" onPress={() => loadTopPick()} hitSlop={8} role="button">
            <Text style={styles.link}>{t('Try again')}</Text>
          </Pressable>
        </View>
      ) : (
        <SkeletonCard ring={72} style={styles.pickSkeleton} />
      )}

      {again.length ? (
        <Animated.View entering={rise(0, 800)}>
          <View style={styles.sectionHead}>
            <Text style={type.head} role="heading">{t("Order again")}</Text>
            <Pressable role="button" onPress={() => router.push('/history')} hitSlop={8}>
              <Text style={styles.link}>{t("History")}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.againRow}>
            {again.map((e) => {
              const app = ORDER_APPS[e.app] ?? ORDER_APPS.zomato;
              return (
                <PressScale
                  key={e.item.id}
                  scaleTo={0.97}
                  role="button"
                  aria-label={t('Order {name} again on {app}', { name: e.item.name, app: app.label })}
                  onPress={() => openOrderApp(e.item, e.app ?? 'zomato')}
                  onLongPress={() => router.push(`/dish/${e.item.id}`)}
                  style={styles.againCard}
                >
                  <Text style={styles.againName} numberOfLines={1}>
                    {e.item.name}
                  </Text>
                  <Text style={type.small} numberOfLines={1}>
                    {e.item.restaurant}
                  </Text>
                  <View style={styles.againFoot}>
                    <Text style={styles.againWhen}>{dayLabel(e.at)}</Text>
                    <View style={[styles.againApp, { backgroundColor: app.color }]}>
                      <Icon name="restart" size={12} color="#FFFFFF" />
                      <Text style={styles.againAppText}>{t(app.label)}</Text>
                    </View>
                  </View>
                </PressScale>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  location: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, marginRight: space.md },
  locationText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cream },
  greeting: { paddingHorizontal: space.lg, marginTop: space.lg },
  helloRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hello: { fontFamily: fonts.regular, fontSize: 14, color: colors.creamMuted },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 35, color: colors.cream, marginTop: 6 },
  slip: { marginHorizontal: space.base, minHeight: 144, flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.cardLg, overflow: 'hidden', ...shadow.lifted },
  slipFields: { flex: 1 },
  field: { flex: 1, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },
  fieldTop: { borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: colors.hair },
  fieldRow: { flex: 1, flexDirection: 'row' },
  fieldLeft: { borderRightWidth: 1, borderStyle: 'dashed', borderRightColor: colors.hair },
  fieldLabel: { ...type.label, fontSize: 11 },
  fieldValue: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink, marginTop: 2 },
  placeholder: { color: colors.muted, fontFamily: fonts.medium, fontSize: 16 },
  talk: { width: 96, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  micWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  mic: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', ...shadow.red },
  talkText: { fontFamily: fonts.bold, fontSize: 12, color: colors.goldText },
  me: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  meText: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, color: colors.maroon },
  main: { flexDirection: 'row', gap: space.sm, marginHorizontal: space.base, marginTop: space.md },
  mainCard: { flex: 1, minHeight: 132, padding: space.md, borderRadius: radius.card, backgroundColor: colors.surface, alignItems: 'center', ...shadow.card },
  mainIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  mainLabel: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink, textAlign: 'center', marginTop: space.sm },
  mainSub: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.muted, textAlign: 'center', marginTop: 2 },
  ideas: { paddingHorizontal: space.base, paddingTop: space.md, paddingBottom: space.sm, gap: space.md },
  idea: { width: 158, minHeight: 172, padding: space.base, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow.card },
  ideaIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ideaTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink, marginTop: space.md },
  ideaText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 3 },
  meals: { flexDirection: 'row', gap: space.sm, marginHorizontal: space.base, marginTop: space.md },
  meal: { paddingVertical: space.md, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', gap: 6, ...shadow.card },
  mealIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  moods: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: space.lg },
  mood: { width: 62, alignItems: 'center', gap: 6 },
  moodCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  moodLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: space.lg, marginTop: space.lg },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
  pick: { marginHorizontal: space.base, marginTop: space.md, minHeight: 100, padding: space.base, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.card, ...shadow.card },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickError: { minHeight: 64, justifyContent: 'space-between' },
  pickSkeleton: { marginHorizontal: space.base, marginTop: space.md, minHeight: 100 },
  whyWrap: { marginHorizontal: space.base, marginTop: space.sm, gap: space.sm },
  whyButton: { alignSelf: 'flex-start', minHeight: 32, paddingHorizontal: space.md, borderRadius: radius.full, backgroundColor: colors.goldSoft, flexDirection: 'row', alignItems: 'center', gap: 6 },
  whyLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.goldText },
  whyList: { gap: space.sm, padding: space.base, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair },
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  whyIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  whyText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  welcome: { marginHorizontal: space.base, marginTop: space.lg },
  pickName: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  matchValue: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: colors.ink },
  matchLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  fest: { marginHorizontal: space.base, marginTop: space.base, paddingVertical: space.base, borderRadius: radius.cardLg, backgroundColor: colors.maroon, overflow: 'hidden', ...shadow.lifted },
  festHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.base },
  festIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  festTag: { ...type.label, fontSize: 11, color: colors.gold },
  festTitle: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 25, color: colors.cream },
  festSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.creamMuted },
  festNote: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: space.base, marginTop: space.md, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: 'rgba(232,169,58,0.16)' },
  festNoteText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  festHint: { fontFamily: fonts.medium, fontSize: 12, color: colors.creamMuted, marginHorizontal: space.base, marginTop: space.md },
  festDishes: { paddingHorizontal: space.base, paddingTop: space.sm, gap: space.sm },
  festDish: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingLeft: 5, paddingRight: 14, borderRadius: radius.full, backgroundColor: colors.surface },
  festDishIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  festDishText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  againRow: { paddingHorizontal: space.base, paddingTop: space.md, paddingBottom: space.xs, gap: space.md },
  againCard: { width: 200, padding: 14, gap: 2, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow.card },
  againName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  againFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  againWhen: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  againApp: { height: 26, paddingHorizontal: 10, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 4 },
  againAppText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
});
