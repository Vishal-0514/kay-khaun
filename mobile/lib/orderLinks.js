import { Linking } from 'react-native';
import { notify } from './notify';
import { useMeStore } from '../store/useMeStore';
import { t } from './i18n';

// Kya Khaun suggests; the customer orders on Zomato or Swiggy. These open the
// restaurant there (the app if it's installed, otherwise the website).
// Kya Khaun isn't affiliated with either, so both look the same and neutral
// (no brand colours or logos).
export const ORDER_APPS = {
  zomato: { label: 'Zomato', color: '#2B0F0B' },
  swiggy: { label: 'Swiggy', color: '#2B0F0B' },
};

export const NOT_AFFILIATED = "Kya Khaun isn't linked to Zomato or Swiggy. Check the menu and price there before you order.";

export async function openOrderApp(pick, app) {
  // Heading to Zomato / Swiggy is the best sign they liked it: History and taste learning.
  if (pick) useMeStore.getState().track('ordered', pick, app);
  const url = pick?.links?.[app];
  if (!url) {
    notify(t('Sample restaurant'), t('This is a sample dish for testing, so it isn\'t on Zomato or Swiggy. Real nearby restaurants appear once location and Google Places are set up.'));
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    notify(t("Couldn't open {app}", { app: ORDER_APPS[app].label }), t('Search for "{name}" in {app}.', { name: pick.name, app: ORDER_APPS[app].label }));
  }
}
