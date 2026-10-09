import { AsyncLocalStorage } from 'node:async_hooks';

// The app sends Accept-Language: hi when its interface is in Hindi. Text the
// server writes (reasons, meal names, fallback replies) follows it. The
// language is kept per request, so any code can call tr() without passing it on.
const store = new AsyncLocalStorage();

export function languageMiddleware(req, res, next) {
  const lang = String(req.headers['accept-language'] || '').toLowerCase().startsWith('hi') ? 'hi' : 'en';
  req.lang = lang;
  res.vary('Accept-Language'); // caches must keep English and Hindi answers apart
  store.run({ lang }, next);
}

export const currentLang = () => store.getStore()?.lang ?? 'en';

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text);

// tr('Rated {n} by diners', { n: 4.6 })
export function tr(text, vars) {
  return fill(currentLang() === 'hi' ? HI[text] ?? text : text, vars);
}

const HI = {
  // reasons
  'Exactly what you asked for': 'बिल्कुल वही जो आपने माँगा',
  'Fiery, just like you asked': 'ज़बरदस्त तीखा, जैसा आपने कहा',
  'Properly spicy, just like you asked': 'अच्छा तीखा, जैसा आपने कहा',
  'Warm, filling comfort food': 'गरम, पेट भरने वाला खाना',
  'Light and easy on the stomach': 'हल्का और पेट के लिए आसान',
  'Proper Mumbai street style': 'असली मुंबई स्ट्रीट स्टाइल',
  'Something sweet, as you wanted': 'कुछ मीठा, जैसा आप चाहते थे',
  '₹{total} for {n} of you': 'आप {n} लोगों के लिए ₹{total}',
  '₹{total} for {n} of you, good for sharing': 'आप {n} लोगों के लिए ₹{total}, बाँटकर खाने लायक',
  'Fits ₹{n} per person': 'हर व्यक्ति ₹{n} में फ़िट',
  '₹{n} under your budget': 'आपके बजट से ₹{n} कम',
  'Right on your budget': 'बिल्कुल आपके बजट में',
  '₹{n} over budget — worth a look': 'बजट से ₹{n} ज़्यादा — फिर भी देखने लायक',
  'Arrives {n} min before your limit': 'आपके समय से {n} मिनट पहले पहुँचेगा',
  'Arrives in about {n} min': 'लगभग {n} मिनट में पहुँचेगा',
  'You love {cuisine}': 'आपको {cuisine} पसंद है',
  'Rated {n} by diners': 'खाने वालों ने {n} रेटिंग दी',
  'You saved this': 'आपने इसे सेव किया था',
  'You ordered this before': 'आपने इसे पहले ऑर्डर किया था',
  'You often go for {cuisine}': 'आप अक्सर {cuisine} चुनते हैं',
  'Rated {r} by {n} people on Google': 'Google पर {n} लोगों ने {r} रेटिंग दी',
  '{km} km from you': 'आपसे {km} किमी',
  '{label} — fits your ₹{n}': '{label} — आपके ₹{n} में फ़िट',
  'Open now': 'अभी खुला है',
  'Under ₹100 for one': 'एक के लिए ₹100 से कम',
  'About ₹100–300 for one': 'एक के लिए लगभग ₹100–300',
  'About ₹300–700 for one': 'एक के लिए लगभग ₹300–700',
  'About ₹700–1,500 for one': 'एक के लिए लगभग ₹700–1,500',
  '₹1,500+ for one': 'एक के लिए ₹1,500+',
  // cuisines
  'North Indian': 'उत्तर भारतीय',
  Biryani: 'बिरयानी',
  'Street food': 'स्ट्रीट फ़ूड',
  Chinese: 'चाइनीज़',
  'South Indian': 'दक्षिण भारतीय',
  Healthy: 'हेल्दी',
  Desserts: 'मिठाइयाँ',
  Mughlai: 'मुग़लई',
  Coastal: 'कोस्टल',
  // meals and moods
  Breakfast: 'नाश्ता',
  Lunch: 'दोपहर का खाना',
  'Evening snack': 'शाम का नाश्ता',
  Dinner: 'रात का खाना',
  '8 – 10 am': 'सुबह 8 – 10',
  '1 – 2 pm': 'दोपहर 1 – 2',
  '5 – 6 pm': 'शाम 5 – 6',
  '8 – 9 pm': 'रात 8 – 9',
  Balanced: 'संतुलित',
  'Light day': 'हल्का दिन',
  'Comfort day': 'आरामदायक दिन',
  'Spicy day': 'तीखा दिन',
  'Street food day': 'स्ट्रीट फ़ूड वाला दिन',
  // season specials
  'Diwali sweets': 'दिवाली की मिठाइयाँ',
  'Mithai and festive treats to share': 'बाँटने के लिए मिठाई और त्योहार की चीज़ें',
  'Christmas treats': 'क्रिसमस की मिठास',
  'Cakes, custard and something sweet': 'केक, कस्टर्ड और कुछ मीठा',
  'New Year party food': 'न्यू ईयर पार्टी का खाना',
  'Biryani, kebabs and starters for the night': 'रात के लिए बिरयानी, कबाब और स्टार्टर',
  'Winter warmers': 'सर्दियों की गरमाहट',
  'Nihari, thukpa and hot comfort food': 'निहारी, थुकपा और गरम खाना',
  'Summer coolers': 'गर्मियों की ठंडक',
  'Kulfi, curd rice and light meals': 'कुल्फ़ी, दही चावल और हल्का खाना',
  'Monsoon cravings': 'बारिश का मन',
  'Chai, vada pav and hot snacks for the rain': 'बारिश में चाय, वड़ा पाव और गरम नाश्ता',
  'Festive season': 'त्योहारों का मौसम',
  'Sweets and family favourites': 'मिठाइयाँ और परिवार की पसंद',
  // Chatora's fallback replies
  'Got it. Would you like to order in, or cook at home?': 'समझ गया। ऑर्डर करना है या घर पर बनाना है?',
  "Let's find you something. Would you like to order in, or cook at home?": 'चलिए कुछ ढूँढते हैं। ऑर्डर करना है या घर पर बनाना है?',
  "I'm here to help you decide what to eat. Tell me what you feel like!": 'मैं यह तय करने में मदद करता हूँ कि क्या खाएँ। बताइए क्या मन है!',
  'Nice, let\'s cook! What do you have at home? Type a few things like "eggs, onion, bread", or scan your fridge.': 'बढ़िया, चलिए बनाते हैं! घर पर क्या है? कुछ चीज़ें लिखें जैसे "अंडे, प्याज़, ब्रेड", या फ़्रिज स्कैन करें।',
  'My top pick is {name}{extra}. Here are your top {n} — tap one to order on Zomato or Swiggy.': 'मेरी पहली पसंद {name}{extra} है। ये रहे आपके टॉप {n} — Zomato या Swiggy पर ऑर्डर करने के लिए किसी पर टैप करें।',
  ' (★{r}, {km} km away)': ' (★{r}, {km} किमी दूर)',
  ' ({km} km away)': ' ({km} किमी दूर)',
  'Nothing arrives that fast, so I widened the time a little. ': 'इतनी जल्दी कुछ नहीं पहुँचता, इसलिए समय थोड़ा बढ़ाया। ',
  'Nothing fit the budget, so here are the closest options. ': 'बजट में कुछ नहीं मिला, ये सबसे पास के विकल्प हैं। ',
  '{lead}My top pick is {name} from {restaurant}: {cost}, about {eta} min. Here are your top {n}.': '{lead}मेरी पहली पसंद {restaurant} की {name} है: {cost}, लगभग {eta} मिनट। ये रहे आपके टॉप {n}।',
  '₹{price} each (about ₹{total} for {n})': 'हर एक ₹{price} ({n} लोगों के लिए लगभग ₹{total})',
  'You can make {name} in about {time} min.{need} {count}': 'आप लगभग {time} मिनट में {name} बना सकते हैं।{need} {count}',
  " You'll just need {list}.": ' बस {list} चाहिए।',
  'Here is 1 recipe for what you have.': 'आपके सामान से 1 रेसिपी है।',
  'Here are {n} recipes for what you have.': 'आपके सामान से {n} रेसिपी हैं।',
  // day plan notes (when Claude is off)
  "I couldn't plan a day with those choices. Try a bigger budget or fewer limits.": 'इन विकल्पों से दिन का प्लान नहीं बन पाया। बजट बढ़ाएँ या शर्तें कम करें।',
  '{first} to start, {last} to end the day': 'शुरुआत {first} से, दिन का अंत {last} से',
  '{name} for {meal}': '{meal} के लिए {name}',
  'One meal is from your own kitchen.': 'एक खाना आपकी अपनी रसोई से है।',
  '{n} meals are from your own kitchen.': '{n} खाने आपकी अपनी रसोई से हैं।',
  "Here's your day: {shape}.{home} Tap any meal to order it on Zomato or Swiggy.": 'आपका दिन: {shape}।{home} Zomato या Swiggy पर ऑर्डर करने के लिए किसी खाने पर टैप करें।',
  ' per person (₹{total} for all {n})': ' हर व्यक्ति (सभी {n} के लिए ₹{total})',
  'It comes to ₹{total}{group}, a little over your ₹{budget} — swap a meal to bring it down.': 'कुल ₹{total}{group}, आपके ₹{budget} से थोड़ा ज़्यादा — कम करने के लिए कोई खाना बदलें।',
  'All of it for ₹{total} of your ₹{budget}{group}.': 'सब कुछ आपके ₹{budget} में से ₹{total}{group} में।',
  "Here's your day: {shape}.{home} {sum}": 'आपका दिन: {shape}।{home} {sum}',
};
