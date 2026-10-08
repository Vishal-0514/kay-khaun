import { Platform, Share } from 'react-native';
import { toast } from '../components/Toast';
import { notify } from './notify';
import { dayTotal, shownPick } from '../store/usePlanStore';

// Sharing a pick or a day plan through the phone's share sheet (WhatsApp,
// Telegram, SMS…). Kya Khaun's store link is added once the app is listed.
const APP_LINK = process.env.EXPO_PUBLIC_APP_LINK || null;
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
const footer = () => (APP_LINK ? `\n\nPlan yours with Kya Khaun?\n${APP_LINK}` : '\n\nPicked with Kya Khaun?');

export function pickMessage(pick) {
  const place = pick.source === 'places';
  const facts = place
    ? [pick.rating ? `★ ${pick.rating.toFixed(1)}` : null, pick.distanceKm != null ? `${pick.distanceKm} km` : null, pick.priceLabel].filter(Boolean)
    : [pick.price != null ? rupees(pick.price) : null, pick.eta ? `about ${pick.eta} min` : null].filter(Boolean);
  const where = place ? pick.name : `${pick.name} from ${pick.restaurant}`;
  const link = pick.links?.zomato ? `\nZomato: ${pick.links.zomato}` : '';
  const swiggy = pick.links?.swiggy ? `\nSwiggy: ${pick.links.swiggy}` : '';
  return `Kya khaun? Chatora picked ${where}${facts.length ? ` (${facts.join(' · ')})` : ''}. Let's order this?${link}${swiggy}${footer()}`;
}

export function planMessage(plan, choice, cook) {
  const lines = plan.meals.map((m) => {
    const p = shownPick(m, choice);
    if (cook[m.meal] && p.home) return `${m.label}: ${p.home.name} (cooking at home)`;
    const price = p.price != null ? ` · ${rupees(p.price)}` : '';
    return `${m.label}: ${p.name}${p.restaurant && p.restaurant !== p.name ? `, ${p.restaurant}` : ''}${price}`;
  });
  const total = dayTotal(plan, choice, cook);
  const sum = total != null ? `\nTotal ${rupees(total)} of ${rupees(plan.budget)}` : '';
  return `My food plan for today:\n${lines.join('\n')}${sum}${footer()}`;
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
        toast('Copied — paste it in WhatsApp', 'check');
        return true;
      } catch {
        // fall through to showing the text
      }
    }
    notify('Share this', message);
    return false;
  }
}
