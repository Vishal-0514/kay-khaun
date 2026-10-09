import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import Button from '../../components/Button';
import Icon, { DietMark } from '../../components/Icon';
import Animated from 'react-native-reanimated';
import { PressScale, appear, rise, riseUp } from '../../components/Motion';
import { api, errorMessage } from '../../lib/api';
import { signOut } from '../../lib/session';
import { confirm, notify } from '../../lib/notify';
import { toast } from '../../components/Toast';
import { useAuthStore } from '../../store/useAuthStore';
import { useMeStore } from '../../store/useMeStore';
import { readReminders } from '../../lib/reminders';
import { useTips } from '../../lib/tips';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';
import { LANGUAGES, t, useLang } from '../../lib/i18n';

const SPICE = ['Mild', 'Light', 'Medium', 'Hot', 'Extra hot'];
const BUDGET = { low: 'Under ₹300', mid: '₹300–500', high: '₹500+' };
const DIET = { veg: 'Veg', nonveg: 'Non-veg', egg: 'Egg only' };

function Row({ n = 0, icon, tint, ink, label, value, lead }) {
  return (
    <Animated.View entering={rise(n, 350)} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={ink} strokeWidth={1.9} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {lead}
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </Animated.View>
  );
}

// A row that opens another screen.
function NavRow({ n = 0, icon, tint, ink, label, value, onPress }) {
  return (
    <Animated.View entering={rise(n, 350)}>
      <PressScale scaleTo={0.98} role="button" aria-label={label} onPress={onPress} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: tint }]}>
          <Icon name={icon} size={18} color={ink} strokeWidth={1.9} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
        <Icon name="chevron" size={16} color={colors.muted} />
      </PressScale>
    </Animated.View>
  );
}

// "Your week in food": the last 7 days at a glance.
function WeekCard({ week }) {
  const stats = [
    [t('Orders'), week.orders],
    [t('Cuisines'), week.cuisines],
    [t('Saved'), week.saved],
    [t('Days planned'), week.daysPlanned],
  ];
  const quiet = !week.orders && !week.cuisines && !week.saved && !week.daysPlanned;
  let line = t('A quiet week. Ask Chatora for something new!');
  if (week.newCuisines.length) line = t('New for you this week: {list}', { list: week.newCuisines.map((c) => t(c)).join(', ') });
  else if (week.topCuisine) line = t('Your go-to this week: {name}', { name: t(week.topCuisine) });
  if (week.homeCooked) line += ' · ' + t(week.homeCooked === 1 ? '{n} meal cooked at home' : '{n} meals cooked at home', { n: week.homeCooked });
  return (
    <Animated.View entering={rise(2, 300)} style={styles.week}>
      <Text style={styles.weekTitle}>{t("Your week in food")}</Text>
      {quiet ? null : (
        <View style={styles.weekStats}>
          {stats.map(([label, n]) => (
            <View key={label} style={styles.weekStat}>
              <Text style={styles.weekNum}>{n}</Text>
              <Text style={styles.weekLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={type.small}>{line}</Text>
    </Animated.View>
  );
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);
  const savedCount = useMeStore((s) => s.saved.length);
  const learned = useMeStore((s) => s.learned);
  const loadLearned = useMeStore((s) => s.loadLearned);
  const week = useMeStore((s) => s.week);
  const loadWeek = useMeStore((s) => s.loadWeek);
  const loadSaved = useMeStore((s) => s.loadSaved);
  const clearLearned = useMeStore((s) => s.clearLearned);
  const memoryOn = Boolean(user?.memoryEnabled);
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const [reminderCount, setReminderCount] = useState(0);

  // Fresh numbers each time Profile opens, or when pulled down.
  const reload = useCallback(
    () =>
      Promise.all([
        loadLearned().catch(() => {}),
        loadSaved().catch(() => {}),
        loadWeek().catch(() => {}),
        readReminders().then((r) => setReminderCount(Object.values(r).filter((x) => x.on).length)),
      ]),
    [loadLearned, loadSaved, loadWeek]
  );
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function forget() {
    const yes = await confirm(t("Clear what I've learned?"), t('I’ll forget what you opened, ordered and marked "Not for me". Your saved picks, saved days and taste settings stay.'), 'Clear');
    if (!yes) return;
    try {
      await clearLearned();
      toast(t('Done — starting fresh'));
    } catch (err) {
      notify(t("Couldn't clear it"), errorMessage(err));
    }
  }
  const p = user?.preferences ?? {};
  const bandHeight = 200 + insets.top;
  const initial = (user?.name || 'K').trim().charAt(0).toUpperCase();

  async function toggleMemory(on) {
    setSaving(true);
    setUser({ ...user, memoryEnabled: on });
    try {
      const { data } = await api.patch('/profile', { memoryEnabled: on });
      setUser(data.user);
      loadLearned().catch(() => {});
    } catch (err) {
      setUser({ ...user, memoryEnabled: !on });
      notify(t("Couldn't save"), errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: space.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} tintColor={colors.gold} progressViewOffset={insets.top} />}
    >
      <MaroonBand height={bandHeight}>
        <View style={[styles.head, { marginTop: insets.top + 28 }]}>
          <Animated.View entering={appear(0, 100)} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} role="heading">
              {user?.name || t('Your profile')}
            </Text>
            <Text style={styles.sub}>{user?.isGuest ? t('Test account (skipped login)') : user?.phone ? `+91 ${user.phone}` : user?.email ?? t('Your food profile')}</Text>
          </View>
        </View>
      </MaroonBand>

      <Animated.View entering={riseUp(0, 200)} style={[styles.card, styles.memory, { marginTop: bandHeight - 68 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.memoryTitle}>{t("Remember my taste")}</Text>
          <Text style={type.small}>{memoryOn ? t('Learns from what you open, order and save') : t('Off. Picks ignore your taste, and nothing new is learned')}</Text>
        </View>
        <Switch
          value={Boolean(user?.memoryEnabled)}
          onValueChange={toggleMemory}
          disabled={saving}
          trackColor={{ true: colors.green, false: '#C9B9A6' }}
          thumbColor="#FFFFFF"
          aria-label={t("Remember my taste")}
        />
      </Animated.View>

      <Text style={[type.head, styles.section]} role="heading">{t("Your food")}</Text>
      <View style={styles.list}>
        <NavRow n={0} icon="heart" tint="#FBE4EC" ink="#A92E5A" label={t("Saved")} value={savedCount ? t(savedCount === 1 ? '{n} pick' : '{n} picks', { n: savedCount }) : t('None yet')} onPress={() => router.push('/saved')} />
        <NavRow n={1} icon="clock" tint={colors.goldSoft} ink={colors.goldText} label={t("History")} value={t('Orders and saved days')} onPress={() => router.push('/history')} />
        <NavRow n={2} icon="moon" tint="#E8EEF7" ink="#3A5A8C" label={t("Meal reminders")} value={reminderCount ? t('{n} on', { n: reminderCount }) : t('Off')} onPress={() => router.push('/reminders')} />
        <NavRow n={3} icon="chat" tint={colors.redSoft} ink={colors.red} label={t('Recent chats')} value={t('Your chats with Chatora')} onPress={() => router.push('/chats')} />
      </View>

      {memoryOn && week?.enabled ? <WeekCard week={week} /> : null}

      <Animated.View entering={rise(2, 350)} style={styles.learned}>
        <View style={styles.learnedHead}>
          <Icon name="spark" size={18} color={colors.goldText} />
          <Text style={styles.learnedTitle}>{t("What I've learned")}</Text>
        </View>
        {!memoryOn ? (
          <Text style={type.small}>{t("Turn on \"Remember my taste\" and I'll learn what you like from what you open, order and save.")}</Text>
        ) : learned?.cuisines?.length ? (
          <>
            <Text style={type.small}>{t("You often go for")}</Text>
            <View style={styles.learnedChips}>
              {learned.cuisines.map((c) => (
                <View key={c.name} style={styles.learnedChip}>
                  <Text style={styles.learnedChipText}>{t(c.name)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={type.small}>{t("Nothing yet. I learn from what you open, order, save and mark \"Not for me\".")}</Text>
        )}
        {memoryOn && learned?.signals ? (
          <>
            <Text style={styles.learnedFoot}>
              {t(learned.signals === 1 ? 'From {n} thing you opened, ordered or saved' : 'From {n} things you opened, ordered or saved', { n: learned.signals })}
              {learned.notForMe ? ' · ' + t('{n} marked "Not for me"', { n: learned.notForMe }) : ''}.
            </Text>
            <Pressable role="button" onPress={forget} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Text style={styles.learnedClear}>{t("Clear what I've learned")}</Text>
            </Pressable>
          </>
        ) : null}
      </Animated.View>

      <Text style={[type.head, styles.section]} role="heading">{t("Preferences")}</Text>
      <View style={styles.list}>
        <Animated.View entering={rise(0, 350)} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#E8EEF7' }]}>
            <Icon name="chat" size={18} color="#3A5A8C" strokeWidth={1.9} />
          </View>
          <Text style={styles.rowLabel}>{t('Language')}</Text>
          <View style={styles.langs} role="radiogroup" aria-label={t('Language')}>
            {LANGUAGES.map((l) => (
              <PressScale key={l.id} role="radio" aria-checked={lang === l.id} onPress={() => setLang(l.id)} style={[styles.lang, lang === l.id && styles.langOn]}>
                <Text style={[styles.langText, lang === l.id && styles.langTextOn]}>{l.label}</Text>
              </PressScale>
            ))}
          </View>
        </Animated.View>
        <Row n={0} icon="leaf" tint="#E3F2E7" ink={colors.green} label={t("Diet")} value={t(DIET[p.diet] ?? 'Not set')} lead={p.diet && p.diet !== 'egg' ? <DietMark type={p.diet} /> : null} />
        <Row n={1} icon="flame" tint="#FDE3E1" ink={colors.red} label={t("Spice level")} value={t(SPICE[(p.spice ?? 3) - 1])} />
        <Row n={2} icon="rupee" tint="#FCEBD0" ink="#A8670F" label={t("Budget per meal")} value={t(BUDGET[p.budget] ?? 'Not set')} />
        <Row n={3} icon="bowl" tint="#FDE8D6" ink="#B8501A" label={t("Favourites")} value={p.cuisines?.length ? p.cuisines.map((c) => t(c)).join(', ') : t('None yet')} />
        <Row n={4} icon="close" tint="#FBE4EC" ink="#A92E5A" label={t("Avoid")} value={p.avoid?.length ? p.avoid.map((a) => t(a)).join(', ') : t('Nothing')} />
      </View>
      <Button variant="outline" title={t("Edit my taste")} onPress={() => router.push('/taste')} style={styles.edit} />

      <Pressable
        onPress={() => {
          useTips.getState().reset();
          toast(t('Tips will show again'), 'check');
        }}
        hitSlop={8}
        role="button"
        style={styles.tipsAgain}
      >
        <Text style={styles.learnedClear}>{t('Show tips again')}</Text>
      </Pressable>

      <PressScale role="button" onPress={() => signOut().then(() => router.replace('/welcome'))} style={styles.signOut}>
        <Text style={styles.signOutText}>{user?.isGuest ? t('Leave test account') : t('Sign out')}</Text>
      </PressScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  tipsAgain: { alignSelf: 'center', marginTop: space.lg, minHeight: 32, justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.base, paddingHorizontal: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, color: colors.maroon },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.cream },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.creamMuted },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.card, ...shadow.lifted },
  memory: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.base, paddingLeft: 20 },
  memoryTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  section: { marginHorizontal: space.lg, marginTop: space.lg },
  list: { marginHorizontal: space.lg, marginTop: space.xs },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, flex: 1 },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, maxWidth: '50%', textAlign: 'right' },
  edit: { marginHorizontal: space.lg, marginTop: space.lg },
  langs: { flexDirection: 'row', gap: 6 },
  lang: { height: 32, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, justifyContent: 'center' },
  langOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  langText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  langTextOn: { color: colors.gold },
  week: { marginHorizontal: space.lg, marginTop: space.base, padding: space.base, borderRadius: radius.card, backgroundColor: colors.surface, gap: space.md, ...shadow.card },
  weekTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  weekStats: { flexDirection: 'row', gap: space.sm },
  weekStat: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: 12, backgroundColor: colors.soft },
  weekNum: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.ink, fontVariant: ['tabular-nums'] },
  weekLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, textAlign: 'center' },
  learned: { marginHorizontal: space.lg, marginTop: space.base, padding: space.base, borderRadius: radius.card, backgroundColor: colors.goldSoft, gap: space.sm },
  learnedHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  learnedTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  learnedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  learnedChip: { height: 32, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center' },
  learnedChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.goldText },
  learnedFoot: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.goldText },
  learnedClear: { fontFamily: fonts.semibold, fontSize: 13, color: colors.red, textDecorationLine: 'underline' },
  signOut: { alignSelf: 'center', marginTop: space.lg, minHeight: 44, justifyContent: 'center' },
  signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.red, textDecorationLine: 'underline' },
});
