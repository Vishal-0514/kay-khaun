// Festival and season specials for Home: what people eat for each festival,
// and the dishes to show. Tapping a dish finds restaurants near you that serve it.
//
// Festivals follow the lunar calendar, so their dates move every year: check
// and extend this list each year (dates from Drik Panchang and national
// holiday lists; Islamic festivals depend on the moon and may move by a day).
// Each festival shows from a few days before, so it's on Home in time.
// When no festival is on, the season shows instead.
//
// dishes: { id, name, hi (Hindi name), icon (app icon) }.
// diet: 'veg' for fasting and prasad festivals (no meat shown).
// note: a short line shown on the card, such as "Vrat-friendly".

const d = (id, name, hi, icon) => ({ id, name, hi, icon });

const NAVRATRI_DISHES = [
  d('sabudana-khichdi', 'Sabudana khichdi', 'साबूदाना खिचड़ी', 'bowl'),
  d('kuttu-puri', 'Kuttu ki puri', 'कुट्टू की पूरी', 'pot'),
  d('sabudana-vada', 'Sabudana vada', 'साबूदाना वड़ा', 'snack'),
  d('singhare-halwa', 'Singhare ka halwa', 'सिंघाड़े का हलवा', 'sweet'),
  d('makhana-kheer', 'Makhana kheer', 'मखाना खीर', 'sweet'),
  d('vrat-aloo', 'Vrat wale aloo', 'व्रत वाले आलू', 'bowl'),
  d('samak-pulao', 'Samak rice pulao', 'समक चावल पुलाव', 'bowl'),
];
const DIWALI_DISHES = [
  d('kaju-katli', 'Kaju katli', 'काजू कतली', 'sweet'),
  d('gulab-jamun', 'Gulab jamun', 'गुलाब जामुन', 'sweet'),
  d('motichoor-ladoo', 'Motichoor ladoo', 'मोतीचूर लड्डू', 'sweet'),
  d('rasmalai', 'Rasmalai', 'रसमलाई', 'sweet'),
  d('chakli', 'Chakli', 'चकली', 'snack'),
  d('chole-bhature', 'Chole bhature', 'छोले भटूरे', 'pot'),
];
const VRAT = 'Vrat-friendly: no grains, onion or garlic';

export const FESTIVALS = [
  { id: 'navratri-2026', from: '2026-10-08', to: '2026-10-20', title: 'Navratri special', hiTitle: 'नवरात्रि स्पेशल', subtitle: 'What people eat for the nine nights', hiSubtitle: 'नौ रातों में लोग क्या खाते हैं', icon: 'spark', diet: 'veg', note: VRAT, dishes: [...NAVRATRI_DISHES, d('jalebi-fafda', 'Jalebi fafda (Dussehra)', 'जलेबी फाफड़ा (दशहरा)', 'sweet')] },
  {
    id: 'karwa-chauth-2026', from: '2026-10-21', to: '2026-10-29', title: 'Karwa Chauth', hiTitle: 'करवा चौथ', subtitle: 'Sargi in the morning, a festive dinner after moonrise', hiSubtitle: 'सुबह सरगी, चाँद निकलने के बाद त्योहार का खाना', icon: 'moon', diet: 'veg',
    dishes: [d('feni', 'Feni with milk', 'दूध फेनी', 'sweet'), d('mathri', 'Mathri', 'मठरी', 'snack'), d('paneer-butter-masala', 'Paneer butter masala', 'पनीर बटर मसाला', 'pot'), d('dal-makhani', 'Dal makhani', 'दाल मखनी', 'bowl'), d('puri-bhaji', 'Puri bhaji', 'पूरी भाजी', 'pot'), d('gulab-jamun', 'Gulab jamun', 'गुलाब जामुन', 'sweet')],
  },
  { id: 'diwali-2026', from: '2026-10-30', to: '2026-11-11', title: 'Diwali specials', hiTitle: 'दिवाली स्पेशल', subtitle: 'Mithai, namkeen and the festive meal', hiSubtitle: 'मिठाई, नमकीन और त्योहार का खाना', icon: 'sweet', diet: 'veg', dishes: DIWALI_DISHES },
  {
    id: 'chhath-2026', from: '2026-11-12', to: '2026-11-15', title: 'Chhath Puja', hiTitle: 'छठ पूजा', subtitle: 'Thekua, rasiya and prasad', hiSubtitle: 'ठेकुआ, रसियाव और प्रसाद', icon: 'sun', diet: 'veg',
    dishes: [d('thekua', 'Thekua', 'ठेकुआ', 'sweet'), d('rasiya-kheer', 'Rasiya kheer', 'रसियाव खीर', 'sweet'), d('kaddu-bhaat', 'Kaddu bhaat', 'कद्दू भात', 'bowl'), d('litti-chokha', 'Litti chokha', 'लिट्टी चोखा', 'pot')],
  },
  {
    id: 'gurpurab-2026', from: '2026-11-21', to: '2026-11-24', title: 'Guru Nanak Jayanti', hiTitle: 'गुरु नानक जयंती', subtitle: 'Langar favourites and kada prasad', hiSubtitle: 'लंगर का खाना और कड़ा प्रसाद', icon: 'sun', diet: 'veg',
    dishes: [d('kada-prasad', 'Kada prasad', 'कड़ा प्रसाद', 'sweet'), d('langar-dal', 'Langar wali dal', 'लंगर वाली दाल', 'bowl'), d('chole', 'Amritsari chole', 'अमृतसरी छोले', 'pot'), d('kheer', 'Kheer', 'खीर', 'sweet')],
  },
  {
    id: 'christmas-2026', from: '2026-12-18', to: '2026-12-26', title: 'Christmas treats', hiTitle: 'क्रिसमस स्पेशल', subtitle: 'Plum cake, cookies and a Christmas dinner', hiSubtitle: 'प्लम केक, कुकीज़ और क्रिसमस डिनर', icon: 'star',
    dishes: [d('plum-cake', 'Plum cake', 'प्लम केक', 'sweet'), d('rose-cookies', 'Rose cookies', 'रोज़ कुकीज़', 'sweet'), d('kulkuls', 'Kulkuls', 'कुलकुल', 'sweet'), d('roast-chicken', 'Roast chicken', 'रोस्ट चिकन', 'pot'), d('brownie', 'Brownie', 'ब्राउनी', 'sweet')],
  },
  {
    id: 'new-year-2027', from: '2026-12-29', to: '2027-01-01', title: 'New Year party food', hiTitle: 'न्यू ईयर पार्टी', subtitle: 'Biryani, kebabs and starters for the night', hiSubtitle: 'रात के लिए बिरयानी, कबाब और स्टार्टर', icon: 'spark',
    dishes: [d('biryani', 'Biryani', 'बिरयानी', 'pot'), d('kebabs', 'Kebabs', 'कबाब', 'flame'), d('pizza', 'Pizza', 'पिज़्ज़ा', 'snack'), d('paneer-tikka', 'Paneer tikka', 'पनीर टिक्का', 'flame'), d('chocolate-cake', 'Chocolate cake', 'चॉकलेट केक', 'sweet')],
  },
  {
    id: 'lohri-2027', from: '2027-01-10', to: '2027-01-13', title: 'Lohri', hiTitle: 'लोहड़ी', subtitle: 'Saag, makki di roti and winter sweets', hiSubtitle: 'सरसों का साग, मक्की की रोटी और सर्दियों की मिठाई', icon: 'flame', diet: 'veg',
    dishes: [d('sarson-saag', 'Sarson da saag & makki di roti', 'सरसों का साग और मक्की की रोटी', 'bowl'), d('gajak', 'Gajak', 'गजक', 'sweet'), d('rewri', 'Rewri', 'रेवड़ी', 'sweet'), d('pinni', 'Pinni', 'पिन्नी', 'sweet'), d('til-ladoo', 'Til ladoo', 'तिल के लड्डू', 'sweet')],
  },
  {
    id: 'sankranti-2027', from: '2027-01-14', to: '2027-01-16', title: 'Makar Sankranti & Pongal', hiTitle: 'मकर संक्रांति और पोंगल', subtitle: 'Til-gul, pongal and festive khichdi', hiSubtitle: 'तिल-गुड़, पोंगल और खिचड़ी', icon: 'sun', diet: 'veg',
    dishes: [d('til-gul', 'Til gul ladoo', 'तिल गुड़ लड्डू', 'sweet'), d('pongal', 'Ven pongal', 'वेन पोंगल', 'bowl'), d('sakkarai-pongal', 'Sakkarai pongal', 'सक्करई पोंगल', 'sweet'), d('undhiyu', 'Undhiyu', 'उंधियू', 'pot'), d('puran-poli', 'Puran poli', 'पूरन पोली', 'sweet'), d('khichdi', 'Khichdi', 'खिचड़ी', 'bowl')],
  },
  {
    id: 'ramzan-2027', from: '2027-02-09', to: '2027-03-09', title: 'Ramzan iftar', hiTitle: 'रमज़ान इफ़्तार', subtitle: 'Haleem, kebabs and iftar favourites', hiSubtitle: 'हलीम, कबाब और इफ़्तार का खाना', icon: 'moon',
    dishes: [d('haleem', 'Haleem', 'हलीम', 'bowl'), d('nihari', 'Nihari', 'निहारी', 'pot'), d('seekh-kebab', 'Seekh kebab', 'सीख कबाब', 'flame'), d('fruit-chaat', 'Fruit chaat', 'फ्रूट चाट', 'leaf'), d('phirni', 'Phirni', 'फिरनी', 'sweet'), d('malpua', 'Malpua', 'मालपुआ', 'sweet')],
  },
  { id: 'shivratri-2027', from: '2027-03-03', to: '2027-03-06', title: 'Maha Shivratri', hiTitle: 'महाशिवरात्रि', subtitle: 'Fasting food and thandai', hiSubtitle: 'व्रत का खाना और ठंडाई', icon: 'moon', diet: 'veg', note: VRAT, dishes: [d('thandai', 'Thandai', 'ठंडाई', 'cup'), d('sabudana-khichdi', 'Sabudana khichdi', 'साबूदाना खिचड़ी', 'bowl'), d('kuttu-pakode', 'Kuttu pakode', 'कुट्टू पकौड़े', 'snack'), d('makhana', 'Roasted makhana', 'भुने मखाने', 'leaf'), d('shakarkandi-chaat', 'Shakarkandi chaat', 'शकरकंदी चाट', 'leaf')] },
  {
    id: 'eid-fitr-2027', from: '2027-03-09', to: '2027-03-12', title: 'Eid ul-Fitr', hiTitle: 'ईद-उल-फ़ित्र', subtitle: 'Sheer khurma, biryani and Eid feasts', hiSubtitle: 'शीर ख़ुरमा, बिरयानी और ईद की दावत', icon: 'moon',
    dishes: [d('sheer-khurma', 'Sheer khurma', 'शीर ख़ुरमा', 'sweet'), d('biryani', 'Biryani', 'बिरयानी', 'pot'), d('seekh-kebab', 'Seekh kebab', 'सीख कबाब', 'flame'), d('seviyan', 'Meethi seviyan', 'मीठी सेवइयाँ', 'sweet'), d('korma', 'Mutton korma', 'मटन कोरमा', 'pot')],
  },
  {
    id: 'holi-2027', from: '2027-03-17', to: '2027-03-22', title: 'Holi', hiTitle: 'होली', subtitle: 'Gujiya, thandai and Holi snacks', hiSubtitle: 'गुझिया, ठंडाई और होली के नाश्ते', icon: 'spark', diet: 'veg',
    dishes: [d('gujiya', 'Gujiya', 'गुझिया', 'sweet'), d('thandai', 'Thandai', 'ठंडाई', 'cup'), d('dahi-bhalla', 'Dahi bhalla', 'दही भल्ला', 'leaf'), d('malpua', 'Malpua', 'मालपुआ', 'sweet'), d('puran-poli', 'Puran poli', 'पूरन पोली', 'sweet'), d('kanji-vada', 'Kanji vada', 'कांजी वड़ा', 'cup')],
  },
  { id: 'chaitra-navratri-2027', from: '2027-04-04', to: '2027-04-15', title: 'Chaitra Navratri', hiTitle: 'चैत्र नवरात्रि', subtitle: 'Vrat food, and halwa-puri-chana for Ram Navami', hiSubtitle: 'व्रत का खाना, और राम नवमी का हलवा-पूरी-चना', icon: 'spark', diet: 'veg', note: VRAT, dishes: [...NAVRATRI_DISHES.slice(0, 5), d('halwa-puri-chana', 'Halwa puri chana', 'हलवा पूरी चना', 'sweet')] },
  {
    id: 'baisakhi-2027', from: '2027-04-12', to: '2027-04-14', title: 'Baisakhi', hiTitle: 'बैसाखी', subtitle: 'Chole bhature, kadhi and lassi', hiSubtitle: 'छोले भटूरे, कढ़ी और लस्सी', icon: 'sun', diet: 'veg',
    dishes: [d('chole-bhature', 'Chole bhature', 'छोले भटूरे', 'pot'), d('kadhi-chawal', 'Kadhi chawal', 'कढ़ी चावल', 'bowl'), d('lassi', 'Lassi', 'लस्सी', 'cup'), d('pinni', 'Pinni', 'पिन्नी', 'sweet'), d('meethe-chawal', 'Meethe chawal', 'मीठे चावल', 'sweet')],
  },
  {
    id: 'eid-adha-2027', from: '2027-05-13', to: '2027-05-17', title: 'Bakri Eid', hiTitle: 'बकरीद', subtitle: 'Mutton biryani, kebabs and festive sweets', hiSubtitle: 'मटन बिरयानी, कबाब और मिठाई', icon: 'moon',
    dishes: [d('mutton-biryani', 'Mutton biryani', 'मटन बिरयानी', 'pot'), d('seekh-kebab', 'Seekh kebab', 'सीख कबाब', 'flame'), d('nihari', 'Nihari', 'निहारी', 'pot'), d('sheer-khurma', 'Sheer khurma', 'शीर ख़ुरमा', 'sweet')],
  },
  {
    id: 'rakhi-2027', from: '2027-08-12', to: '2027-08-16', title: 'Raksha Bandhan', hiTitle: 'रक्षाबंधन', subtitle: 'Ghevar, mithai and a family meal', hiSubtitle: 'घेवर, मिठाई और परिवार का खाना', icon: 'heart', diet: 'veg',
    dishes: [d('ghevar', 'Ghevar', 'घेवर', 'sweet'), d('kaju-katli', 'Kaju katli', 'काजू कतली', 'sweet'), d('rasgulla', 'Rasgulla', 'रसगुल्ला', 'sweet'), d('chole-bhature', 'Chole bhature', 'छोले भटूरे', 'pot')],
  },
  { id: 'janmashtami-2027', from: '2027-08-22', to: '2027-08-25', title: 'Janmashtami', hiTitle: 'जन्माष्टमी', subtitle: 'Makhan mishri, panjiri and fasting food', hiSubtitle: 'माखन मिश्री, पंजीरी और व्रत का खाना', icon: 'star', diet: 'veg', note: VRAT, dishes: [d('panjiri', 'Dhaniya panjiri', 'धनिया पंजीरी', 'sweet'), d('makhan-mishri', 'Makhan mishri', 'माखन मिश्री', 'sweet'), d('shrikhand', 'Shrikhand', 'श्रीखंड', 'sweet'), d('sabudana-khichdi', 'Sabudana khichdi', 'साबूदाना खिचड़ी', 'bowl')] },
  {
    id: 'ganesh-2027', from: '2027-09-01', to: '2027-09-13', title: 'Ganesh Chaturthi', hiTitle: 'गणेश चतुर्थी', subtitle: 'Modak and Bappa’s favourites', hiSubtitle: 'मोदक और बप्पा का पसंदीदा खाना', icon: 'sweet', diet: 'veg',
    dishes: [d('ukadiche-modak', 'Ukadiche modak', 'उकडीचे मोदक', 'sweet'), d('fried-modak', 'Fried modak', 'तले हुए मोदक', 'sweet'), d('puran-poli', 'Puran poli', 'पूरन पोली', 'sweet'), d('shrikhand', 'Shrikhand', 'श्रीखंड', 'sweet'), d('misal-pav', 'Misal pav', 'मिसल पाव', 'pot')],
  },
  {
    id: 'onam-2027', from: '2027-09-08', to: '2027-09-12', title: 'Onam', hiTitle: 'ओणम', subtitle: 'Onam sadya and payasam', hiSubtitle: 'ओणम सद्या और पायसम', icon: 'leaf', diet: 'veg',
    dishes: [d('onam-sadya', 'Onam sadya', 'ओणम सद्या', 'leaf'), d('payasam', 'Payasam', 'पायसम', 'sweet'), d('avial', 'Avial', 'अवियल', 'bowl'), d('banana-chips', 'Banana chips', 'केले के चिप्स', 'snack')],
  },
  { id: 'navratri-2027', from: '2027-09-27', to: '2027-10-09', title: 'Navratri special', hiTitle: 'नवरात्रि स्पेशल', subtitle: 'What people eat for the nine nights', hiSubtitle: 'नौ रातों में लोग क्या खाते हैं', icon: 'spark', diet: 'veg', note: VRAT, dishes: [...NAVRATRI_DISHES, d('jalebi-fafda', 'Jalebi fafda (Dussehra)', 'जलेबी फाफड़ा (दशहरा)', 'sweet')] },
  { id: 'diwali-2027', from: '2027-10-23', to: '2027-11-01', title: 'Diwali specials', hiTitle: 'दिवाली स्पेशल', subtitle: 'Mithai, namkeen and the festive meal', hiSubtitle: 'मिठाई, नमकीन और त्योहार का खाना', icon: 'sweet', diet: 'veg', dishes: DIWALI_DISHES },
];

// [from MM-DD, to MM-DD]: a range may wrap past New Year.
export const SEASONS = [
  {
    id: 'winter', from: '12-01', to: '02-28', title: 'Winter warmers', hiTitle: 'सर्दियों का खाना', subtitle: 'Hot, hearty food for the cold', hiSubtitle: 'ठंड के लिए गरमागरम खाना', icon: 'bowl',
    dishes: [d('gajar-halwa', 'Gajar ka halwa', 'गाजर का हलवा', 'sweet'), d('sarson-saag', 'Sarson da saag & makki di roti', 'सरसों का साग और मक्की की रोटी', 'bowl'), d('nihari', 'Nihari', 'निहारी', 'pot'), d('thukpa', 'Thukpa', 'थुकपा', 'bowl'), d('undhiyu', 'Undhiyu', 'उंधियू', 'pot')],
  },
  {
    id: 'summer', from: '03-15', to: '06-10', title: 'Summer coolers', hiTitle: 'गर्मियों की ठंडक', subtitle: 'Cool, light food for the heat', hiSubtitle: 'गर्मी के लिए ठंडा, हल्का खाना', icon: 'leaf',
    dishes: [d('aam-ras', 'Aamras puri', 'आमरस पूरी', 'sweet'), d('kulfi', 'Kulfi', 'कुल्फ़ी', 'sweet'), d('falooda', 'Falooda', 'फ़ालूदा', 'cup'), d('curd-rice', 'Curd rice', 'दही चावल', 'bowl'), d('lassi', 'Lassi', 'लस्सी', 'cup')],
  },
  {
    id: 'monsoon', from: '06-11', to: '09-30', title: 'Monsoon cravings', hiTitle: 'बारिश का मज़ा', subtitle: 'Hot snacks for the rain', hiSubtitle: 'बारिश के लिए गरम नाश्ता', icon: 'snack',
    dishes: [d('chai-pakoda', 'Chai & pakoda', 'चाय पकौड़ा', 'cup'), d('vada-pav', 'Vada pav', 'वड़ा पाव', 'snack'), d('bhutta', 'Masala bhutta', 'मसाला भुट्टा', 'flame'), d('samosa', 'Samosa', 'समोसा', 'snack'), d('maggi', 'Masala Maggi', 'मसाला मैगी', 'bowl')],
  },
  {
    id: 'festive', from: '10-01', to: '11-30', title: 'Festive season', hiTitle: 'त्योहारों का मौसम', subtitle: 'Sweets and family favourites', hiSubtitle: 'मिठाई और परिवार का पसंदीदा खाना', icon: 'sweet',
    dishes: [d('gulab-jamun', 'Gulab jamun', 'गुलाब जामुन', 'sweet'), d('kaju-katli', 'Kaju katli', 'काजू कतली', 'sweet'), d('chole-bhature', 'Chole bhature', 'छोले भटूरे', 'pot'), d('pav-bhaji', 'Pav bhaji', 'पाव भाजी', 'snack')],
  },
];

// Today's date in India as YYYY-MM-DD.
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function inSeason(md, { from, to }) {
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

// A festival beats the season it falls in; the first one listed wins an overlap.
export function currentOccasion(now = new Date()) {
  const today = todayInIndia(now);
  const festival = FESTIVALS.find((f) => today >= f.from && today <= f.to);
  if (festival) return { ...festival, kind: 'festival' };
  const md = today.slice(5);
  const season = SEASONS.find((s) => inSeason(md, s));
  return season ? { ...season, kind: 'season' } : null;
}

export const findOccasion = (id) => FESTIVALS.find((f) => f.id === id) ?? SEASONS.find((s) => s.id === id) ?? null;

// What the picker searches for: one dish, or the occasion's first few dishes.
export function occasionSlots(occasion, dishId) {
  const dish = dishId ? occasion.dishes.find((x) => x.id === dishId) : null;
  const names = (dish ? [dish] : occasion.dishes.slice(0, 2)).map((x) => x.name.replace(/\s*\(.*\)$/, '').split(' & ')[0].toLowerCase());
  return { craving: dish ? dish.name : occasion.title, dishWords: names, diet: occasion.diet ?? null, moods: [], cuisines: [] };
}
