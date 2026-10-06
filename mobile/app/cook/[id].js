import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import PlateRing from '../../components/PlateRing';
import Button from '../../components/Button';
import Animated from 'react-native-reanimated';
import { PressScale, appear, fromRight, leave, rise } from '../../components/Motion';
import { useCookStore } from '../../store/useCookStore';
import { errorMessage } from '../../lib/api';
import { colors, fonts, radius, space } from '../../lib/theme';

// Step-by-step cooking with big text, timers, and the screen kept awake. Design: V5Cook.
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Counts down from `seconds`. Uses the wall clock, so it stays right even if
// the phone is slow or the app was in the background.
function useTimer(seconds) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const endAt = useRef(null);

  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
    endAt.current = null;
  }, [seconds]);

  useEffect(() => {
    if (!running) return undefined;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        if (Platform.OS !== 'web') Vibration.vibrate([0, 500, 250, 500, 250, 500]);
      }
    }, 250);
    return () => clearInterval(tick);
  }, [running]);

  return {
    left,
    running,
    start() {
      if (left === 0) return;
      endAt.current = Date.now() + left * 1000;
      setRunning(true);
    },
    pause() {
      setRunning(false);
    },
    addMinute() {
      if (running) endAt.current += 60000;
      setLeft((l) => l + 60);
    },
    reset() {
      setRunning(false);
      setLeft(seconds);
    },
  };
}

function Pill({ icon, label, onPress }) {
  return (
    <PressScale scaleTo={0.92} role="button" onPress={onPress} style={styles.pill}>
      <Icon name={icon} size={16} color={colors.cream} strokeWidth={2.4} />
      <Text style={styles.pillText}>{label}</Text>
    </PressScale>
  );
}

export default function Cook() {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const current = useCookStore((s) => s.current);
  const openRecipe = useCookStore((s) => s.openRecipe);
  const recipe = current?.id === id ? current : null;
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!recipe) openRecipe(id).catch((err) => setError(errorMessage(err)));
  }, [id, recipe, openRecipe]);

  const step = recipe?.steps[index];
  const timer = useTimer(step?.timer ?? 0);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (!recipe) {
    return (
      <View style={[styles.root, styles.center]}>
        {error ? <Text style={styles.stepText}>{error}</Text> : <ActivityIndicator color={colors.gold} size="large" />}
      </View>
    );
  }

  const total = recipe.steps.length;
  const last = index === total - 1;
  const timeUp = step?.timer && timer.left === 0;

  return (
    <View style={styles.root}>
      <MaroonBand height="100%" rounded={false} />
      <View style={[styles.header, { marginTop: insets.top + space.base }]}>
        <IconButton name="close" label="Exit cook mode" onDark onPress={exit} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.stepCount}>{done ? 'All done' : `Step ${index + 1} of ${total}`}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.progress}>
        {recipe.steps.map((s, i) => (
          <View key={s.n} style={[styles.bar, { backgroundColor: done || i < index ? colors.cream : i === index ? colors.gold : 'rgba(255,255,255,0.18)' }]} />
        ))}
      </View>

      {done ? (
        <View style={styles.doneWrap}>
          <Animated.View entering={appear(0)}>
            <PlateRing size={200} value={1} dark ticks>
              <Animated.View entering={appear(0, 800)}>
                <Icon name="check" size={64} color={colors.gold} strokeWidth={2.4} />
              </Animated.View>
            </PlateRing>
          </Animated.View>
          <Animated.Text entering={rise(0, 500)} style={styles.doneTitle}>
            Enjoy your {recipe.name}!
          </Animated.Text>
          <Text style={styles.doneText}>Cooked from your own kitchen — nice work.</Text>
          <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.lg }}>
            <Button title="Back to Home" variant="gold" onPress={() => router.replace('/home')} />
            <Pressable role="button" onPress={() => router.replace('/recipes')} style={styles.again}>
              <Text style={styles.againText}>Cook something else</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <Animated.View key={index} entering={fromRight()} exiting={leave}>
            <View style={styles.ringWrap}>
              {step.timer ? (
                <>
                  <PlateRing size={210} value={timer.left / Math.max(step.timer, timer.left)} dark ticks instant={timer.running}>
                    <Text style={[styles.time, timeUp && { color: colors.gold }]}>{timeUp ? "Time's up" : clock(timer.left)}</Text>
                    <Text style={styles.timeLabel}>{timeUp ? 'Check and move on' : timer.running ? 'left on timer' : timer.left === step.timer ? 'timer ready' : 'paused'}</Text>
                  </PlateRing>
                  <View style={styles.pills}>
                    {timeUp ? (
                      <Pill icon="restart" label="Restart" onPress={timer.reset} />
                    ) : timer.running ? (
                      <Pill icon="pause" label="Pause" onPress={timer.pause} />
                    ) : (
                      <Pill icon="play" label={timer.left === step.timer ? 'Start timer' : 'Resume'} onPress={timer.start} />
                    )}
                    <Pill icon="plus" label="1 min" onPress={timer.addMinute} />
                  </View>
                </>
              ) : (
                <PlateRing size={170} value={(index + 1) / total} dark ticks>
                  <Text style={styles.time}>{index + 1}</Text>
                  <Text style={styles.timeLabel}>of {total} steps</Text>
                </PlateRing>
              )}
            </View>

            <Text style={styles.stepText}>{step.text}</Text>
            {step.uses.length ? (
              <View style={styles.uses}>
                {step.uses.map((u) => (
                  <View key={u} style={styles.use}>
                    <Text style={styles.useText}>{u}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {step.tip ? (
              <View style={styles.tip}>
                <Icon name="spark" size={18} color={colors.gold} />
                <Text style={styles.tipText}>
                  <Text style={{ fontFamily: fonts.bold, color: colors.cream }}>Tip: </Text>
                  {step.tip}
                </Text>
              </View>
            ) : null}
            </Animated.View>
          </ScrollView>

          <View style={[styles.nav, { paddingBottom: insets.bottom + space.lg }]}>
            <PressScale scaleTo={0.9} role="button" aria-label="Previous step" disabled={index === 0} onPress={() => setIndex((i) => i - 1)} style={[styles.prev, index === 0 && { opacity: 0.35 }]}>
              <Icon name="back" size={22} color={colors.cream} />
            </PressScale>
            <Button
              title={last ? "I'm done" : 'Next step'}
              variant="gold"
              icon={<Icon name={last ? 'check' : 'arrow'} size={18} color={colors.maroon} />}
              onPress={() => (last ? setDone(true) : setIndex((i) => i + 1))}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#160203' },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.cream },
  stepCount: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  progress: { flexDirection: 'row', gap: 4, marginHorizontal: space.lg, marginTop: space.base },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  ringWrap: { alignItems: 'center', gap: space.md, marginTop: space.lg },
  time: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.cream, textAlign: 'center' },
  timeLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted, marginTop: 2 },
  pills: { flexDirection: 'row', gap: space.sm },
  pill: { height: 40, paddingHorizontal: space.base, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  stepText: { marginTop: space.lg, fontFamily: fonts.display, fontSize: 24, lineHeight: 32, color: colors.cream },
  uses: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.base },
  use: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.08)' },
  useText: { fontFamily: fonts.medium, fontSize: 14, color: colors.cream },
  tip: { flexDirection: 'row', gap: space.md, marginTop: space.base, padding: space.md, paddingHorizontal: space.base, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(232,169,58,0.35)', backgroundColor: 'rgba(232,169,58,0.14)' },
  tipText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted },
  nav: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  prev: { width: 52, height: 52, borderRadius: radius.button, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  doneTitle: { marginTop: space.lg, fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.cream, textAlign: 'center' },
  again: { height: 44, alignItems: 'center', justifyContent: 'center' },
  againText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.cream, textDecorationLine: 'underline' },
  doneText: { marginTop: space.sm, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.creamMuted, textAlign: 'center' },
});
