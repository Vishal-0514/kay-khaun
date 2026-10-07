import { create } from 'zustand';
import * as Location from 'expo-location';

// Where the user is, so picks are real places near them. Asked once, with a
// friendly fallback (Andheri West) if they say no or the phone can't tell.
const FALLBACK = { lat: 19.1364, lng: 72.8296, area: 'Andheri West', city: 'Mumbai' };

export const useLocationStore = create((set, get) => ({
  lat: null,
  lng: null,
  area: null,
  city: null,
  status: 'idle', // idle | locating | ready | denied | fallback

  async locate() {
    if (get().status === 'locating') return;
    set({ status: 'locating' });
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return set({ ...FALLBACK, status: 'denied' });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      let area = null;
      let city = null;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        area = place?.district || place?.subregion || place?.name || null;
        city = place?.city || place?.subregion || null;
      } catch {
        // Address lookup is optional (and not available in every browser).
      }
      set({ lat, lng, area, city, status: 'ready' });
    } catch {
      set({ ...FALLBACK, status: 'fallback' });
    }
  },

  // What the server needs, or undefined before we know anything.
  forApi() {
    const { lat, lng, city } = get();
    return lat == null ? undefined : { lat, lng, ...(city ? { city } : {}) };
  },

  label() {
    const { area, city, status } = get();
    if (status === 'locating' || status === 'idle') return 'Finding you…';
    return [area, city].filter(Boolean).join(', ') || 'Near you';
  },
}));
