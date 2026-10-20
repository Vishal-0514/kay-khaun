import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { t } from './i18n';

// What Chatora says when the voice screen opens. A different line every time:
// lines for the time of day come up more often, and the last few lines used
// are skipped so it never repeats itself soon. {n} is ", Asha" (or nothing).

const LINES = {
  en: {
    any: [
      'Hi{n}! How can I help you today?',
      'Hey{n}! What are you in the mood to eat?',
      'Namaste{n}! Kya khaane ka mood hai?',
      'Welcome back{n}! Tell me a craving and I’ll find it.',
      'Hello{n}! Spicy, sweet or something light today?',
      'Hi{n}! I’m all ears. What sounds tasty?',
      'Hey{n}, your food buddy is here. What should we eat?',
      'Hi{n}! Can’t decide? Just tell me how hungry you are.',
      'Hello{n}! Order in, cook at home or go out? I can help with all three.',
      'Hey{n}! Tell me your budget and I’ll find something good.',
    ],
    morning: [
      'Good morning{n}! Chai and something hot for breakfast?',
      'Good morning{n}! Let’s start the day with a good breakfast. What do you feel like?',
      'Rise and shine{n}! Poha, paratha or something new today?',
    ],
    afternoon: [
      'Good afternoon{n}! Lunch time. What are you craving?',
      'Hi{n}! Need a quick lunch idea? Just ask.',
      'Afternoon{n}! Something filling, or something light?',
    ],
    evening: [
      'Good evening{n}! Snacks or a proper dinner tonight?',
      'Evening{n}! Chai and pakoda, or something else?',
      'Hi{n}! What’s for dinner tonight? Let’s decide together.',
    ],
    late: [
      'Hi{n}! Late-night hunger? Tell me what you feel like.',
      'Still up{n}? Let’s find you a midnight snack.',
    ],
  },
  hi: {
    any: [
      'नमस्ते{n}! बताइए, मैं आपकी क्या मदद करूँ?',
      'हाय{n}! आज क्या खाने का मन है?',
      'वापस आने का शुक्रिया{n}! बस बताइए क्या खाना है।',
      'हेलो{n}! आज कुछ तीखा, मीठा या हल्का?',
      'हाय{n}! बोलिए, क्या टेस्टी लग रहा है?',
      'आपका फ़ूड बडी हाज़िर है{n}! क्या खाएँ?',
      'तय नहीं कर पा रहे{n}? बस बताइए कितनी भूख है।',
      'हेलो{n}! ऑर्डर, घर पर बनाना या बाहर जाना? तीनों में मदद मिलेगी।',
      'हाय{n}! अपना बजट बताइए, कुछ अच्छा ढूँढते हैं।',
    ],
    morning: [
      'सुप्रभात{n}! नाश्ते में चाय और कुछ गरम?',
      'गुड मॉर्निंग{n}! पोहा, पराठा या आज कुछ नया?',
    ],
    afternoon: [
      'नमस्ते{n}! लंच का टाइम है। क्या खाने का मन है?',
      'हाय{n}! जल्दी का लंच चाहिए? बस पूछिए।',
    ],
    evening: [
      'शुभ संध्या{n}! आज स्नैक्स या पूरा डिनर?',
      'हाय{n}! चाय-पकौड़े, या कुछ और?',
      'हाय{n}! आज डिनर में क्या है? मिलकर तय करते हैं।',
    ],
    late: [
      'हाय{n}! रात की भूख? बताइए क्या खाना है।',
      'अभी तक जाग रहे हैं{n}? चलिए कुछ हल्का ढूँढते हैं।',
    ],
  },
};

// Things to try, shown as buttons under the greeting (three, shuffled each visit).
const SUGGESTIONS = {
  any: ['Something spicy under ₹300', 'What can I cook with what I have?', 'Where should I go out tonight?', 'A really good biryani', 'Something sweet', 'Some chatpata street food', 'Something light and healthy'],
  morning: ['Quick breakfast ideas', 'Something with chai'],
  afternoon: ['A filling lunch under ₹400', 'Quick lunch ideas'],
  evening: ['Evening snacks', 'Dinner ideas for tonight'],
  late: ['A late-night snack', 'Something light before bed'],
};

function slot(hour = new Date().getHours()) {
  if (hour >= 22 || hour < 5) return 'late';
  if (hour < 11) return 'morning';
  if (hour < 16) return 'afternoon';
  return 'evening';
}

const KEY = 'kk-greet-recent';
const REMEMBER = 8;

async function readRecent() {
  try {
    const raw = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    const list = JSON.parse(raw ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveRecent(list) {
  try {
    const raw = JSON.stringify(list.slice(-REMEMBER));
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {}
}

const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

// The next welcome line for this person, never one of the last few.
export async function nextGreeting(name, lang = 'en') {
  const lines = LINES[lang] ?? LINES.en;
  const now = slot();
  // Lines for now count twice, so they come up more often.
  const pool = [...lines.any.map((l) => `${lang}:any:${l}`), ...[...lines[now], ...lines[now]].map((l) => `${lang}:${now}:${l}`)];
  const recent = await readRecent();
  const fresh = pool.filter((key) => !recent.includes(key));
  const key = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  saveRecent([...recent.filter((k) => k !== key), key]);
  const first = name?.trim().split(/\s+/)[0];
  return key.split(':').slice(2).join(':').replace('{n}', first ? `, ${first}` : '');
}

export function greetingSuggestions(count = 3) {
  const now = slot();
  const timely = shuffle(SUGGESTIONS[now]).slice(0, 1);
  return [...timely, ...shuffle(SUGGESTIONS.any)].slice(0, count).map((s) => t(s));
}
