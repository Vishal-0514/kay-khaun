import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
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

const MOODS = [
  { id: 'spicy', label: 'Spicy', icon: 'flame', tint: '#FDE3E1', ink: colors.red },
  { id: 'comfort', label: 'Comfort', icon: 'bowl', tint: '#FCEBD0', ink: '#A8670F' },
  { id: 'light', label: 'Light', icon: 'leaf', tint: '#E3F2E7', ink: colors.green },
  { id: 'street', label: 'Street', icon: 'cart', tint: '#FDE8D6', ink: '#B8501A' },
  { id: 'sweet', label: 'Sweet', icon: 'sweet', tint: '#FBE4EC', ink: '#A92E5A' },
];
const BUDGET = { low: 300, mid: 500, high: 900 };

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
  const [loadingOccasion, setLoadingOccasion] = useState(false);
  const [topPick, setTopPick] = useState(null);
  const [pickFailed, setPickFailed] = useState(false);
  const [why, setWhy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMood, setLoadingMood] = useState(null);
  const { hello, when } = timeOfDay();
  const bandHeight = 300 + insets.top;

  const prefBudget = BUDGET[user?.preferences?.budget];
  const craving = slip?.craving ?? t('Tell me what you feel like');
  const budget = slip?.budget ?? prefBudget;

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
          <IconButton name="user" label={t("Profile")} onDark onPress={() => router.push('/profile')} />
        </View>
        <View style={styles.greeting}>
          <Animated.View entering={rise(0, 100)} style={styles.helloRow}>
            <Icon name="moon" size={16} color={colors.gold} />
            <Text style={styles.hello}>
              {hello}
              {user?.name ? `, ${user.name}` : ''}
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
            <PressScale scaleTo={0.9} role="button" aria-label={t("Talk to Chatora")} onPress={() => router.push({ pathname: '/chat', params: { voice: String(Date.now()) } })} style={styles.mic}>
              <Icon name="mic" size={26} color="#FFFFFF" />
            </PressScale>
          </View>
          <Text style={styles.talkText}>{t("Tap to talk")}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={rise(0, 400)} style={styles.actions}>
        <PressScale role="button" style={styles.action} onPress={() => router.push({ pathname: '/chat', params: { focus: '1' } })}>
          <Icon name="type" size={18} />
          <Text style={styles.actionText}>{t("Type instead")}</Text>
        </PressScale>
        <PressScale role="button" style={styles.action} onPress={() => router.push('/kitchen')}>
          <Icon name="camera" size={18} />
          <Text style={styles.actionText}>{t("Scan my fridge")}</Text>
        </PressScale>
      </Animated.View>

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

      {occasion ? (
        <Animated.View entering={rise(0, 650)}>
          <PressScale scaleTo={0.98} role="button" aria-label={`${occasion.title}: ${occasion.subtitle}`} onPress={openOccasion} style={styles.special}>
            <View style={styles.specialIcon}>
              {loadingOccasion ? <ActivityIndicator color={colors.red} /> : <Icon name={occasion.icon} size={22} color={colors.red} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.specialTag}>{t("Season special")}</Text>
              <Text style={styles.specialTitle}>{t(occasion.title)}</Text>
              <Text style={type.small} numberOfLines={1}>
                {t(occasion.subtitle)}
              </Text>
            </View>
            <Icon name="chevron" color={colors.muted} />
          </PressScale>
        </Animated.View>
      ) : null}

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

      <Animated.View entering={rise(0, 840)}>
        <PressScale scaleTo={0.98} role="button" style={styles.plan} onPress={() => router.push('/plan')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{t("Plan my whole day")}</Text>
            <Text style={styles.planText}>{t("Breakfast to dinner, within your budget")}</Text>
          </View>
          <View style={styles.planArrow}>
            <Icon name="arrow" size={18} color={colors.gold} />
          </View>
        </PressScale>
      </Animated.View>
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
  actions: { flexDirection: 'row', gap: space.sm, marginHorizontal: space.base, marginTop: space.md },
  action: { flex: 1, height: 44, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  actionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
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
  plan: { marginHorizontal: space.base, marginTop: space.base, height: 72, borderRadius: radius.card, backgroundColor: colors.gold, paddingLeft: 20, paddingRight: space.base, flexDirection: 'row', alignItems: 'center', gap: space.md },
  planTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.maroon },
  planText: { fontFamily: fonts.regular, fontSize: 13, color: '#6A3A08' },
  planArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
});
