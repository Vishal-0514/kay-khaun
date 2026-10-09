import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { PressScale, rise } from '../components/Motion';
import { toast } from '../components/Toast';
import { useMeStore } from '../store/useMeStore';
import { usePlanStore } from '../store/usePlanStore';
import { useAuthStore } from '../store/useAuthStore';
import { ORDER_APPS, openOrderApp } from '../lib/orderLinks';
import { errorMessage } from '../lib/api';
import { confirm, notify } from '../lib/notify';
import { dayLabel, timeOf } from '../lib/dates';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;

function group(entries) {
  const sections = [];
  for (const e of entries) {
    const title = dayLabel(e.at);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(e);
    else sections.push({ title, data: [e] });
  }
  return sections;
}

function OrderedRow({ e, onOpen, onRemove }) {
  const app = ORDER_APPS[e.app] ?? ORDER_APPS.zomato;
  return (
    <View style={styles.card}>
      <PressScale scaleTo={0.98} role="button" aria-label={t('Open {name}', { name: e.item.name })} onPress={onOpen} style={styles.cardMain}>
        <View style={[styles.tile, { backgroundColor: colors.redSoft }]}>
          <Icon name="bag" size={18} color={colors.red} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            {e.item.name}
          </Text>
          <Text style={type.small} numberOfLines={1}>
            {e.item.restaurant}
          </Text>
          <Text style={styles.meta}>
            {t('Opened in {app} · {time}', { app: app.label, time: timeOf(e.at) })}
          </Text>
        </View>
      </PressScale>
      <View style={styles.side}>
        <PressScale role="button" aria-label={t('Order {name} again on {app}', { name: e.item.name, app: app.label })} onPress={() => openOrderApp(e.item, e.app ?? 'zomato')} style={styles.again}>
          <Icon name="restart" size={14} color="#FFFFFF" />
          <Text style={styles.againText}>{t("Again")}</Text>
        </PressScale>
        <Pressable onPress={onRemove} hitSlop={10} aria-label={t('Remove {name} from history', { name: e.item.name })} style={styles.remove}>
          <Icon name="close" size={14} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

function PlanRow({ e, onOpen, onRemove }) {
  const p = e.plan;
  return (
    <View style={styles.card}>
      <PressScale scaleTo={0.98} role="button" aria-label={t("Open this day plan")} onPress={onOpen} style={styles.cardMain}>
        <View style={[styles.tile, { backgroundColor: colors.goldSoft }]}>
          <Icon name="clock" size={18} color={colors.goldText} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>
            {t('Day plan · {mood}', { mood: p.moodLabel })}
          </Text>
          {p.meals.map((m) => (
            <Text key={m.meal} style={type.small} numberOfLines={1}>
              <Text style={styles.mealKey}>{t(m.label)}: </Text>
              {m.cook ? t('{name} (cook at home)', { name: m.recipe?.name ?? m.item.name }) : m.item.name}
            </Text>
          ))}
          <Text style={styles.meta}>
            {p.total != null ? t('{total} of {budget}', { total: rupees(p.total), budget: rupees(p.budget) }) + ' · ' : ''}{t('saved {time}', { time: timeOf(e.at) })}
          </Text>
        </View>
      </PressScale>
      <View style={styles.side}>
        <PressScale role="button" aria-label={t("Open this day plan")} onPress={onOpen} style={[styles.again, { backgroundColor: colors.maroon }]}>
          <Text style={[styles.againText, { color: colors.gold }]}>{t("Open")}</Text>
        </PressScale>
        <Pressable onPress={onRemove} hitSlop={10} aria-label={t("Remove this day plan from history")} style={styles.remove}>
          <Icon name="close" size={14} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const memoryOn = useAuthStore((s) => Boolean(s.user?.memoryEnabled));
  const history = useMeStore((s) => s.history);
  const more = useMeStore((s) => s.historyMore);
  const loadHistory = useMeStore((s) => s.loadHistory);
  const removeHistory = useMeStore((s) => s.removeHistory);
  const clearHistory = useMeStore((s) => s.clearHistory);
  const openSaved = usePlanStore((s) => s.openSaved);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const bandHeight = 130 + insets.top;

  function load() {
    setState('loading');
    loadHistory()
      .then(() => setState('ready'))
      .catch((err) => {
        setError(errorMessage(err));
        setState('error');
      });
  }
  useEffect(load, [loadHistory]);

  async function remove(e) {
    try {
      await removeHistory(e.id);
      toast(t('Removed from history'));
    } catch (err) {
      notify(t("Couldn't remove it"), errorMessage(err));
    }
  }

  async function clearAll() {
    const yes = await confirm(t('Clear your history?'), t('Orders and saved days will be removed. What I learned from your orders goes too. This can’t be undone.'), 'Clear');
    if (!yes) return;
    try {
      await clearHistory();
      toast(t('History cleared'));
    } catch (err) {
      notify(t("Couldn't clear history"), errorMessage(err));
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      await loadHistory({ more: true });
    } catch (err) {
      notify(t("Couldn't load more"), errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  function openPlan(e) {
    openSaved(e);
    router.push({ pathname: '/plan', params: { saved: '1' } });
  }

  return (
    <View style={styles.root}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label={t("Back")} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              {t("Your food history")}
            </Text>
            <Text style={styles.subtitle}>{t("What you opened to order, and days you saved")}</Text>
          </View>
        </View>
      </MaroonBand>

      {state === 'loading' && !history.length ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: bandHeight + space.xl }} />
      ) : state === 'error' && !history.length ? (
        <View style={[styles.empty, { marginTop: bandHeight }]}>
          <Text style={type.head}>{t("Couldn't load your history")}</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>{error}</Text>
          <Button title={t("Try again")} variant="outline" onPress={load} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <SectionList
          style={{ marginTop: bandHeight }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
          sections={group(history)}
          keyExtractor={(e) => String(e.id)}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            memoryOn ? null : (
              <View style={styles.notice}>
                <Icon name="spark" size={16} color={colors.goldText} />
                <Text style={styles.noticeText}>{t("\"Remember my taste\" is off, so new orders aren't added here. Days you save still are.")}</Text>
              </View>
            )
          }
          renderSectionHeader={({ section }) => <Text style={styles.day}>{t(section.title)}</Text>}
          renderItem={({ item: e, index }) => (
            <Animated.View entering={rise(Math.min(index, 5))}>
              {e.kind === 'plan' ? (
                <PlanRow e={e} onOpen={() => openPlan(e)} onRemove={() => remove(e)} />
              ) : (
                <OrderedRow e={e} onOpen={() => router.push(`/dish/${e.item.id}`)} onRemove={() => remove(e)} />
              )}
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="clock" size={30} color={colors.goldText} />
              </View>
              <Text style={type.head}>{t("No history yet")}</Text>
              <Text style={[type.small, { textAlign: 'center' }]}>{t("When you open a pick in Zomato or Swiggy, or save a day plan, it shows up here so you can have it again in one tap.")}</Text>
              <Button title={t("Find something to eat")} onPress={() => router.replace('/home')} style={{ alignSelf: 'stretch', marginTop: space.sm }} />
            </View>
          }
          ListFooterComponent={
            history.length ? (
              <View style={styles.footer}>
                {more ? <Button title={t("Show older")} variant="outline" loading={loadingMore} onPress={loadMore} style={{ alignSelf: 'stretch' }} /> : null}
                <Pressable onPress={clearAll} hitSlop={8} style={styles.clear}>
                  <Text style={styles.clearText}>{t("Clear history")}</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  list: { paddingHorizontal: space.base, paddingTop: space.sm, flexGrow: 1 },
  day: { ...type.label, marginTop: space.base, marginBottom: space.sm, marginLeft: 4 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, marginBottom: space.md, ...shadow.card },
  cardMain: { flex: 1, flexDirection: 'row', gap: space.md },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  mealKey: { fontFamily: fonts.semibold, color: colors.body },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  side: { alignItems: 'flex-end', gap: space.md },
  again: { height: 32, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', gap: 4 },
  againText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  remove: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: 14, backgroundColor: colors.goldSoft, marginTop: space.sm },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.goldText },
  empty: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  footer: { gap: space.md, alignItems: 'center', marginTop: space.sm },
  clear: { minHeight: 44, justifyContent: 'center' },
  clearText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.red, textDecorationLine: 'underline' },
});
