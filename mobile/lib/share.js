import { Platform, Share } from 'react-native';
import { toast } from '../components/Toast';
import { notify } from './notify';
import { dayTotal, shownPick } from '../store/usePlanStore';
import { t } from './i18n';

// Sharing a pick or a day plan through the phone's share sheet (WhatsApp,
// Telegram, SMS…). Kya Khaun's store link is added once the app is listed.
const APP_LINK = process.env.EXPO_PUBLIC_APP_LINK || null;
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
const NL = '\n';
const footer = () => (APP_LINK ? NL + NL + t('Plan yours with Kya Khaun?') + NL + APP_LINK : NL + NL + t('Picked with Kya Khaun?'));

export function pickMessage(pick) {
  const place = pick.source === 'places';
  const facts = place
    ? [pick.rating ? `★ ${pick.rating.toFixed(1)}` : null, pick.distanceKm != null ? t('{n} km', { n: pick.distanceKm }) : null, pick.priceLabel].filter(Boolean)
    : [pick.price != null ? rupees(pick.price) : null, pick.eta ? t('about {n} min', { n: pick.eta }) : null].filter(Boolean);
  const where = place ? pick.name : t('{name} from {restaurant}', { name: pick.name, restaurant: pick.restaurant });
  const links = [pick.links?.zomato && `Zomato: ${pick.links.zomato}`, pick.links?.swiggy && `Swiggy: ${pick.links.swiggy}`].filter(Boolean);
  const what = facts.length ? `${where} (${facts.join(' · ')})` : where;
  return [t("Kya khaun? Chatora picked {what}. Let's order this?", { what }), ...links].join(NL) + footer();
}

export function planMessage(plan, choice, cook) {
  const lines = plan.meals.map((m) => {
    const p = shownPick(m, choice);
    if (cook[m.meal] && p.home) return `${m.label}: ${t('{name} (cooking at home)', { name: p.home.name })}`;
    const price = p.price != null ? ` · ${rupees(p.price)}` : '';
    return `${m.label}: ${p.name}${p.restaurant && p.restaurant !== p.name ? `, ${p.restaurant}` : ''}${price}`;
  });
  const total = dayTotal(plan, choice, cook);
  const people = plan.people > 1 ? plan.people : 1;
  const sum =
    total == null
      ? null
      : people > 1
        ? t('Total {total} per person ({group} for {n}) of {budget}', { total: rupees(total), group: rupees(total * people), n: people, budget: rupees(plan.budget) })
        : t('Total {total} of {budget}', { total: rupees(total), budget: rupees(plan.budget) });
  const heading = people > 1 ? t('Our food plan for today ({n} of us)', { n: people }) : t('My food plan for today');
  return [`${heading}:`, ...lines, sum].filter(Boolean).join(NL) + footer();
}

// Opens the share sheet; in a browser without one, copies the text instead.
export async function shareText(message) {
  try {
    const result = await Share.share({ message });
    return result.action !== Share.dismissedAction;
  } catch {
    if (Platform.OS === 'web' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(message);
        toast(t('Copied — paste it in WhatsApp'), 'check');
        return true;
      } catch {
        // fall through to showing the text
      }
    }
    notify(t('Share this'), message);
    return false;
  }
}
