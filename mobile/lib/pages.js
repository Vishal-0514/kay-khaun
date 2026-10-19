import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from './theme';

// The privacy policy, terms, delete-account and support pages live on the
// company website, the same pages the App Store and Play listings link to.
export const SITE = 'https://www.karisglobalretail.com/apps/kya-khaun';

export const PAGES = { privacy: '/privacy', terms: '/terms', deleteAccount: '/delete-account', support: '/support' };

export function openPage(path) {
  const url = SITE + path;
  if (Platform.OS === 'web') return window.open(url, '_blank', 'noopener');
  return WebBrowser.openBrowserAsync(url, { toolbarColor: colors.maroon, controlsColor: colors.gold }).catch(() => {});
}
