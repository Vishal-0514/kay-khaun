import { t, currentLang } from './i18n';

const locale = () => (currentLang() === 'hi' ? 'hi-IN' : 'en-IN');

// "Today", "Yesterday", or "Fri, 3 Oct".
export function dayLabel(iso) {
  const d = new Date(iso);
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 864e5);
  if (days === 0) return t('Today');
  if (days === 1) return t('Yesterday');
  return d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export const timeOf = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
