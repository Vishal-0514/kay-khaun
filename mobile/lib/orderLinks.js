import { Linking } from 'react-native';
import { notify } from './notify';

// Kya Khaun suggests; the customer orders on Zomato or Swiggy. These open the
// restaurant there (the app if it's installed, otherwise the website).
export const ORDER_APPS = {
  zomato: { label: 'Zomato', color: '#E23744' },
  swiggy: { label: 'Swiggy', color: '#FC8019' },
};

export async function openOrderApp(pick, app) {
  const url = pick?.links?.[app];
  if (!url) {
    notify('Sample restaurant', 'This is a sample dish for testing, so it isn\'t on Zomato or Swiggy. Real nearby restaurants appear once location and Google Places are set up.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    notify(`Couldn't open ${ORDER_APPS[app].label}`, `Search for "${pick.name}" in ${ORDER_APPS[app].label}.`);
  }
}
