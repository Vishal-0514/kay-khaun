// Festival and season specials for Home. Festivals follow the lunar calendar,
// so their dates move every year: check and extend this list each year.
// Seasons repeat every year (month-day ranges, India).
//
// slots: what the special asks the picker for, same shape as a chat's slots.

export const FESTIVALS = [
  { id: 'diwali-2026', from: '2026-10-31', to: '2026-11-11', title: 'Diwali sweets', subtitle: 'Mithai and festive treats to share', icon: 'sweet', slots: { moods: ['sweet'], dishWords: ['mithai'] } },
  { id: 'christmas-2026', from: '2026-12-20', to: '2026-12-26', title: 'Christmas treats', subtitle: 'Cakes, custard and something sweet', icon: 'sweet', slots: { moods: ['sweet'], dishWords: ['custard', 'cake'] } },
  { id: 'new-year-2027', from: '2026-12-30', to: '2027-01-01', title: 'New Year party food', subtitle: 'Biryani, kebabs and starters for the night', icon: 'spark', slots: { moods: ['comfort'], dishWords: ['biryani', 'tikka'] } },
];

// [from MM-DD, to MM-DD] — a range may wrap past New Year.
export const SEASONS = [
  { id: 'winter', from: '12-01', to: '02-28', title: 'Winter warmers', subtitle: 'Nihari, thukpa and hot comfort food', icon: 'bowl', slots: { moods: ['comfort'], dishWords: ['nihari', 'thukpa'] } },
  { id: 'summer', from: '03-15', to: '06-10', title: 'Summer coolers', subtitle: 'Kulfi, curd rice and light meals', icon: 'leaf', slots: { moods: ['light', 'sweet'], dishWords: ['kulfi', 'curd'] } },
  { id: 'monsoon', from: '06-11', to: '09-30', title: 'Monsoon cravings', subtitle: 'Chai, vada pav and hot snacks for the rain', icon: 'cart', slots: { moods: ['street', 'comfort'], dishWords: ['chai', 'vada pav'] } },
  { id: 'festive', from: '10-01', to: '11-30', title: 'Festive season', subtitle: 'Sweets and family favourites', icon: 'sweet', slots: { moods: ['sweet', 'comfort'] } },
];

// Today's date in India as YYYY-MM-DD.
function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function inSeason(md, { from, to }) {
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

// A festival beats the season it falls in.
export function currentOccasion(now = new Date()) {
  const today = todayInIndia(now);
  const festival = FESTIVALS.find((f) => today >= f.from && today <= f.to);
  if (festival) return festival;
  const md = today.slice(5);
  return SEASONS.find((s) => inSeason(md, s)) ?? null;
}

export const findOccasion = (id) => FESTIVALS.find((f) => f.id === id) ?? SEASONS.find((s) => s.id === id) ?? null;
