import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { t, currentLang } from './i18n';

// Speech-to-text uses the phone's own recogniser (Google on Android, Apple on
// iPhone, the browser's on web), so it's free and fast. Expo Go doesn't ship the
// native module, so it's only loaded in a real app build or the browser.
function loadSpeech() {
  if (Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

const speech = loadSpeech();

// Indian English hears Hinglish ("kuch teekha 400 ke andar") as Latin text,
// which is what both Claude and the keyword parser expect.
// Hindi interface listens for Hindi; otherwise Indian English (Hinglish).
const LANG = () => (currentLang() === 'hi' ? 'hi-IN' : 'en-IN');
const FOOD_WORDS = [
  'biryani', 'pav bhaji', 'vada pav', 'paneer', 'chaat', 'pani puri', 'momos', 'dosa', 'idli', 'thali', 'misal',
  'chole bhature', 'rasmalai', 'gulab jamun', 'jalebi', 'kulfi', 'falooda', 'teekha', 'meetha', 'halka', 'ke andar', 'rupaye',
];

const ERRORS = {
  'not-allowed': 'Allow microphone access for Kya Khaun in your phone settings, then try again.',
  'service-not-allowed': "Speech recognition isn't available on this phone. You can type instead.",
  'language-not-supported': "This phone can't recognise Indian English yet. You can type instead.",
  network: "Couldn't reach the speech service. Check your internet and try again.",
  'audio-capture': "Couldn't use the microphone. Another app may be using it.",
  busy: 'The microphone is busy. Try again in a moment.',
};
const NOTHING_HEARD = "I didn't catch that. Tap the mic and say something like \"kuch teekha, 400 ke andar\".";

// Why voice can't be used right now, or null when it can.
export function voiceUnavailableReason() {
  if (!speech) return t('Voice works in the installed Kya Khaun app. In Expo Go, please type your craving.');
  try {
    if (!speech.isRecognitionAvailable()) return t("This phone doesn't have speech recognition. You can type instead.");
  } catch {
    // Older recognisers don't report availability; just try.
  }
  return null;
}

// Listen once and hand back what was said.
//   onFinal(text)  — the finished sentence
//   onError(msg)   — a friendly reason it didn't work
// `heard` is the live transcript, `level` is mic loudness from 0 to 1.
export function useVoice({ onFinal, onError }) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [level, setLevel] = useState(0);
  const handlers = useRef({ onFinal, onError });
  handlers.current = { onFinal, onError };
  // Several screens use this hook; only the one that started listening reacts.
  const active = useRef(false);
  const text = useRef('');
  const failure = useRef(null);

  const reset = useCallback(() => {
    active.current = false;
    text.current = '';
    failure.current = null;
    setListening(false);
    setHeard('');
    setLevel(0);
  }, []);

  useEffect(() => {
    if (!speech) return undefined;
    const finish = () => {
      if (!active.current) return;
      const said = text.current.trim();
      const why = failure.current;
      reset();
      if (said) handlers.current.onFinal?.(said);
      else if (why !== 'aborted') handlers.current.onError?.(t(ERRORS[why] ?? NOTHING_HEARD));
    };
    const subs = [
      speech.addListener('result', (e) => {
        if (!active.current) return;
        text.current = e.results?.[0]?.transcript ?? text.current;
        setHeard(text.current);
        if (e.isFinal) finish();
      }),
      speech.addListener('volumechange', (e) => {
        if (active.current) setLevel(Math.max(0, Math.min(1, e.value / 10)));
      }),
      speech.addListener('error', (e) => {
        if (active.current) failure.current = e.error;
      }),
      speech.addListener('end', finish),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      if (active.current) {
        active.current = false;
        try {
          speech.abort();
        } catch {}
      }
    };
  }, [reset]);

  const start = useCallback(async () => {
    const reason = voiceUnavailableReason();
    if (reason) {
      handlers.current.onError?.(reason);
      return;
    }
    const permission = await speech.requestPermissionsAsync();
    if (!permission.granted) {
      handlers.current.onError?.(t(ERRORS['not-allowed']));
      return;
    }
    reset();
    active.current = true;
    setListening(true);
    try {
      speech.start({
        lang: LANG(),
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        contextualStrings: FOOD_WORDS,
        iosTaskHint: 'search',
        volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
      });
    } catch {
      reset();
      handlers.current.onError?.(t(ERRORS['service-not-allowed']));
    }
  }, [reset]);

  // Stop listening and use what was heard so far.
  const stop = useCallback(() => {
    if (active.current) speech?.stop();
  }, []);

  // Throw away what was heard.
  const cancel = useCallback(() => {
    if (!active.current) return;
    failure.current = 'aborted';
    text.current = '';
    speech?.abort();
    reset();
  }, [reset]);

  return { listening, heard, level, start, stop, cancel };
}
