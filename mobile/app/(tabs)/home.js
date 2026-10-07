import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon, { DietMark } from '../../components/Icon';
import PlateRing from '../../components/PlateRing';
import DishMeta, { isPlace } from '../../components/DishMeta';
import { useLocationStore } from '../../store/useLocationStore';
import Animated from 'react-native-reanimated';
import { Glow, PressScale, Reveal, rise, riseUp } from '../../components/Motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { errorMessage } from '../../lib/api';
import { notify } from '../../lib/notify';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';

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
  if (h < 12) return { hello: 'Good morning', when: 'this morning?' };
  if (h < 17) return { hello: 'Good afternoon', when: 'this afternoon?' };
  return { hello: 'Good evening', when: 'tonight?' };
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const slip = useChatStore((s) => s.conversation?.slip);
  const quickPicks = useChatStore((s) => s.quickPicks);
  const [topPick, setTopPick] = useState(null);
  const [loadingMood, setLoadingMood] = useState(null);
  const { hello, when } = timeOfDay();
  const bandHeight = 300 + insets.top;

  const prefBudget = BUDGET[user?.preferences?.budget];
  const craving = slip?.craving ?? 'Tell me what you feel like';
  const budget = slip?.budget ?? prefBudget;

  // Where they are, so picks are real places nearby.
  const locationStatus = useLocationStore((s) => s.status);
  const locationLabel = useLocationStore((s) => s.label());
  const locate = useLocationStore((s) => s.locate);
  useEffect(() => {
    if (locationStatus === 'idle') locate();
  }, [locationStatus, locate]);

  useEffect(() => {
    if (locationStatus === 'idle' || locationStatus === 'locating') return undefined;
    let alive = true;
    quickPicks()
      .then((picks) => alive && setTopPick(picks[0] ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [quickPicks, user?.preferences, locationStatus]);

  async function openMood(mood) {
    setLoadingMood(mood);
    try {
      await quickPicks(mood);
      router.push('/results');
    } catch (err) {
      notify("Couldn't load picks", errorMessage(err));
    } finally {
      setLoadingMood(null);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: space.xl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.topRow, { marginTop: insets.top + space.base }]}>
          <Pressable style={styles.location} onPress={locate} aria-label="Update my location" hitSlop={8}>
            <Icon name="pin" size={18} color={colors.gold} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
          </Pressable>
          <IconButton name="user" label="Profile" onDark onPress={() => router.push('/profile')} />
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
              What are you in the{'\n'}mood for <Text style={{ color: colors.gold }}>{when}</Text>
            </Text>
          </Reveal>
        </View>
      </MaroonBand>

      {/* The order slip: what Chatora needs, and the big talk button. */}
      <Animated.View entering={riseUp(0, 260)} style={[styles.slip, { marginTop: bandHeight - 104 }]}>
        <Pressable style={styles.slipFields} onPress={() => router.push('/chat')} aria-label="Tell Chatora what you want">
          <View style={[styles.field, styles.fieldTop]}>
            <Text style={styles.fieldLabel}>Craving</Text>
            <Text style={[styles.fieldValue, !slip?.craving && styles.placeholder]} numberOfLines={1}>
              {craving}
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldLeft]}>
              <Text style={styles.fieldLabel}>Budget</Text>
              <Text style={styles.fieldValue}>{budget ? `₹${budget}` : 'Any'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Time</Text>
              <Text style={styles.fieldValue}>{slip?.time ? `${slip.time} min` : 'Any'}</Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.talk}>
          <View style={styles.micWrap}>
            <Glow size={84} color={colors.red} />
            <PressScale scaleTo={0.9} role="button" aria-label="Talk to Chatora" onPress={() => router.push({ pathname: '/chat', params: { focus: '1' } })} style={styles.mic}>
              <Icon name="mic" size={26} color="#FFFFFF" />
            </PressScale>
          </View>
          <Text style={styles.talkText}>Tap to talk</Text>
        </View>
      </Animated.View>

      <Animated.View entering={rise(0, 400)} style={styles.actions}>
        <PressScale role="button" style={styles.action} onPress={() => router.push({ pathname: '/chat', params: { focus: '1' } })}>
          <Icon name="type" size={18} />
          <Text style={styles.actionText}>Type instead</Text>
        </PressScale>
        <PressScale role="button" style={styles.action} onPress={() => router.push('/kitchen')}>
          <Icon name="camera" size={18} />
          <Text style={styles.actionText}>Scan my fridge</Text>
        </PressScale>
      </Animated.View>

      <View style={styles.moods}>
        {MOODS.map((m, i) => (
          <Animated.View key={m.id} entering={rise(i, 450)}>
            <PressScale scaleTo={0.88} role="button" aria-label={`${m.label} picks`} onPress={() => openMood(m.id)} style={styles.mood}>
              <View style={[styles.moodCircle, { backgroundColor: m.tint }]}>
                {loadingMood === m.id ? <ActivityIndicator color={m.ink} /> : <Icon name={m.icon} size={26} color={m.ink} strokeWidth={1.9} />}
              </View>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </PressScale>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={rise(0, 700)} style={styles.sectionHead}>
        <Text style={type.head}>Chatora's pick for you</Text>
        <Pressable
          onPress={async () => {
            await quickPicks().catch(() => {});
            router.push('/results');
          }}
          hitSlop={8}
        >
          <Text style={styles.link}>See all 5</Text>
        </Pressable>
      </Animated.View>
      {topPick ? (
        <Animated.View entering={rise(0, 760)}>
        <PressScale scaleTo={0.98} role="button" style={styles.pick} onPress={() => router.push(`/dish/${topPick.id}`)}>
          <PlateRing size={72} value={topPick.match / 100}>
            <Text style={styles.matchValue}>{topPick.match}</Text>
            <Text style={styles.matchLabel}>% match</Text>
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
        </Animated.View>
      ) : (
        <View style={[styles.pick, { justifyContent: 'center' }]}>
          <ActivityIndicator color={colors.red} />
        </View>
      )}

      <Animated.View entering={rise(0, 840)}>
        <PressScale scaleTo={0.98} role="button" style={styles.plan} onPress={() => notify('Plan my whole day', 'Plan My Day arrives in a later update.')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Plan my whole day</Text>
            <Text style={styles.planText}>Breakfast to dinner, within your budget</Text>
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
  pickName: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  matchValue: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: colors.ink },
  matchLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  plan: { marginHorizontal: space.base, marginTop: space.base, height: 72, borderRadius: radius.card, backgroundColor: colors.gold, paddingLeft: 20, paddingRight: space.base, flexDirection: 'row', alignItems: 'center', gap: space.md },
  planTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.maroon },
  planText: { fontFamily: fonts.regular, fontSize: 13, color: '#6A3A08' },
  planArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
});
