import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import HI from './i18n.hi';

// App language: English or Hindi. Screens call t('English text'); the Hindi
// table (lib/i18n.hi.js) is keyed by that same English text, so anything not
// translated yet simply stays in English. {name} placeholders are filled from vars.

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
];

const KEY = 'kk-language';

export const useLang = create((set) => ({
  lang: 'en',
  ready: false,
  async load() {
    try {
      const saved = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
      set({ lang: saved === 'hi' ? 'hi' : 'en', ready: true });
    } catch {
      set({ ready: true });
    }
  },
  async setLang(lang) {
    set({ lang });
    try {
      if (Platform.OS === 'web') window.localStorage.setItem(KEY, lang);
      else await SecureStore.setItemAsync(KEY, lang);
    } catch {
      // The choice still applies for this session.
    }
  },
}));

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text);

export function t(text, vars) {
  if (typeof text !== 'string') return text;
  const lang = useLang.getState().lang;
  return fill(lang === 'hi' ? HI[text] ?? text : text, vars);
}

// In components: re-renders when the language changes.
export function useT() {
  useLang((s) => s.lang);
  return t;
}

export const currentLang = () => useLang.getState().lang;
