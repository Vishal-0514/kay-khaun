import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import { PressScale, rise } from '../components/Motion';
import { toast } from '../components/Toast';
import { REMINDER_MEALS, allowNotifications, applyReminders, readReminders, remindersSupported, timeLabel } from '../lib/reminders';
import { notify } from '../lib/notify';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const ICON = { breakfast: 'spark', lunch: 'pot', snack: 'sweet', dinner: 'moon' };

export default function Reminders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const bandHeight = 130 + insets.top;

  useEffect(() => {
    readReminders().then(setSettings);
  }, []);

  async function update(meal, change) {
    const next = { ...settings, [meal]: { ...settings[meal], ...change } };
    if (change.on && !(await allowNotifications())) {
      notify('Notifications are off', 'Allow notifications for Kya Khaun in your phone settings, then turn the reminder on again.');
      return;
    }
    setSettings(next);
    try {
      await applyReminders(next);
      if (change.on) toast(`${REMINDER_MEALS.find((r) => r.meal === meal).label} reminder at ${timeLabel(next[meal].time)}`, 'clock');
    } catch {
      notify("Couldn't set the reminder", 'Please try again.');
    }
  }

  return (
    <View style={styles.root}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label="Back" onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              Meal reminders
            </Text>
            <Text style={styles.subtitle}>A gentle nudge when it's time to eat</Text>
          </View>
        </View>
      </MaroonBand>

      <ScrollView style={{ marginTop: bandHeight }} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}>
        {!remindersSupported ? (
          <View style={styles.notice}>
            <Icon name="clock" size={18} color={colors.goldText} />
            <Text style={styles.noticeText}>Reminders work in the installed Kya Khaun app on your phone.</Text>
          </View>
        ) : null}

        {settings
          ? REMINDER_MEALS.map((r, i) => {
              const s = settings[r.meal];
              return (
                <Animated.View key={r.meal} entering={rise(i)} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.tile}>
                      <Icon name={ICON[r.meal]} size={18} color={colors.red} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meal}>{r.label}</Text>
                      <Text style={type.small}>{s.on ? `Every day at ${timeLabel(s.time)}` : 'Off'}</Text>
                    </View>
                    <Switch
                      value={s.on}
                      onValueChange={(on) => update(r.meal, { on })}
                      disabled={!remindersSupported}
                      trackColor={{ true: colors.green, false: '#C9B9A6' }}
                      thumbColor="#FFFFFF"
                      aria-label={`${r.label} reminder`}
                    />
                  </View>
                  {s.on ? (
                    <View style={styles.times}>
                      {r.times.map((t) => (
                        <PressScale key={t} role="button" aria-selected={s.time === t} onPress={() => update(r.meal, { time: t })} style={[styles.time, s.time === t && styles.timeOn]}>
                          <Text style={[styles.timeText, s.time === t && styles.timeTextOn]}>{timeLabel(t)}</Text>
                        </PressScale>
                      ))}
                    </View>
                  ) : null}
                </Animated.View>
              );
            })
          : null}

        <Text style={styles.foot}>Reminders are set on this phone only. Nothing about them is sent to Kya Khaun, and you can turn them off any time.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  body: { padding: space.base, gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, gap: space.md, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  meal: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 48 },
  time: { height: 34, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, justifyContent: 'center' },
  timeOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  timeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  timeTextOn: { color: colors.gold },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'center', padding: space.md, borderRadius: 14, backgroundColor: colors.goldSoft },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.goldText },
  foot: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center', marginTop: space.sm, paddingHorizontal: space.base },
});
