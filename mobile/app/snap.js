import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import VoiceBars from '../components/VoiceBars';
import { PressScale, appear, rise } from '../components/Motion';
import { useChatStore } from '../store/useChatStore';
import { SONG_LANGUAGES, useSongStore } from '../store/useSongStore';
import { currentLang } from '../lib/i18n';
import { useAuthStore } from '../store/useAuthStore';
import { pickKitchenPhoto } from '../lib/photo';
import { useVoice } from '../lib/voice';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { press, tap } from '../lib/haptics';
import { colors, fonts, radius, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// Snap: show Chatora where you are (Snap My Mood), your kitchen (recipes), or
// your food (songs for the moment).
// The "where I am" photo is read once for the setting — inside or out, day or
// night, rain, how many at the table, a drink in view — and isn't kept.
// Chatora never guesses how anyone feels from it.

const MODES = [
  { id: 'mood', label: 'Where I am', icon: 'pin' },
  { id: 'kitchen', label: 'My kitchen', icon: 'pot' },
  { id: 'food', label: 'My food', icon: 'music' },
];

const COPY = {
  mood: {
    prompt: "Can't decide? Show me where you are",
    promptText: 'Snap the table, the room or the view. Chatora suggests food and places that fit.',
    title: 'Snap my mood',
    sub: 'Add a line if you like: who you’re with, what you’re drinking, what you feel like.',
    placeholder: 'e.g. "drinking chai, want something fun"',
    button: 'Find ideas',
    working: 'Reading the setting…',
  },
  food: {
    prompt: 'Snap your food, get your song',
    promptText: 'Show me what you’re eating. Chatora picks 3–4 songs for the moment.',
    title: 'Songs for your meal',
    sub: 'Choose the language, and add a line if you like: rain outside, with friends…',
    placeholder: 'e.g. "raining outside, with friends"',
    button: 'Get my songs',
    working: 'Picking songs…',
  },
};

function ScanLine() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [p]);
  const animated = useAnimatedStyle(() => ({ top: `${4 + p.value * 92}%` }));
  return <Animated.View pointerEvents="none" style={[styles.scanLine, animated]} />;
}

export default function Snap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const aiOff = useAuthStore((s) => s.user?.aiConsent === false);
  const snapMood = useChatStore((s) => s.snapMood);
  const findSongs = useSongStore((s) => s.find);
  const params = useLocalSearchParams();
  const [mode, setMode] = useState(params.mode === 'food' ? 'food' : 'mood');
  const [language, setLanguage] = useState(currentLang() === 'hi' ? 'hindi' : 'both');
  const copy = COPY[mode];
  const [shot, setShot] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);
  const talk = useVoice({ onFinal: (said) => setNote(said), onError: (message) => setHint(message) });

  function chooseMode(id) {
    tap();
    if (id === 'kitchen') router.replace('/kitchen');
    else {
      setMode(id);
      setHint(null);
    }
  }

  async function takePhoto(source) {
    if (aiOff) {
      notify(t('Snap My Mood uses AI'), t('Turn on "Use AI" in Profile to use it, or tell Chatora in words.'));
      return;
    }
    setHint(null);
    try {
      const picked = await pickKitchenPhoto(source);
      if (picked) setShot(picked);
    } catch (err) {
      notify(err.code === 'PERMISSION' ? t('Allow access') : t("Couldn't open the camera"), err.code === 'PERMISSION' ? t('{reason} Turn it on in your phone settings.', { reason: err.message }) : err.message);
    }
  }

  async function findIdeas() {
    if (!shot || busy) return;
    press();
    talk.cancel();
    setBusy(true);
    setHint(null);
    try {
      if (mode === 'food') {
        const data = await findSongs({ image: shot.base64, mediaType: shot.mediaType, language, ...(note.trim() ? { note: note.trim() } : {}) });
        if (data.unusable) setHint(data.message);
        else router.replace('/songs');
      } else {
        const data = await snapMood(shot, note.trim());
        if (data.unusable) setHint(data.message);
        else router.replace('/chat');
      }
    } catch (err) {
      setHint(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.camera, { paddingTop: insets.top + space.base }]}>
          <View style={styles.header}>
            <IconButton name="close" label={t('Close')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <View style={styles.modes} role="tablist">
              {MODES.map((m) => (
                <PressScale key={m.id} role="tab" aria-selected={m.id === mode} onPress={() => chooseMode(m.id)} style={[styles.mode, m.id === mode && styles.modeOn]}>
                  <Icon name={m.icon} size={13} color={m.id === mode ? colors.maroonDeep : colors.cream} />
                  <Text style={[styles.modeText, m.id === mode && styles.modeTextOn]} numberOfLines={1}>
                    {t(m.label)}
                  </Text>
                </PressScale>
              ))}
            </View>
          </View>

          <Animated.View entering={appear(0, 150)} style={styles.frame}>
            {shot ? (
              <>
                <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" aria-label={t('Your photo')} />
                {busy ? <ScanLine /> : null}
                {busy ? (
                  <View style={styles.overlay}>
                    <ActivityIndicator color={colors.gold} size="large" />
                    <Text style={styles.overlayText}>{t(copy.working)}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.prompt}>
                <View style={styles.promptIcon}>
                  <Icon name="camera" size={28} color={colors.gold} />
                </View>
                <Text style={styles.promptTitle}>{t(copy.prompt)}</Text>
                <Text style={styles.promptText}>{t(copy.promptText)}</Text>
              </View>
            )}
          </Animated.View>

          <View style={[styles.shutterRow, aiOff && { opacity: 0.45 }]}>
            <PressScale scaleTo={0.88} role="button" aria-label={t('Choose a photo')} onPress={() => takePhoto('library')} disabled={busy} style={styles.gallery}>
              <Icon name="image" size={22} color="#FFFFFF" />
            </PressScale>
            <PressScale scaleTo={0.88} role="button" aria-label={t('Take a photo')} onPress={() => takePhoto('camera')} disabled={busy} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </PressScale>
            <View style={{ width: 48 }} />
          </View>
        </View>

        <Animated.View entering={rise(0, 250)} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Text style={type.title} role="heading">
            {t(copy.title)}
          </Text>
          <Text style={[type.small, { marginTop: space.xs }]}>{t(copy.sub)}</Text>

          {mode === 'food' ? (
            <View style={styles.langs} role="radiogroup" aria-label={t('Song language')}>
              {SONG_LANGUAGES.map((l) => (
                <PressScale key={l.id} role="radio" aria-checked={language === l.id} onPress={() => setLanguage(l.id)} style={[styles.lang, language === l.id && styles.langOn]}>
                  <Text style={[styles.langText, language === l.id && styles.langTextOn]}>{l.id === 'hindi' ? l.label : t(l.label)}</Text>
                </PressScale>
              ))}
            </View>
          ) : null}

          <View style={styles.noteBar}>
            <TextInput
              value={talk.listening ? talk.heard : note}
              onChangeText={setNote}
              placeholder={t(copy.placeholder)}
              placeholderTextColor="#B3A196"
              style={styles.noteInput}
              aria-label={t('Add a line for Chatora')}
              maxLength={200}
              editable={!talk.listening}
            />
            <PressScale scaleTo={0.88} role="button" aria-label={talk.listening ? t('Done speaking') : t('Speak')} onPress={talk.listening ? talk.stop : talk.start} style={styles.noteMic}>
              {talk.listening ? <VoiceBars level={talk.level} color="#FFFFFF" height={18} /> : <Icon name="mic" size={18} color="#FFFFFF" />}
            </PressScale>
          </View>

          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <Button title={busy ? t(copy.working) : t(copy.button)} loading={busy} disabled={!shot || busy} onPress={findIdeas} style={{ marginTop: space.lg }} />
          <View style={styles.privacy}>
            <Icon name="lock" size={14} color={colors.muted} />
            <Text style={styles.privacyText}>
              {mode === 'food'
                ? t("The photo is only read to pick songs and isn't saved. Songs open in your own music app.")
                : t("The photo is only read for the setting and isn't saved. Chatora never guesses how anyone feels from it.")}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.maroonDeep },
  camera: { backgroundColor: colors.maroonDeep, paddingBottom: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.base },
  modes: { flex: 1, flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: 'rgba(255,244,230,0.1)' },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6, height: 34, borderRadius: radius.full },
  modeOn: { backgroundColor: colors.gold },
  modeText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.creamMuted },
  modeTextOn: { color: colors.maroonDeep },
  frame: { marginHorizontal: space.lg, marginTop: space.lg, aspectRatio: 4 / 3, maxWidth: '100%', borderRadius: radius.cardLg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(232,169,58,0.5)', backgroundColor: 'rgba(255,244,230,0.05)' },
  prompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  promptIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(232,169,58,0.15)', alignItems: 'center', justifyContent: 'center' },
  promptTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.cream, textAlign: 'center' },
  promptText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(58,5,8,0.45)', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  overlayText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cream },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.8, shadowRadius: 8 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, marginTop: space.lg },
  gallery: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,244,230,0.12)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.red },
  sheet: { flexGrow: 1, backgroundColor: colors.canvas, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.lg },
  langs: { flexDirection: 'row', gap: 4, marginTop: space.base, padding: 4, borderRadius: radius.full, backgroundColor: colors.soft },
  lang: { flex: 1, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  langOn: { backgroundColor: colors.maroon },
  langText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  langTextOn: { color: colors.gold },
  noteBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.base, height: 52, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, paddingLeft: 18, paddingRight: 5 },
  noteInput: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  noteMic: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: space.md, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.goldText, backgroundColor: colors.goldSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden' },
  privacy: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: space.md },
  privacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
});
