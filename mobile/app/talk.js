import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import ChatoraAvatar from '../components/ChatoraAvatar';
import Icon from '../components/Icon';
import VoiceBars from '../components/VoiceBars';
import { PressScale, TypingDots } from '../components/Motion';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { errorMessage } from '../lib/api';
import { press, tap } from '../lib/haptics';
import { useVoice, voiceUnavailableReason } from '../lib/voice';
import { VOICES, speak, stopSpeaking, useVoiceSettings, voiceLanguage } from '../lib/speak';
import { colors, fonts, radius, shadow, space } from '../lib/theme';
import { t } from '../lib/i18n';
import { greetingSuggestions, nextGreeting } from '../lib/greetings';

// Talk to Chatora: a full-screen voice conversation, like a phone call.
// Chatora greets you by name, then it goes round: you speak → it thinks → its
// avatar answers out loud → it listens again. Tap the big button to talk, to
// send early, or to cut Chatora off. Nothing listens once you leave the screen.
//   ?chat=1 carries on the chat that's open; otherwise a new chat starts.

// Soft rings that keep spreading out while Chatora listens.
function Ripple({ size, delay }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2100, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - p.value), transform: [{ scale: 0.82 + 0.45 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

function ListeningRings({ size }) {
  return [0, 700, 1400].map((d) => <Ripple key={d} size={size} delay={d} />);
}

// A slow warm glow behind Chatora that breathes (brighter while it speaks).
function Halo({ size, strong }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: (strong ? 0.6 : 0.32) + 0.25 * p.value, transform: [{ scale: 0.96 + 0.06 * p.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="talkHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#F7C76A" stopOpacity="0.9" />
            <Stop offset="0.55" stopColor="#E8A93A" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#E8A93A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#talkHalo)" />
      </Svg>
    </Animated.View>
  );
}

// Deep maroon backdrop with soft light, like a stage.
function Backdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
      <Defs>
        <LinearGradient id="talkBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6A0C12" />
          <Stop offset="0.5" stopColor="#3A0508" />
          <Stop offset="1" stopColor="#1C0204" />
        </LinearGradient>
        <RadialGradient id="talkSpot" cx="50%" cy="28%" r="55%">
          <Stop offset="0" stopColor="#C8161D" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#C8161D" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#talkBg)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#talkSpot)" />
      {[
        ['12%', '16%', 1.6],
        ['86%', '12%', 2],
        ['78%', '38%', 1.3],
        ['18%', '44%', 1.2],
        ['92%', '60%', 1.5],
        ['8%', '70%', 1.8],
      ].map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#F7C76A" opacity={0.5} />
      ))}
    </Svg>
  );
}

// Chatora's words appear one by one, as it says them. The rest of the line is
// already laid out (invisible), so the card doesn't jump while it grows.
function Spoken({ text, style }) {
  const words = text.split(' ');
  const [shown, setShown] = useState(1);
  useEffect(() => {
    setShown(1);
    const timer = setInterval(() => setShown((n) => (n >= words.length ? n : n + 1)), 85);
    return () => clearInterval(timer);
  }, [text]);
  return (
    <Text style={style} aria-label={text}>
      {words.slice(0, shown).join(' ')}
      <Text style={{ opacity: 0 }}>{words.length > shown ? ' ' + words.slice(shown).join(' ') : ''}</Text>
    </Text>
  );
}

const STATUS = {
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  idle: 'Tap the mic to talk',
};

export default function Talk() {
  const router = useRouter();
  const { chat } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const send = useChatStore((s) => s.send);
  const settings = useVoiceSettings();

  const [phase, setPhase] = useState('idle'); // idle | listening | thinking | speaking
  const [you, setYou] = useState('');
  const [said, setSaid] = useState(''); // what Chatora said last
  const [reply, setReply] = useState(null); // the last reply, for its picks and choices
  const [hint, setHint] = useState(null);
  const [ideas] = useState(() => greetingSuggestions(3)); // buttons under the welcome, until the first question
  const [asked, setAsked] = useState(false);

  // Every turn gets a number; anything finishing from an older turn is ignored.
  const turn = useRef(0);
  const alive = useRef(true);
  const greeted = useRef(false);

  const talk = useVoice({
    onFinal: (words) => submit(words),
    onError: (message) => {
      setHint(message);
      setPhase('idle');
    },
  });

  function listen() {
    const unavailable = voiceUnavailableReason();
    if (unavailable) {
      setHint(unavailable);
      setPhase('idle');
      return;
    }
    turn.current += 1;
    stopSpeaking();
    setHint(null);
    setPhase('listening');
    press();
    talk.start();
  }

  function say(text, id) {
    const mine = ++turn.current;
    setSaid(text);
    if (!useVoiceSettings.getState().available) {
      setPhase('idle');
      return;
    }
    setPhase('speaking');
    speak(text, id, { levels: true })
      .then((how) => {
        if (mine !== turn.current || !alive.current) return;
        if (how === 'ended') listen();
        else setPhase('idle');
      })
      .catch(() => {
        if (mine !== turn.current) return;
        setHint(t("Couldn't play Chatora's voice. Check your internet and try again."));
        setPhase('idle');
      });
  }

  async function submit(words) {
    const mine = ++turn.current;
    talk.cancel();
    stopSpeaking();
    setYou(words);
    setAsked(true);
    setSaid('');
    setReply(null);
    setHint(null);
    setPhase('thinking');
    try {
      const data = await send(words);
      if (mine !== turn.current || !alive.current) return;
      const ai = data.conversation.messages.filter((m) => m.role === 'ai').at(-1);
      if (!ai) return setPhase('idle');
      setReply(ai);
      say(t(ai.text), String(ai.id));
    } catch (err) {
      if (mine !== turn.current) return;
      setHint(errorMessage(err));
      setPhase('idle');
    }
  }

  // Leaving, or the app going to the background, ends listening and speaking.
  function hush() {
    turn.current += 1;
    talk.cancel();
    stopSpeaking();
    setPhase('idle');
  }

  useEffect(() => {
    if (chat !== '1') useChatStore.getState().newChat();
    settings.load();
    const sub = AppState.addEventListener('change', (state) => state !== 'active' && hush());
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        hush();
      };
    }, [])
  );

  // Greet once the voice settings are known.
  useEffect(() => {
    if (greeted.current || !settings.loaded || settings.available === null) return;
    greeted.current = true;
    // A different welcome every time (lib/greetings.js).
    nextGreeting(user?.name, voiceLanguage()).then((hello) => {
      if (!alive.current) return;
      if (settings.available) say(hello, 'greeting');
      else {
        setSaid(hello);
        setHint(t("Chatora's voice isn't available right now, but you can still talk and read the replies."));
      }
    });
  }, [settings.loaded, settings.available]);

  function onMain() {
    if (phase === 'thinking') return;
    if (phase === 'listening') return talk.stop(); // done speaking: send it now
    listen(); // idle, or cutting Chatora off mid-sentence
  }

  function choose(option) {
    tap();
    if (option.id === 'scan') {
      hush();
      router.push({ pathname: '/kitchen', params: { from: 'chat' } });
    } else submit(option.label);
  }

  function open(path) {
    tap();
    hush();
    router.push(path);
  }

  // Back to typing, in the same chat.
  function toChat() {
    tap();
    hush();
    if (chat === '1') router.back();
    else router.replace('/chat');
  }

  function pickVoice(voice) {
    tap();
    settings.update({ voice });
  }

  const caption = phase === 'listening' ? talk.heard : you;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.base }]}>
      <Backdrop />
      <View style={styles.top}>
        <View style={styles.voices} role="radiogroup" aria-label={t('Voice')}>
          {VOICES.map((v) => (
            <PressScale
              key={v.id}
              role="radio"
              aria-checked={settings.voice === v.id}
              onPress={() => pickVoice(v.id)}
              style={[styles.voice, settings.voice === v.id && styles.voiceOn]}
            >
              <Text style={[styles.voiceText, settings.voice === v.id && styles.voiceTextOn]}>{t(v.label)}</Text>
            </PressScale>
          ))}
        </View>
      </View>

      <View style={styles.stage}>
        <View style={styles.portraitWrap}>
          <Halo size={PORTRAIT + 70} strong={phase === 'speaking'} />
          {phase === 'listening' ? <ListeningRings size={PORTRAIT + 18} /> : null}
          <View style={styles.portraitRing}>
            <View style={styles.portrait}>
              <ChatoraAvatar key={settings.voice} voice={settings.voice} state={phase} micLevel={talk.level} size={PORTRAIT - 44} />
            </View>
          </View>
        </View>
        <Text style={styles.name}>{t('Chatora')}</Text>
        <Text style={styles.role}>{t('Your food decision buddy')}</Text>
        <View style={[styles.statusPill, phase === 'listening' && styles.statusLive]} aria-live="polite">
          {phase === 'listening' ? (
            <View style={styles.liveDot} />
          ) : phase === 'thinking' ? (
            <TypingDots color={colors.gold} />
          ) : phase === 'speaking' ? (
            <Icon name="speaker" size={14} color={colors.gold} />
          ) : null}
          <Text style={styles.status}>{t(STATUS[phase])}</Text>
        </View>
      </View>

      <ScrollView style={styles.captions} contentContainerStyle={styles.captionsIn} showsVerticalScrollIndicator={false}>
        {caption ? (
          <View style={styles.youBubble}>
            <Text style={styles.you} numberOfLines={3}>
              {caption}
            </Text>
          </View>
        ) : null}
        {said ? (
          <Animated.View key={said} entering={FadeInDown.duration(380)} style={styles.saidCard}>
            <Spoken text={said} style={styles.said} />
          </Animated.View>
        ) : null}
        {!asked && said && phase !== 'thinking' ? (
          <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.options}>
            {ideas.map((idea) => (
              <PressScale
                key={idea}
                role="button"
                onPress={() => {
                  tap();
                  submit(idea);
                }}
                style={styles.option}
              >
                <Icon name="spark" size={13} color={colors.gold} />
                <Text style={styles.optionText}>{idea}</Text>
              </PressScale>
            ))}
          </Animated.View>
        ) : null}
        {reply?.kind === 'picks' && reply.picks?.length ? (
          <PressScale scaleTo={0.97} role="button" onPress={() => open('/results')} style={styles.card}>
            <View style={styles.cardIcon}>
              <Icon name="bag" size={18} color={colors.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {reply.picks[0].name}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {reply.picks[0].restaurant}
              </Text>
            </View>
            <Text style={styles.cardLink}>{t('See all {n}', { n: reply.picks.length })}</Text>
          </PressScale>
        ) : null}
        {reply?.kind === 'outings' && reply.outings?.length ? (
          <PressScale scaleTo={0.97} role="button" onPress={() => open('/outings')} style={styles.card}>
            <View style={styles.cardIcon}>
              <Icon name="pin" size={18} color={colors.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {reply.outings[0].name}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {reply.outings[0].travelMin ? t('{n} min by car', { n: reply.outings[0].travelMin }) : reply.outings[0].restaurant}
              </Text>
            </View>
            <Text style={styles.cardLink}>{t('See all {n}', { n: reply.outings.length })}</Text>
          </PressScale>
        ) : null}
        {reply?.kind === 'recipes' && reply.recipes?.length ? (
          <PressScale scaleTo={0.97} role="button" onPress={() => open('/recipes')} style={styles.card}>
            <View style={styles.cardIcon}>
              <Icon name="pot" size={18} color={colors.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {reply.recipes[0].name}
              </Text>
              <Text style={styles.cardSub}>{t('{n} min', { n: reply.recipes[0].time })}</Text>
            </View>
            <Text style={styles.cardLink}>{t('See all {n}', { n: reply.recipes.length })}</Text>
          </PressScale>
        ) : null}
        {reply?.options?.length && phase !== 'thinking' ? (
          <View style={styles.options}>
            {reply.options.map((o) => (
              <PressScale key={o.id} role="button" onPress={() => choose(o)} style={styles.option}>
                <Text style={styles.optionText}>{o.id === 'scan' ? t('Scan or pick ingredients') : t(o.label)}</Text>
              </PressScale>
            ))}
          </View>
        ) : null}
        {hint ? (
          <Animated.Text entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={styles.hint}>
            {hint}
          </Animated.Text>
        ) : null}
      </ScrollView>

      <View style={styles.controls}>
        <View style={styles.side}>
          <PressScale scaleTo={0.9} role="button" aria-label={t('Type instead')} onPress={toChat} style={styles.sideBtn}>
            <Icon name="type" size={20} color={colors.cream} />
          </PressScale>
          <Text style={styles.sideText}>{t('Type')}</Text>
        </View>
        <View style={styles.mainCol}>
          <PressScale
            scaleTo={0.9}
            role="button"
            aria-label={phase === 'listening' ? t('Done speaking') : phase === 'speaking' ? t('Interrupt and talk') : t('Speak now')}
            onPress={onMain}
            disabled={phase === 'thinking'}
            style={[styles.main, phase === 'listening' && styles.mainLive, phase === 'thinking' && { opacity: 0.55 }]}
          >
            {phase === 'listening' ? <VoiceBars level={talk.level} color="#FFFFFF" height={30} /> : <Icon name="mic" size={30} color="#FFFFFF" />}
          </PressScale>
          <Text style={styles.mainHint}>
            {phase === 'listening'
              ? t('Tap when you’re done')
              : phase === 'speaking'
                ? t('Tap to interrupt')
                : phase === 'thinking'
                  ? ' '
                  : t('Tap to talk')}
          </Text>
        </View>
        <View style={styles.side}>
          <PressScale scaleTo={0.9} role="button" aria-label={t('End voice chat')} onPress={close} style={[styles.sideBtn, styles.endBtn]}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </PressScale>
          <Text style={styles.sideText}>{t('End')}</Text>
        </View>
      </View>
    </View>
  );
}

const PORTRAIT = 236;

// Frosted glass on the maroon backdrop.
const glass = { backgroundColor: 'rgba(255,244,230,0.08)', borderWidth: 1, borderColor: 'rgba(255,244,230,0.14)' };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.maroonDeep },
  top: { alignItems: 'center', paddingHorizontal: space.base },
  voices: { flexDirection: 'row', padding: 4, borderRadius: radius.full, ...glass },
  voice: { paddingHorizontal: 16, height: 34, borderRadius: radius.full, justifyContent: 'center' },
  voiceOn: { backgroundColor: colors.gold },
  voiceText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.creamMuted },
  voiceTextOn: { color: colors.maroonDeep },
  stage: { alignItems: 'center', justifyContent: 'center' },
  portraitWrap: { width: PORTRAIT + 70, height: PORTRAIT + 70, alignItems: 'center', justifyContent: 'center' },
  portraitRing: { width: PORTRAIT, height: PORTRAIT, borderRadius: PORTRAIT / 2, padding: 5, backgroundColor: colors.gold, borderWidth: 2, borderColor: '#F7D58C' },
  portrait: { flex: 1, borderRadius: PORTRAIT / 2, overflow: 'hidden', backgroundColor: '#F8DDB0', borderWidth: 3, borderColor: '#9C1B20', alignItems: 'center', justifyContent: 'flex-end' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: colors.gold },
  name: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, color: colors.cream, marginTop: -10 },
  role: { fontFamily: fonts.medium, fontSize: 13, color: colors.creamMuted },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 30, paddingHorizontal: 14, marginTop: space.sm, borderRadius: radius.full, ...glass },
  statusLive: { borderColor: 'rgba(255,90,95,0.5)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5A5F' },
  status: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  captions: { flex: 1, marginTop: space.md },
  captionsIn: { paddingHorizontal: space.base, gap: space.md, paddingBottom: space.sm },
  youBubble: { alignSelf: 'flex-end', maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 6, backgroundColor: 'rgba(232,169,58,0.18)', borderWidth: 1, borderColor: 'rgba(232,169,58,0.3)' },
  you: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.cream },
  saidCard: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22, borderTopLeftRadius: 6, ...glass },
  said: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, color: colors.cream },
  hint: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.gold, textAlign: 'center' },
  card: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.md },
  cardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  cardLink: { fontFamily: fonts.bold, fontSize: 12, color: colors.red },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  option: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6, ...glass, borderColor: 'rgba(232,169,58,0.35)' },
  optionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  controls: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-evenly', paddingTop: space.md },
  side: { alignItems: 'center', gap: 6, paddingTop: 12 },
  sideBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...glass },
  endBtn: { backgroundColor: '#B3141A', borderColor: '#D6363C' },
  sideText: { fontFamily: fonts.medium, fontSize: 12, color: colors.creamMuted },
  mainCol: { alignItems: 'center', gap: space.sm },
  main: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(247,199,106,0.55)', ...shadow.red, shadowOpacity: 0.5 },
  mainLive: { borderColor: colors.gold, backgroundColor: '#D81E25' },
  mainHint: { fontFamily: fonts.medium, fontSize: 13, color: colors.creamMuted },
});
