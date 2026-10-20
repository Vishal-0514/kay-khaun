import { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Icon, { DietMark } from '../../components/Icon';
import FoodArt from '../../components/FoodArt';
import PlateRing from '../../components/PlateRing';
import DishMeta, { isPlace } from '../../components/DishMeta';
import { useLocationStore } from '../../store/useLocationStore';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SkeletonCard } from '../../components/Skeleton';
import { WelcomeTips } from '../../components/Tip';
import { tap } from '../../lib/haptics';
import { Glow, PressScale, rise, riseUp } from '../../components/Motion';
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
  { id: 'light', label: 'Light', icon: 'leaf', tint: '#E3F2E7', ink: colors.green },
  { id: 'street', label: 'Street', icon: 'cart', tint: '#FDE8D6', ink: '#B8501A' },
  { id: 'sweet', label: 'Sweet', icon: 'sweet', tint: '#FBE4EC', ink: '#A92E5A' },
];
const BUDGET = { low: 300, mid: 500, high: 900 };

// The four big choices, the "more ways" row and the meal shortcuts. Each art
// name is a drawing in components/FoodArt.js.
const CHOICES = [
  { id: 'cook', label: 'Cook at Home', icon: 'pot', art: 'kadai', tint: '#E5F2E3', edge: '#CFE6CB' },
  { id: 'order', label: 'Order Online', icon: 'bag', art: 'burger', tint: '#FDE5DC', edge: '#F7CFC0' },
  { id: 'out', label: 'Go Out', icon: 'pin', art: 'coffee', tint: '#ECE6FA', edge: '#D9CEF4' },
  { id: 'pick', label: 'Just Pick for Me', icon: 'spark', art: 'biryani', tint: '#FFF0CC', edge: '#F8DE9C' },
];
const IDEAS = [
  { id: 'mood', title: 'Snap Your Mood', text: 'Photo your setting and get food ideas', icon: 'camera', art: 'scene', go: '/snap' },
  { id: 'song', title: 'Snap Your Food, Get Your Song', text: 'Take a food photo and get 3–4 songs', icon: 'music', art: 'noodles', go: '/snap?mode=food' },
  { id: 'plan', title: 'Plan My Day', text: 'Breakfast to dinner, within your budget', icon: 'calendar', art: 'breakfast', go: '/plan' },
  { id: 'taste', title: 'Know My Taste', text: 'Picks that learn what you love', icon: 'heart', art: 'masala', go: '/taste' },
];
const MEALS = [
  { id: 'breakfast', label: 'Breakfast', ask: 'Breakfast ideas', art: 'chai' },
  { id: 'lunch', label: 'Lunch', ask: 'Lunch ideas', art: 'rajma' },
  { id: 'snacks', label: 'Snacks', ask: 'Snack ideas', art: 'samosa' },
  { id: 'dinner', label: 'Dinner', ask: 'Dinner ideas', art: 'butterChicken' },
];

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return t('Good morning');
  if (h < 17) return t('Good afternoon');
  return t('Good evening');
}

// Warm light behind the top of Home, with a few soft circles.
function HeroBackdrop({ height }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      <Defs>
        <LinearGradient id="homeHero" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE9C7" />
          <Stop offset="0.65" stopColor="#FFF4E2" />
          <Stop offset="1" stopColor={colors.canvas} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={height} fill="url(#homeHero)" />
      <Circle cx="92%" cy={height * 0.42} r={120} fill="#FFFFFF" opacity={0.55} />
      <Circle cx="8%" cy={height * 0.1} r={60} fill="#FFD9A0" opacity={0.25} />
    </Svg>
  );
}

// The wordmark: a little chef's hat over "Kya", then "Khaun?" with a swoosh.
function Wordmark() {
  return (
    <View aria-label="Kya Khaun?" role="heading">
      <Svg width={34} height={26} viewBox="0 0 34 26" style={styles.hat} aria-hidden>
        <Path d="M9 24 L9 16 C3.5 15 2.5 7.5 8 5.5 C9.5 1.5 15 0.5 17.5 3.5 C20 0.5 25.5 1.5 27 5.5 C32.5 7.5 31.5 15 26 16 L26 24 Z" fill="#FFFFFF" stroke={colors.red} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M9 19.5 L26 19.5 M14 16 L14 12 M21 16 L21 12" stroke={colors.red} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
      <Text style={styles.brandTop}>Kya</Text>
      <Text style={styles.brandBottom}>
        Khaun<Text style={{ color: colors.gold }}>?</Text>
      </Text>
      <Svg width={92} height={10} viewBox="0 0 92 10" style={styles.swoosh} aria-hidden>
        <Path d="M2 7 C30 1 62 1 90 5" stroke={colors.maroon} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// The hero thali floats gently.
function FloatingThali({ size }) {
  const f = useSharedValue(0);
  useEffect(() => {
    f.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [f]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * f.value }, { rotate: `${-4 + 4 * f.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <FoodArt name="thali" size={size} />
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const slip = useChatStore((s) => s.conversation?.slip);
  const quickPicks = useChatStore((s) => s.quickPicks);
  const occasionPicks = useChatStore((s) => s.occasionPicks);
  const [occasion, setOccasion] = useState(null);
  const [loadingOccasion, setLoadingOccasion] = useState(false);
  const [topPick, setTopPick] = useState(null);
  const [pickFailed, setPickFailed] = useState(false);
  const [why, setWhy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMood, setLoadingMood] = useState(null);
  const [busyChoice, setBusyChoice] = useState(null);
  const hello = timeOfDay();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const heroHeight = 250 + insets.top;

  const prefBudget = BUDGET[user?.preferences?.budget];
  const budget = slip?.budget ?? prefBudget;

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

  async function openOccasion() {
    setLoadingOccasion(true);
    try {
      await occasionPicks(occasion);
      router.push('/results');
    } catch (err) {
      notify(t("Couldn't load picks"), errorMessage(err));
    } finally {
      setLoadingOccasion(false);
    }
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

  const ask = (text) => router.push({ pathname: '/chat', params: { ask: text, at: String(Date.now()) } });

  async function choose(id) {
    tap();
    if (id === 'cook') return router.push('/kitchen');
    if (id === 'out') return ask(t('I want to go out'));
    // "Just pick for me": straight to the best pick. "Order online": all five.
    if (id === 'pick' && topPick) return router.push(`/dish/${topPick.id}`);
    setBusyChoice(id);
    try {
      await quickPicks();
      router.push('/results');
    } catch (err) {
      notify(t("Couldn't load picks"), errorMessage(err));
    } finally {
      setBusyChoice(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: space.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} tintColor={colors.red} progressViewOffset={insets.top} />}
    >
      <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top + space.sm }]}>
        <HeroBackdrop height={heroHeight} />
        <View style={[styles.thali, { top: insets.top + 22 }]} pointerEvents="none">
          <FloatingThali size={226} />
          <Svg width={40} height={36} viewBox="0 0 40 36" style={styles.sparks} aria-hidden>
            <Path d="M6 22 L14 18 M12 8 L18 14 M24 4 L24 12" stroke={colors.red} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </View>
        <View style={styles.topRow}>
          <Pressable role="button" style={styles.location} onPress={locate} aria-label={t('Update my location')} hitSlop={8}>
            <Icon name="pin" size={15} color={colors.red} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
          </Pressable>
          <View style={styles.topButtons}>
            <PressScale scaleTo={0.88} role="button" aria-label={t('Meal reminders')} onPress={() => router.push('/reminders')} style={styles.roundBtn}>
              <Icon name="bell" size={20} color={colors.ink} />
            </PressScale>
            <PressScale scaleTo={0.88} role="button" aria-label={t('Profile')} onPress={() => router.push('/profile')} style={[styles.roundBtn, styles.avatarBtn]}>
              {firstName ? <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text> : <Icon name="user" size={20} color="#FFFFFF" />}
            </PressScale>
          </View>
        </View>
        <Animated.View entering={rise(0, 80)} style={styles.brand}>
          <Text style={styles.hello} numberOfLines={1}>
            {hello}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <Wordmark />
          <Text style={styles.tagline}>{t('Your food decision buddy')}</Text>
        </Animated.View>
      </View>

      {/* Ask Chatora: tap the bar to type, the mic or the wave to talk. */}
      <Animated.View entering={riseUp(0, 200)} style={styles.search}>
        <View style={styles.micWrap}>
          <Glow size={58} color={colors.red} />
          <PressScale scaleTo={0.88} role="button" aria-label={t('Talk to Chatora')} onPress={() => router.push('/talk')} style={styles.mic}>
            <Icon name="mic" size={22} color="#FFFFFF" />
          </PressScale>
        </View>
        <Pressable role="button" aria-label={t('What are you craving?')} style={styles.searchText} onPress={() => router.push({ pathname: '/chat', params: { focus: '1' } })}>
          <Text style={[styles.searchPlaceholder, slip?.craving && styles.searchValue]} numberOfLines={1}>
            {slip?.craving ?? t('What are you craving?')}
          </Text>
          {budget || slip?.time ? (
            <Text style={styles.searchMeta} numberOfLines={1}>
              {[budget ? t('Under ₹{n}', { n: budget }) : null, slip?.time ? t('{n} min', { n: slip.time }) : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </Pressable>
        <PressScale scaleTo={0.88} role="button" aria-label={t('Voice chat with Chatora')} onPress={() => router.push('/talk')} style={styles.wave} hitSlop={6}>
          <Icon name="wave" size={22} color={colors.red} />
        </PressScale>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moods}>
        {MOODS.map((m, i) => (
          <Animated.View key={m.id} entering={rise(i, 300)}>
            <PressScale scaleTo={0.92} role="button" aria-label={t('{mood} picks', { mood: t(m.label) })} onPress={() => openMood(m.id)} style={[styles.mood, { backgroundColor: m.tint }]}>
              {loadingMood === m.id ? <ActivityIndicator size="small" color={m.ink} /> : <Icon name={m.icon} size={16} color={m.ink} strokeWidth={2.2} />}
              <Text style={[styles.moodLabel, { color: m.ink }]}>{t(m.label)}</Text>
            </PressScale>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={styles.choices}>
        {CHOICES.map((c, i) => (
          <Animated.View key={c.id} entering={rise(i, 380)} style={{ flex: 1 }}>
            <PressScale scaleTo={0.95} role="button" aria-label={t(c.label)} onPress={() => choose(c.id)} style={[styles.choice, { backgroundColor: c.tint, borderColor: c.edge }]}>
              <View style={styles.choiceArt}>
                <FoodArt name={c.art} size={92} />
              </View>
              <View style={styles.badge}>
                {busyChoice === c.id ? <ActivityIndicator size="small" color={colors.red} /> : <Icon name={c.icon} size={16} color={colors.ink} />}
              </View>
              <Text style={styles.choiceLabel} numberOfLines={3}>
                {t(c.label)}
              </Text>
              <View style={styles.choiceGo}>
                <Icon name="chevron" size={12} color={colors.ink} strokeWidth={2.6} />
              </View>
            </PressScale>
          </Animated.View>
        ))}
      </View>

      <WelcomeTips style={styles.welcome} />

      <View style={styles.sectionHead}>
        <Text style={type.head} role="heading">
          {t('More Ways to Get Ideas')}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ideas}>
        {IDEAS.map((idea, i) => (
          <Animated.View key={idea.id} entering={rise(i, 480)}>
            <PressScale scaleTo={0.96} role="button" aria-label={t(idea.title)} onPress={() => router.push(idea.go)} style={styles.idea}>
              <View style={styles.ideaArt}>
                <FoodArt name={idea.art} size={112} />
              </View>
              <View style={styles.ideaBadge}>
                <Icon name={idea.icon} size={17} color={colors.red} />
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
          <Animated.View key={m.id} entering={rise(i, 560)} style={{ flex: 1 }}>
            <PressScale scaleTo={0.95} role="button" aria-label={t(m.ask)} onPress={() => ask(t(m.ask))} style={styles.meal}>
              <View style={styles.mealArt}>
                <FoodArt name={m.art} size={96} />
              </View>
              <View style={styles.mealFoot}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealLabel} numberOfLines={1}>
                    {t(m.label)}
                  </Text>
                  <Text style={styles.mealSub}>{t('Ideas')}</Text>
                </View>
              </View>
            </PressScale>
          </Animated.View>
        ))}
      </View>

      {occasion ? (
        <Animated.View entering={rise(0, 650)}>
          <PressScale scaleTo={0.98} role="button" aria-label={`${occasion.title}: ${occasion.subtitle}`} onPress={openOccasion} style={styles.special}>
            <View style={styles.specialIcon}>
              {loadingOccasion ? <ActivityIndicator color={colors.red} /> : <Icon name={occasion.icon} size={22} color={colors.red} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.specialTag}>{t('Season special')}</Text>
              <Text style={styles.specialTitle}>{t(occasion.title)}</Text>
              <Text style={type.small} numberOfLines={1}>
                {t(occasion.subtitle)}
              </Text>
            </View>
            <Icon name="chevron" color={colors.muted} />
          </PressScale>
        </Animated.View>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={type.head} role="heading">
          {t("Chatora's pick for you")}
        </Text>
        <Pressable
          role="button"
          aria-label={t('See all 5 picks')}
          onPress={async () => {
            await quickPicks().catch(() => {});
            router.push('/results');
          }}
          hitSlop={8}
          style={styles.seeAll}
        >
          <Text style={styles.link}>{t('See all 5')}</Text>
          <Icon name="chevron" size={14} color={colors.ink} strokeWidth={2.4} />
        </Pressable>
      </View>
      {topPick ? (
        <Animated.View entering={rise(0, 700)}>
          <PressScale scaleTo={0.98} role="button" aria-label={t('{name}, {match}% match. Open details', { name: topPick.name, match: topPick.match })} style={styles.pick} onPress={() => router.push(`/dish/${topPick.id}`)}>
            <PlateRing size={72} value={topPick.match / 100}>
              <Text style={styles.matchValue}>{topPick.match}</Text>
              <Text style={styles.matchLabel}>{t('% match')}</Text>
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
          <Pressable role="button" onPress={() => loadTopPick()} hitSlop={8}>
            <Text style={styles.link}>{t('Try again')}</Text>
          </Pressable>
        </View>
      ) : (
        <SkeletonCard ring={72} style={styles.pickSkeleton} />
      )}

      {again.length ? (
        <Animated.View entering={rise(0, 760)}>
          <View style={styles.sectionHead}>
            <Text style={type.head} role="heading">
              {t('Order again')}
            </Text>
            <Pressable role="button" onPress={() => router.push('/history')} hitSlop={8} style={styles.seeAll}>
              <Text style={styles.link}>{t('History')}</Text>
              <Icon name="chevron" size={14} color={colors.ink} strokeWidth={2.4} />
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
  hero: { overflow: 'hidden' },
  thali: { position: 'absolute', right: -46 },
  sparks: { position: 'absolute', left: 14, top: 52 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.base },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, marginRight: space.md, height: 34, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: '#F5E2C4' },
  locationText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, flexShrink: 1 },
  topButtons: { flexDirection: 'row', gap: space.sm },
  roundBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#F5E2C4' },
  avatarBtn: { backgroundColor: colors.red, borderColor: colors.red, ...shadow.red },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 18, color: '#FFFFFF', marginTop: 2 },
  brand: { paddingHorizontal: space.lg, marginTop: space.md, maxWidth: '62%' },
  hello: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.goldText, marginBottom: 2 },
  hat: { marginLeft: 2, marginBottom: -8 },
  brandTop: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 42, color: colors.maroon },
  brandBottom: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 42, color: colors.red, marginTop: -6 },
  swoosh: { marginTop: -4, marginLeft: 4 },
  tagline: { fontFamily: fonts.semibold, fontSize: 14, color: colors.body, marginTop: 6 },
  search: { marginHorizontal: space.base, marginTop: -18, height: 64, paddingLeft: 8, paddingRight: 10, borderRadius: radius.full, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: '#F3E6D2', ...shadow.lifted, shadowOpacity: 0.14 },
  micWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  mic: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', ...shadow.red },
  searchText: { flex: 1, justifyContent: 'center', minHeight: 48 },
  searchPlaceholder: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted },
  searchValue: { fontFamily: fonts.semibold, color: colors.ink },
  searchMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.goldText, marginTop: 1 },
  wave: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redSoft },
  moods: { paddingHorizontal: space.base, paddingTop: space.md, gap: space.sm },
  mood: { height: 36, paddingHorizontal: 14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodLabel: { fontFamily: fonts.bold, fontSize: 13 },
  choices: { flexDirection: 'row', gap: 8, marginHorizontal: space.base, marginTop: space.base },
  choice: { height: 158, borderRadius: 22, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 9, paddingBottom: 10, justifyContent: 'flex-end' },
  choiceArt: { position: 'absolute', top: -14, left: 0, right: 0, alignItems: 'center' },
  badge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 6, ...shadow.card },
  choiceLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.ink, paddingRight: 8 },
  choiceGo: { position: 'absolute', right: 7, bottom: 11 },
  welcome: { marginHorizontal: space.base, marginTop: space.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: space.base, marginTop: space.lg },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  ideas: { paddingHorizontal: space.base, paddingTop: space.md, paddingBottom: space.sm, gap: space.md },
  idea: { width: 150, height: 214, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, overflow: 'hidden', ...shadow.card },
  ideaArt: { height: 112, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ideaBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: -19, marginLeft: 12, borderWidth: 1, borderColor: colors.hair, ...shadow.card },
  ideaTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink, marginTop: 6, marginHorizontal: 12 },
  ideaText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 3, marginHorizontal: 12 },
  meals: { flexDirection: 'row', gap: 8, marginHorizontal: space.base, marginTop: space.md },
  meal: { borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, overflow: 'hidden', ...shadow.card },
  mealArt: { height: 78, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  mealFoot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 8 },
  mealLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  mealSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
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
  pickName: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  matchValue: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: colors.ink },
  matchLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  special: { marginHorizontal: space.base, marginTop: space.lg, padding: space.base, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, backgroundColor: colors.redSoft },
  specialIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  specialTag: { ...type.label, fontSize: 11, color: colors.red },
  specialTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.ink },
  againRow: { paddingHorizontal: space.base, paddingTop: space.md, paddingBottom: space.xs, gap: space.md },
  againCard: { width: 200, padding: 14, gap: 2, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow.card },
  againName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  againFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  againWhen: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  againApp: { height: 26, paddingHorizontal: 10, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 4 },
  againAppText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
});
