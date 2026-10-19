import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import ChatoraAvatar from '../components/ChatoraAvatar';
import Icon from '../components/Icon';
import VoiceBars from '../components/VoiceBars';
import { Glow, PressScale, TypingDots } from '../components/Motion';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { errorMessage } from '../lib/api';
import { press, tap } from '../lib/haptics';
import { useVoice, voiceUnavailableReason } from '../lib/voice';
import { VOICES, speak, stopSpeaking, useVoiceSettings, voiceLanguage } from '../lib/speak';
import { colors, fonts, radius, space } from '../lib/theme';
import { t } from '../lib/i18n';

// Talk to Chatora: a full-screen voice conversation, like a phone call.
// Chatora greets you by name, then it goes round: you speak → it thinks → its
// avatar answers out loud → it listens again. Tap the big button to talk, to
// send early, or to cut Chatora off. Nothing listens once you leave the screen.
//   ?chat=1 carries on the chat that's open; otherwise a new chat starts.

function greeting(name, lang) {
  const n = name ? `, ${name.trim().split(/\s+/)[0]}` : '';
  const hour = new Date().getHours();
  const late = hour >= 22 || hour < 5;
  const lines =
    lang === 'hi'
      ? [
          `नमस्ते${n}! बताइए, मैं आपकी क्या मदद करूँ?`,
          `हाय${n}! आज क्या खाने का मन है?`,
          late ? `रात की भूख${n}? बताइए क्या खाना है।` : `${hour < 12 ? 'सुप्रभात' : 'नमस्ते'}${n}! भूख लगी है? बताइए क्या खाना है।`,
        ]
      : [
          `Hi${n}! How can I help you today?`,
          `Hey${n}! What are you in the mood to eat?`,
          late
            ? `Hi${n}! Late-night hunger? Tell me what you feel like.`
            : `Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}${n}! Hungry? Tell me what you feel like eating.`,
          `Namaste${n}! Kya khaane ka mood hai?`,
        ];
  return lines[Math.floor(Math.random() * lines.length)];
}

// A soft ring that keeps spreading out while Chatora listens.
function ListeningRing({ size }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - p.value), transform: [{ scale: 0.85 + 0.35 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style]} />;
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
    const hello = greeting(user?.name, voiceLanguage());
    if (settings.available) say(hello, 'greeting');
    else {
      setSaid(hello);
      setHint(t("Chatora's voice isn't available right now, but you can still talk and read the replies."));
    }
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

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.top}>
        <PressScale scaleTo={0.9} role="button" aria-label={t('End voice chat')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} style={styles.topBtn}>
          <Icon name="close" size={20} color={colors.cream} />
        </PressScale>
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
        <PressScale scaleTo={0.9} role="button" aria-label={t('Type instead')} onPress={toChat} style={styles.topBtn}>
          <Icon name="chat" size={19} color={colors.cream} />
        </PressScale>
      </View>

      <View style={styles.stage}>
        <View style={styles.portraitWrap}>
          <Glow size={280} color={colors.gold} style={{ top: 0, left: 0 }} />
          {phase === 'listening' ? <ListeningRing size={280} /> : null}
          <View style={styles.portrait}>
            <ChatoraAvatar key={settings.voice} voice={settings.voice} state={phase} micLevel={talk.level} size={214} />
          </View>
        </View>
        <Text style={styles.name}>{t('Chatora')}</Text>
        <View style={styles.statusRow} aria-live="polite">
          {phase === 'listening' ? <View style={styles.liveDot} /> : phase === 'thinking' ? <TypingDots color={colors.gold} /> : null}
          <Text style={styles.status}>{t(STATUS[phase])}</Text>
        </View>
      </View>

      <ScrollView style={styles.captions} contentContainerStyle={styles.captionsIn} showsVerticalScrollIndicator={false}>
        {caption ? (
          <Text style={styles.you} numberOfLines={3}>
            “{caption}”
          </Text>
        ) : null}
        {said ? (
          <Animated.Text key={said} entering={FadeIn.duration(300)} style={styles.said}>
            {said}
          </Animated.Text>
        ) : null}
        {reply?.kind === 'picks' && reply.picks?.length ? (
          <PressScale scaleTo={0.97} role="button" onPress={() => open('/results')} style={styles.card}>
            <Icon name="bag" size={20} color={colors.red} />
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
            <Icon name="pin" size={20} color={colors.red} />
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
            <Icon name="pot" size={20} color={colors.red} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.maroonDeep },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.base },
  topBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,244,230,0.1)', alignItems: 'center', justifyContent: 'center' },
  voices: { flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: 'rgba(255,244,230,0.1)' },
  voice: { paddingHorizontal: 14, height: 34, borderRadius: radius.full, justifyContent: 'center' },
  voiceOn: { backgroundColor: colors.gold },
  voiceText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.creamMuted },
  voiceTextOn: { color: colors.maroonDeep },
  stage: { alignItems: 'center', justifyContent: 'center', paddingTop: space.base },
  portraitWrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  portrait: { width: 236, height: 236, borderRadius: 118, overflow: 'hidden', backgroundColor: '#F6D49B', borderWidth: 4, borderColor: colors.gold, alignItems: 'center', justifyContent: 'flex-end' },
  ring: { position: 'absolute', top: 0, left: 0, borderWidth: 2, borderColor: colors.gold },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.cream, marginTop: space.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 22 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5A5F' },
  status: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  captions: { flex: 1, marginTop: space.base },
  captionsIn: { paddingHorizontal: space.lg, gap: space.md, alignItems: 'center' },
  you: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.creamMuted, textAlign: 'center' },
  said: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, color: colors.cream, textAlign: 'center' },
  hint: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.gold, textAlign: 'center' },
  card: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.md },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  cardLink: { fontFamily: fonts.bold, fontSize: 12, color: colors.red },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  option: { height: 40, paddingHorizontal: space.base, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,244,230,0.35)', justifyContent: 'center' },
  optionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  controls: { alignItems: 'center', gap: space.sm, paddingTop: space.md },
  main: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,244,230,0.25)' },
  mainLive: { borderColor: colors.gold },
  mainHint: { fontFamily: fonts.medium, fontSize: 13, color: colors.creamMuted },
});
