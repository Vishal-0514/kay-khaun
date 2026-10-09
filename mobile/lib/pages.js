import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from './theme';

// The privacy policy, terms and delete-account pages live on our server
// (server/src/legal/pages.js), so the app stores and the app share one copy.
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100/api';
export const SITE = baseURL.replace(/\/api\/?$/, '');

export const PAGES = { privacy: '/privacy', terms: '/terms', deleteAccount: '/delete-account' };

export function openPage(path) {
  const url = SITE + path;
  if (Platform.OS === 'web') return window.open(url, '_blank', 'noopener');
  return WebBrowser.openBrowserAsync(url, { toolbarColor: colors.maroon, controlsColor: colors.gold }).catch(() => {});
}
