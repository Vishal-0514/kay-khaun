import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { createAudioPlayer } from 'expo-audio';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import PlateRing from '../../components/PlateRing';
import Button from '../../components/Button';
import VoiceBars from '../../components/VoiceBars';
import Animated, { Easing, FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { PressScale, appear, fromRight, leave, rise } from '../../components/Motion';
import { useCookStore } from '../../store/useCookStore';
import { errorMessage } from '../../lib/api';
import { notify } from '../../lib/notify';
import { press, tap } from '../../lib/haptics';
import { pickKitchenPhoto } from '../../lib/photo';
import { readCookVoice, saveCookVoice, useKitchen } from '../../lib/kitchen';
import { speak, stopSpeaking, useVoiceSettings } from '../../lib/speak';
import { useVoice, voiceUnavailableReason } from '../../lib/voice';
import { colors, fonts, radius, space } from '../../lib/theme';
import { t } from '../../lib/i18n';

// Cooking mode: get the ingredients ready, then one big card per step with
// timers, and Chatora reading each step aloud (switch it off with the speaker
// button). Say "next", "repeat" or "back" instead of touching the screen.
// At the end: applause, a photo of the dish for "My Kitchen", and achievements.
// Design: V5Cook.
// Keep the screen on while cooking (phones; browsers handle wake locks differently).
const useAwake = Platform.OS === 'web' ? () => {} : useKeepAwake;

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Counts down from `seconds`. Uses the wall clock, so it stays right even if
// the phone is slow or the app was in the background.
function useTimer(seconds, onDone) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const endAt = useRef(null);
  const done = useRef(onDone);
  done.current = onDone;

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
        done.current?.();
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

// What they said, as a cooking command (English, Hindi and Hinglish).
function commandFrom(words) {
  const w = ` ${words.toLowerCase()} `;
  if (/\b(next|agla|aage|aagey|done|ho gaya|hogaya|ok next|continue)\b|अगला|आगे|हो गया/.test(w)) return 'next';
  if (/\b(back|previous|peeche|piche|pichla|go back)\b|पीछे|पिछला/.test(w)) return 'back';
  if (/\b(repeat|again|dobara|phir se|phirse|what|kya)\b|दोबारा|फिर से|क्या/.test(w)) return 'repeat';
  if (/\b(start|timer|shuru)\b|शुरू|टाइमर/.test(w)) return 'timer';
  if (/\b(stop|pause|ruko|rukho)\b|रुको/.test(w)) return 'pause';
  return null;
}

function Pill({ icon, label, onPress }) {
  return (
    <PressScale scaleTo={0.92} role="button" onPress={onPress} style={styles.pill}>
      <Icon name={icon} size={16} color={colors.cream} strokeWidth={2.4} />
      <Text style={styles.pillText}>{label}</Text>
    </PressScale>
  );
}

// Confetti falling from the top when the dish is done.
const CONFETTI = ['#E8A93A', '#C8161D', '#FFF4E6', '#1E7A44', '#F2B06E', '#A92E5A'];
function Piece({ i }) {
  const fall = useSharedValue(0);
  const left = (i * 37) % 100;
  const size = 6 + ((i * 7) % 6);
  useEffect(() => {
    fall.value = withDelay((i % 8) * 90, withTiming(1, { duration: 2200 + (i % 5) * 260, easing: Easing.out(Easing.quad) }));
  }, [fall, i]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - fall.value,
    transform: [{ translateY: -40 + fall.value * 720 }, { translateX: Math.sin(fall.value * 6 + i) * 24 }, { rotate: `${fall.value * (i % 2 ? 540 : -540)}deg` }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.piece, { left: `${left}%`, width: size, height: size * 1.6, backgroundColor: CONFETTI[i % CONFETTI.length] }, style]} />;
}
const Confetti = () => Array.from({ length: 36 }, (_, i) => <Piece key={i} i={i} />);

export default function Cook() {
  useAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const current = useCookStore((s) => s.current);
  const openRecipe = useCookStore((s) => s.openRecipe);
  const recipe = current?.id === id ? current : null;
  const addDish = useKitchen((s) => s.addDish);

  const [stage, setStage] = useState('prep'); // prep | steps | done | saved
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState({}); // ingredient id → ticked
  const [error, setError] = useState(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [busy, setBusy] = useState(null); // 'camera' | 'library' | 'skip'
  const [result, setResult] = useState(null); // { dish, unlocked }
  const alive = useRef(true);

  useEffect(() => {
    if (!recipe) openRecipe(id).catch((err) => setError(errorMessage(err)));
  }, [id, recipe, openRecipe]);
  useEffect(() => {
    readCookVoice().then(setVoiceOn);
    useVoiceSettings.getState().load();
  }, []);

  const step = recipe?.steps[index];
  const total = recipe?.steps.length ?? 0;
  const timer = useTimer(step?.timer ?? 0, () => voiceOn && say(t("Time's up! Check and move on.")));
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  // ---------- voice ----------
  const canListen = !voiceUnavailableReason();
  const listen = useVoice({
    onFinal: (words) => run(commandFrom(words)),
    onError: () => {}, // nothing heard: just stop listening quietly
  });

  function say(text, then) {
    if (!voiceOn || !useVoiceSettings.getState().available) return;
    speak(text, `cook-${id}`)
      .then((how) => how === 'ended' && alive.current && then?.())
      .catch(() => {});
  }

  // Read the step aloud when it appears; then listen for "next".
  useEffect(() => {
    if (stage !== 'steps' || !step) return;
    say(t('Step {n}. {text}', { n: index + 1, text: t(step.text) }), () => canListen && listen.start());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, index, voiceOn]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        stopSpeaking();
        listen.cancel();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function toggleVoice() {
    tap();
    const on = !voiceOn;
    setVoiceOn(on);
    saveCookVoice(on);
    if (!on) {
      stopSpeaking();
      listen.cancel();
    }
  }

  function run(command) {
    if (!command) return;
    if (command === 'next') goNext();
    else if (command === 'back') index > 0 && setIndex((i) => i - 1);
    else if (command === 'repeat') say(t('Step {n}. {text}', { n: index + 1, text: t(step.text) }), () => canListen && listen.start());
    else if (command === 'timer' && step?.timer) timer.start();
    else if (command === 'pause') timer.pause();
  }

  function goNext() {
    press();
    stopSpeaking();
    listen.cancel();
    if (index === total - 1) finish();
    else setIndex((i) => i + 1);
  }

  // ---------- the end ----------
  function finish() {
    setStage('done');
    try {
      const clap = createAudioPlayer(require('../../assets/sounds/applause.wav'));
      clap.play();
      setTimeout(() => clap.remove?.(), 4000);
    } catch {}
    if (Platform.OS !== 'web') Vibration.vibrate([0, 80, 60, 80, 60, 160]);
    say(t('Wah! You made {name}. Show me your dish!', { name: recipe.name }));
  }

  async function save(source) {
    if (busy) return;
    setBusy(source);
    try {
      const photo = source === 'skip' ? null : await pickKitchenPhoto(source);
      if (source !== 'skip' && !photo) return; // cancelled the camera
      const saved = await addDish(recipe, photo);
      setResult(saved);
      setStage('saved');
      if (saved.unlocked.length) say(t('New achievement: {name}!', { name: t(saved.unlocked[0].title) }));
    } catch (err) {
      notify(t("Couldn't save the photo"), err.code === 'PERMISSION' ? t(err.message) + ' ' + t('You can allow it in Settings.') : errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!recipe) {
    return (
      <View style={[styles.root, styles.center]}>
        {error ? <Text style={styles.stepText}>{error}</Text> : <ActivityIndicator color={colors.gold} size="large" />}
      </View>
    );
  }

  const timeUp = step?.timer && timer.left === 0;
  const ticked = recipe.ingredients.filter((i) => ready[i.id]).length;

  return (
    <View style={styles.root}>
      <MaroonBand height="100%" rounded={false} />
      <View style={[styles.header, { marginTop: insets.top + space.base }]}>
        <IconButton name="close" label={t('Exit cook mode')} onDark onPress={exit} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.stepCount}>
            {stage === 'prep' ? t('Get ready') : stage === 'steps' ? t('Step {n} of {total}', { n: index + 1, total }) : t('All done')}
          </Text>
        </View>
        <PressScale scaleTo={0.88} role="switch" aria-checked={voiceOn} aria-label={voiceOn ? t('Voice on. Tap to turn off') : t('Voice off. Tap to turn on')} onPress={toggleVoice} style={[styles.voiceBtn, voiceOn && styles.voiceOn]}>
          <Icon name={voiceOn ? 'speaker' : 'mute'} size={20} color={voiceOn ? colors.maroon : colors.cream} />
        </PressScale>
      </View>
      <View style={styles.progress}>
        {recipe.steps.map((s, i) => (
          <View key={s.n} style={[styles.bar, { backgroundColor: stage === 'done' || stage === 'saved' || (stage === 'steps' && i < index) ? colors.cream : stage === 'steps' && i === index ? colors.gold : 'rgba(255,255,255,0.18)' }]} />
        ))}
      </View>

      {stage === 'prep' ? (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <Animated.View entering={rise(0, 100)} style={styles.prepHead}>
              <Text style={styles.prepTitle}>{t("Let's get everything ready")}</Text>
              <Text style={styles.prepSub}>{t('Tick what you have on the counter. {n} of {total} ready.', { n: ticked, total: recipe.ingredients.length })}</Text>
            </Animated.View>
            {recipe.ingredients.map((item, n) => {
              const on = Boolean(ready[item.id]);
              return (
                <Animated.View key={item.id} entering={rise(Math.min(n, 10), 200)}>
                  <PressScale
                    scaleTo={0.98}
                    role="checkbox"
                    aria-checked={on}
                    onPress={() => {
                      tap();
                      setReady((r) => ({ ...r, [item.id]: !on }));
                    }}
                    style={[styles.check, on && styles.checkOn]}
                  >
                    <View style={[styles.box, on && styles.boxOn]}>{on ? <Icon name="check" size={14} color={colors.maroon} strokeWidth={3} /> : null}</View>
                    <Text style={[styles.checkName, on && styles.checkNameOn]}>{item.label}</Text>
                    <Text style={styles.checkQty} numberOfLines={1}>
                      {item.qty}
                    </Text>
                  </PressScale>
                </Animated.View>
              );
            })}
            <View style={styles.voiceNote}>
              <Icon name={voiceOn ? 'speaker' : 'mute'} size={16} color={colors.gold} />
              <Text style={styles.voiceNoteText}>
                {voiceOn ? t('Chatora will read each step aloud. Say "next", "repeat" or "back" with messy hands.') : t('Voice is off. Tap the speaker at the top to turn it on.')}
              </Text>
            </View>
          </ScrollView>
          <View style={[styles.nav, { paddingBottom: insets.bottom + space.lg }]}>
            <Button title={t('Start cooking')} variant="gold" icon={<Icon name="play" size={18} color={colors.maroon} />} onPress={() => (press(), setStage('steps'))} style={{ flex: 1 }} />
          </View>
        </>
      ) : stage === 'steps' ? (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <Animated.View key={index} entering={fromRight()} exiting={leave}>
              <View style={styles.ringWrap}>
                {step.timer ? (
                  <>
                    <PlateRing size={200} value={timer.left / Math.max(step.timer, timer.left)} dark ticks instant={timer.running}>
                      <Text style={[styles.time, timeUp && { color: colors.gold }]}>{timeUp ? t("Time's up") : clock(timer.left)}</Text>
                      <Text style={styles.timeLabel}>{timeUp ? t('Check and move on') : timer.running ? t('left on timer') : timer.left === step.timer ? t('timer ready') : t('paused')}</Text>
                    </PlateRing>
                    <View style={styles.pills}>
                      {timeUp ? (
                        <Pill icon="restart" label={t('Restart')} onPress={timer.reset} />
                      ) : timer.running ? (
                        <Pill icon="pause" label={t('Pause')} onPress={timer.pause} />
                      ) : (
                        <Pill icon="play" label={timer.left === step.timer ? t('Start timer') : t('Resume')} onPress={timer.start} />
                      )}
                      <Pill icon="plus" label={t('1 min')} onPress={timer.addMinute} />
                    </View>
                  </>
                ) : (
                  <PlateRing size={160} value={(index + 1) / total} dark ticks>
                    <Text style={styles.time}>{index + 1}</Text>
                    <Text style={styles.timeLabel}>{t('of {total} steps', { total })}</Text>
                  </PlateRing>
                )}
              </View>

              <View style={styles.stepCard}>
                <Text style={styles.stepText}>{t(step.text)}</Text>
                {step.uses.length ? (
                  <View style={styles.uses}>
                    {step.uses.map((u) => (
                      <View key={u} style={styles.use}>
                        <Text style={styles.useText}>{u}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              {step.tip ? (
                <View style={styles.tip}>
                  <Icon name="spark" size={18} color={colors.gold} />
                  <Text style={styles.tipText}>
                    <Text style={{ fontFamily: fonts.bold, color: colors.cream }}>{t('Tip:')} </Text>
                    {step.tip}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>

          {voiceOn && canListen ? (
            <Pressable role="button" onPress={() => (listen.listening ? listen.stop() : listen.start())} style={styles.listenRow} aria-label={t('Say a command')}>
              {listen.listening ? <VoiceBars level={listen.level} color={colors.gold} height={14} /> : <Icon name="mic" size={15} color={colors.gold} />}
              <Text style={styles.listenText}>{listen.listening ? t('Listening… say "next", "repeat" or "back"') : t('Tap and say "next", "repeat" or "back"')}</Text>
            </Pressable>
          ) : null}

          <View style={[styles.nav, { paddingBottom: insets.bottom + space.lg }]}>
            <PressScale scaleTo={0.9} role="button" aria-label={t('Previous step')} disabled={index === 0} onPress={() => setIndex((i) => i - 1)} style={[styles.prev, index === 0 && { opacity: 0.35 }]}>
              <Icon name="back" size={22} color={colors.cream} />
            </PressScale>
            <Button
              title={index === total - 1 ? t("I'm done") : t('Next step')}
              variant="gold"
              icon={<Icon name={index === total - 1 ? 'check' : 'arrow'} size={18} color={colors.maroon} />}
              onPress={goNext}
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : stage === 'done' ? (
        <View style={styles.doneWrap}>
          <Confetti />
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <PlateRing size={170} value={1} dark ticks>
              <Icon name="trophy" size={60} color={colors.gold} strokeWidth={2} />
            </PlateRing>
          </Animated.View>
          <Animated.Text entering={rise(0, 400)} style={styles.doneTitle}>
            {t('Wah! You made {name}!', { name: recipe.name })}
          </Animated.Text>
          <Animated.Text entering={rise(1, 400)} style={styles.doneText}>
            {t('Show me your dish! Your photo stays on your phone, in My Kitchen.')}
          </Animated.Text>
          <Animated.View entering={rise(2, 400)} style={styles.doneButtons}>
            <Button title={t('Take a photo')} variant="gold" loading={busy === 'camera'} icon={<Icon name="camera" size={18} color={colors.maroon} />} onPress={() => save('camera')} />
            <Button title={t('Choose a photo')} variant="outline" loading={busy === 'library'} icon={<Icon name="image" size={18} color={colors.ink} />} onPress={() => save('library')} />
            <Pressable role="button" onPress={() => save('skip')} style={styles.again}>
              <Text style={styles.againText}>{t('Skip the photo')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { alignItems: 'center', paddingBottom: insets.bottom + space.xl }]}>
          {result?.dish.photo ? (
            <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.photoFrame}>
              <Image source={{ uri: result.dish.photo }} style={styles.photo} accessibilityLabel={recipe.name} />
            </Animated.View>
          ) : (
            <Animated.View entering={appear(0)}>
              <PlateRing size={150} value={1} dark ticks>
                <Icon name="check" size={56} color={colors.gold} strokeWidth={2.4} />
              </PlateRing>
            </Animated.View>
          )}
          <Text style={styles.doneTitle}>{t('Saved to My Kitchen')}</Text>
          {result?.unlocked.length ? (
            <>
              <Text style={styles.unlockedLabel}>{t('Achievement unlocked!')}</Text>
              {result.unlocked.map((a, i) => (
                <Animated.View key={a.id} entering={FadeIn.delay(300 + i * 250).duration(400)} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <Icon name={a.icon} size={22} color={colors.maroon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.badgeTitle}>{t(a.title)}</Text>
                    <Text style={styles.badgeText}>{t(a.text)}</Text>
                  </View>
                </Animated.View>
              ))}
            </>
          ) : (
            <Text style={styles.doneText}>{t('Every dish you cook counts towards your next achievement.')}</Text>
          )}
          <View style={styles.doneButtons}>
            <Button title={t('See My Kitchen')} variant="gold" icon={<Icon name="trophy" size={18} color={colors.maroon} />} onPress={() => router.replace('/my-kitchen')} />
            <Pressable role="button" onPress={() => router.replace('/home')} style={styles.again}>
              <Text style={styles.againText}>{t('Back to Home')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const glass = { borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.08)' };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#160203' },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.cream },
  stepCount: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  voiceBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...glass },
  voiceOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  progress: { flexDirection: 'row', gap: 4, marginHorizontal: space.lg, marginTop: space.base },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  prepHead: { marginTop: space.lg, marginBottom: space.md },
  prepTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: colors.cream },
  prepSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted, marginTop: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.base, marginTop: space.sm, borderRadius: 16, ...glass },
  checkOn: { borderColor: 'rgba(232,169,58,0.5)', backgroundColor: 'rgba(232,169,58,0.12)' },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkName: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.cream },
  checkNameOn: { color: colors.gold },
  checkQty: { maxWidth: '45%', fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted, textAlign: 'right' },
  voiceNote: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginTop: space.lg, padding: space.md, borderRadius: 14, backgroundColor: 'rgba(232,169,58,0.12)' },
  voiceNoteText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.creamMuted },
  ringWrap: { alignItems: 'center', gap: space.md, marginTop: space.lg },
  time: { fontFamily: fonts.display, fontSize: 50, lineHeight: 54, color: colors.cream, textAlign: 'center' },
  timeLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted, marginTop: 2 },
  pills: { flexDirection: 'row', gap: space.sm },
  pill: { height: 40, paddingHorizontal: space.base, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6, ...glass },
  pillText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  stepCard: { marginTop: space.lg, padding: space.base, borderRadius: 20, ...glass },
  stepText: { fontFamily: fonts.display, fontSize: 23, lineHeight: 31, color: colors.cream },
  uses: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.base },
  use: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(232,169,58,0.16)' },
  useText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  tip: { flexDirection: 'row', gap: space.md, marginTop: space.base, padding: space.md, paddingHorizontal: space.base, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(232,169,58,0.35)', backgroundColor: 'rgba(232,169,58,0.14)' },
  tipText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted },
  listenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 36, marginHorizontal: space.lg },
  listenText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  nav: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  prev: { width: 52, height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', ...glass },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
  doneTitle: { marginTop: space.lg, fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.cream, textAlign: 'center' },
  doneText: { marginTop: space.sm, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.creamMuted, textAlign: 'center' },
  doneButtons: { alignSelf: 'stretch', gap: space.sm, marginTop: space.lg },
  again: { height: 44, alignItems: 'center', justifyContent: 'center' },
  againText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.cream, textDecorationLine: 'underline' },
  photoFrame: { marginTop: space.lg, padding: 6, borderRadius: 24, backgroundColor: colors.gold },
  photo: { width: 240, height: 240, borderRadius: 18 },
  unlockedLabel: { ...{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }, color: colors.gold, marginTop: space.lg },
  badge: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, padding: space.md, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,169,58,0.45)', backgroundColor: 'rgba(232,169,58,0.14)' },
  badgeIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.cream },
  badgeText: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
});
