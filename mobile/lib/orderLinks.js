import { openLink } from './safeLink';
import { notify } from './notify';
import { api } from './api';
import { useMeStore } from '../store/useMeStore';
import { toast } from '../components/Toast';
import { t } from './i18n';

// Kya Khaun suggests; the customer orders on Zomato or Swiggy. These open the
// restaurant's own page there (the app if it's installed, otherwise the website).
// Kya Khaun isn't affiliated with either, so both look the same and neutral
// (no brand colours or logos).
export const ORDER_APPS = {
  zomato: { label: 'Zomato', color: '#2B0F0B' },
  swiggy: { label: 'Swiggy', color: '#2B0F0B' },
};

export const NOT_AFFILIATED = "Kya Khaun isn't linked to Zomato or Swiggy. Check the menu and price there before you order.";

// Pages already found in this session, so a second tap opens straight away.
const found = new Map(); // "zomato:<place id>" → { url, found }
const finding = new Map(); // the same, while the server is still looking

// The restaurant's own page on the app (the server finds it once, then remembers).
// A search on that app's site if it isn't listed there.
function orderPage(pick, app) {
  const key = `${app}:${pick.id}`;
  if (found.has(key)) return Promise.resolve(found.get(key));
  if (!finding.has(key)) {
    const ask = api
      .post('/order/page', { app, id: pick.id, name: pick.name, area: pick.area || undefined, city: pick.city || undefined }, { timeout: 30000 })
      .then(({ data }) => {
        const page = { url: data.url, found: data.found };
        found.set(key, page);
        return page;
      })
      .finally(() => finding.delete(key));
    finding.set(key, ask);
  }
  return finding.get(key);
}

export async function openOrderApp(pick, app) {
  const label = ORDER_APPS[app].label;
  // Heading to Zomato / Swiggy is the best sign they liked it: History and taste learning.
  if (pick) useMeStore.getState().track('ordered', pick, app);
  let url = pick?.links?.[app];
  if (!url) {
    notify(t('Sample restaurant'), t('This is a sample dish for testing, so it isn\'t on Zomato or Swiggy. Real nearby restaurants appear once location and Google Places are set up.'));
    return;
  }
  // Real places: go to the restaurant itself, not a search that loses the name.
  if (pick.source === 'places' && pick.id) {
    const key = `${app}:${pick.id}`;
    if (!found.has(key)) toast(t('Finding {name} on {app}…', { name: pick.name, app: label }), 'search');
    try {
      const page = await orderPage(pick, app);
      url = page.url;
      if (!page.found) toast(t('{name} isn’t listed on {app}. Here’s a search instead.', { name: pick.name, app: label }), 'search');
    } catch {
      // Server busy or offline: the plain search link still works.
    }
  }
  try {
    await openLink(url);
  } catch {
    notify(t("Couldn't open {app}", { app: label }), t('Search for "{name}" in {app}.', { name: pick.name, app: label }));
  }
}
