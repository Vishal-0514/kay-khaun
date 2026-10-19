import { Linking, Platform } from 'react-native';
import { notify } from './notify';
import { useMeStore } from '../store/useMeStore';
import { t } from './i18n';

// Go Out: open turn-by-turn directions to a place. iPhone opens Apple Maps;
// everywhere else opens Google Maps (the app if installed, else the website).
export const isOuting = (item) => item?.source === 'outing';

export function directionsUrl(place) {
  if (Platform.OS === 'ios' && place.lat != null && place.lng != null) {
    return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`;
  }
  return (
    place.links?.directions ??
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.lat != null ? `${place.lat},${place.lng}` : place.name)}`
  );
}

export async function openDirections(place) {
  // Heading there is the strongest sign they liked it: History and taste learning.
  useMeStore.getState().track('ordered', place, 'maps');
  try {
    await Linking.openURL(directionsUrl(place));
  } catch {
    notify(t("Couldn't open Maps"), t('Search for "{name}" in your maps app.', { name: place.name }));
  }
}

export async function openInGoogleMaps(place) {
  const url = place.links?.maps ?? directionsUrl(place);
  try {
    await Linking.openURL(url);
  } catch {
    notify(t("Couldn't open Maps"), t('Search for "{name}" in your maps app.', { name: place.name }));
  }
}

// "★ 4.6 · 12 min by car · 3.1 km"
export function travelText(place) {
  return place.travelMin ? t('{n} min by car', { n: place.travelMin }) : t('{n} km', { n: place.distanceKm });
}
