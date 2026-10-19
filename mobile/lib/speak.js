import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { api } from './api';
import { currentLang } from './i18n';

// Chatora's voice. The server turns a reply into speech (Google Cloud, a male
// or female voice in Indian English or Hindi) and hands back a short MP3 link;
// this plays it. Settings live on this phone.

export const VOICES = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];
export const VOICE_LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
];

const KEY = 'kk-voice';
const DEFAULTS = { voice: 'female', language: null, readAloud: false };

async function read() {
  try {
    const raw = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

async function write(settings) {
  try {
    const raw = JSON.stringify(settings);
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {}
}

export const useVoiceSettings = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,
  available: null, // null until the server says whether it can speak

  async load() {
    if (get().loaded) return;
    set({ ...(await read()), loaded: true });
    if (get().available === null) {
      api
        .get('/voice/status')
        .then(({ data }) => set({ available: Boolean(data.enabled) }))
        .catch(() => set({ available: false }));
    }
  },

  update(patch) {
    set(patch);
    const { voice, language, readAloud } = get();
    write({ voice, language, readAloud });
  },
}));

// The language Chatora listens for and speaks: the choice in Profile, or the app's language.
export const voiceLanguage = () => useVoiceSettings.getState().language ?? currentLang();

// ---------- playback ----------

const origin = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
let player = null;
let playing = null; // { id, done }
let guard = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(playing?.id ?? null));
}

// Re-render when what's speaking changes. Returns an unsubscribe function.
export function onSpeaking(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const speakingId = () => playing?.id ?? null;

// The id of what's being spoken right now (or null), for a play/stop button.
export function useSpeaking() {
  const [id, setId] = useState(speakingId);
  useEffect(() => onSpeaking(setId), []);
  return id;
}

function finish(reason) {
  const current = playing;
  playing = null;
  clearTimeout(guard);
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {}
    player = null;
  }
  emit();
  current?.done(reason);
}

export function stopSpeaking() {
  if (playing) finish('stopped');
}

// Say `text` aloud. Resolves 'ended' when it finishes, 'stopped' if something
// else cut it off, and rejects if it couldn't be spoken at all.
export async function speak(text, id = text) {
  stopSpeaking();
  const { voice } = useVoiceSettings.getState();
  return new Promise((resolve, reject) => {
    const me = { id, done: resolve };
    playing = me;
    emit();
    api
      .post('/voice/speak', { text, voice })
      .then(async ({ data }) => {
        if (playing !== me) return;
        // A phone on silent should still speak when asked to; and after the mic,
        // switch the audio back from the earpiece to the speaker.
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false }).catch(() => {});
        if (playing !== me) return;
        player = createAudioPlayer({ uri: origin + data.url });
        player.addListener('playbackStatusUpdate', (status) => {
          if (playing === me && status.didJustFinish) finish('ended');
        });
        player.play();
        // If the clip never reports its end (a dropped connection), don't leave a
        // hands-free conversation waiting: give up after a generous estimate.
        guard = setTimeout(() => playing === me && finish('ended'), Math.min(60000, 4000 + text.length * 110));
      })
      .catch((err) => {
        if (playing !== me) return;
        playing = null;
        emit();
        reject(err);
      });
  });
}
