# Kya Khaun?

An AI food companion: tell it your craving, budget and time, and it picks what to eat (order in or cook at home).

```
kya-khaun-app/
├── server/   Node + Express 5 + MongoDB (Mongoose) API
├── mobile/   Expo (React Native) app, expo-router
└── design/   Approved screen designs (V5*.dc.html = final "Rich classic" design)
```

## What's built (Phase 0 + 1)

- **Server:** sign-in through Firebase (email + password with email verification, or Google), the same way as KARIS; short-lived access tokens with rotating refresh tokens; profile and taste preferences API.
- **App:** design system in code (colours, Baloo 2 + Figtree, maroon jaali header, plate ring), plus the Welcome, Sign in, Enter code, Your taste and a simple Home screen.

## What's built (Phase 2)

- **Home:** order slip (Craving · Budget · Time), "Tap to talk", mood circles (one tap = 5 picks), Chatora's pick with a match ring.
- **Chat with Chatora:** understands English, Hindi and Hinglish ("kuch teekha, 400 ke andar, jaldi"), fills the order slip, asks only what's missing (order in or cook at home), then returns the top 5.
- **Top 5 and dish detail:** match %, price, delivery time, rating, and plain reasons ("₹20 under your budget", "You love Biryani").
- **How it decides:** Claude reads the message (`server/src/services/ai.js`; keyword backup in `intent.js`) and writes the replies. Dishes, prices and times come from the sample Mumbai menu (`server/src/data/mumbaiMenu.js`, 70 dishes, fictional restaurants), and `ranking.js` filters and scores them. Nothing is invented.
- **Without an API key:** a built-in keyword parser handles messages, so the app works today. Add `ANTHROPIC_API_KEY` to `server/.env` to switch to Claude (`AI_MODEL`, default `claude-opus-5-5` at low effort; server-side refusal fallback is enabled).
- **Skip login (testing only):** shown in development builds when the server has `ALLOW_GUEST_LOGIN=true`. It creates a throwaway account and is always off in production.

## What's built (Cook at home)

- **Your kitchen** (Home → "Scan my fridge", Chat → "Cook at home", or Results → "Cook at home"): snap your fridge or shelf and Claude lists the ingredients (unsure ones show a "?" to confirm), or type them in English or Hinglish ("aloo, pyaz, dahi"). Salt, oil and common spices are always counted.
- **Recipes:** the best match plus more you can make, with how many ingredients you have and what's missing. 38 everyday Indian home recipes (`server/src/data/recipes.js`) matched by `services/cooking.js` on what you have, mood, time, diet and things you avoid.
- **Recipe:** ingredients marked have / missing / optional / pantry, with swaps for missing ones ("No cream? Use milk and butter").
- **Cook mode:** one big step at a time, built-in timers (pause, +1 min, vibrates when done), and the screen stays awake.
- **In chat:** "I want to cook" → Chatora asks what you have → recipes appear in the chat. "Mere paas aloo pyaaz hai" works too.
- **Photo scan needs `ANTHROPIC_API_KEY`.** Without it, typing ingredients still works and the camera buttons explain why scan is off.

## Plan my whole day

- **Home → "Plan my whole day"** plans breakfast, lunch, evening snack and dinner within a day budget (defaults from the taste profile: low ₹600, mid ₹1,000, high ₹1,800). Change the budget, the mood of the day (balanced, light, comfort, spicy, street) or which meals to plan, and it re-plans.
- `server/src/services/dayPlan.js` scores dishes per meal with the same taste scoring as chat, then tries every combination of the best and cheapest candidates and keeps the best day that fits the budget, with no repeated restaurant and a small penalty for repeating a cuisine or stacking fiery meals. If nothing fits, it returns the cheapest day and says it's over.
- Each meal has **Swap** (a few alternatives) and opens the usual dish page with Zomato / Swiggy. The bar at the bottom shows the day total against the budget.
- With Google Places on and a location, each meal is a real nearby place (price range instead of exact price). Claude writes a one-line intro for the day; without the key a template is used.

- **Or cook it at home:** every meal carries the closest home recipe (Pav Bhaji → Pav Bhaji, Keema Pav → Keema Matar). Switching a meal to cooking makes it ₹0 in the total and opens the recipe. After swaps or cooking, Chatora's note is rewritten for what's showing (`POST /api/plan/note`, debounced). **Save this day** keeps it in History, from where it reopens exactly as saved.

## Taste learning, Saved and History

- `server/src/services/taste.js` learns from what you **open** (small nudge), **order** (tap Zomato / Swiggy), **save** (♡) and mark **"Not for me"** (strong push down). Recent actions count more (half-life about a month). The learned dish and cuisine scores nudge ranking in chat, quick picks, the day plan and real places, and add reasons like "You saved this" or "You often go for South Indian".
- Nothing is recorded or used while **Remember my taste** is off. Saving ♡ and saving a day plan always work, because the user asks for them directly.
- **Saved** (Profile → Saved), **History** (Profile → History: orders grouped by day with "Again", saved days to reopen, remove one or clear all) and **Order again** on Home (last few distinct orders, one tap to the same app).
- Profile → **What I've learned** shows the cuisines picked up, with **Clear what I've learned**.

## Voice input

- **Home → "Tap to talk"** opens the chat already listening; the **mic in chat** does the same. Words appear live in the bar and send by themselves when you stop talking (or tap the bars to finish, ✕ to cancel).
- Uses the phone's own speech recogniser through `expo-speech-recognition` (Google on Android, Apple on iPhone, the browser's on web), so it's free. Language is Indian English (`en-IN`), which writes Hinglish in Latin letters ("kuch teekha 400 ke andar") for Claude and the keyword parser. Food words are passed as hints (`mobile/lib/voice.js`).
- **Needs an app build** (`npm run build:share`); Expo Go doesn't include the native module, so there the mic explains this and opens the keyboard.

## First-time setup

### 1. Database (MongoDB Atlas, free)
1. Create a free cluster at https://cloud.mongodb.com.
2. **Database Access:** add a user with a password.
3. **Network Access:** allow your IP (or `0.0.0.0/0` while developing).
4. **Connect → Drivers:** copy the connection string.
5. Paste it into `server/.env` as `MONGODB_URI=...`.

`server/.env` was created from `.env.example` with a fresh random `JWT_SECRET` already filled in.

### 2. Run the server
```bash
cd server
npm run dev
```
Check it at http://localhost:4100/api/health. It should show `"db": "connected"`.

If `db` shows `disconnected`, your internet address probably changed: in MongoDB Atlas → Network Access, add `0.0.0.0/0` (allow from anywhere) so it stops happening.

### 3. Run the app
```bash
cd mobile
npm run web
```
To run on your phone with Expo Go, run `npx expo start` and scan the QR code. Then set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your PC's Wi-Fi address, e.g. `http://192.168.1.20:4100/api`.

## Real nearby restaurants (order on Zomato / Swiggy)

Kya Khaun suggests; customers order on Zomato or Swiggy. With a Google key and the user's location, "Order in" picks are **real restaurants near them** from Google Places API (New): name, Google rating, distance, price range for one, open now, plus "Try here" dish ideas (labelled as typical — we don't have menus). Each pick has **Zomato** and **Swiggy** buttons that open the restaurant there (`server/src/services/nearby.js`, `places.js`).

Setup: Google Cloud → project **kay-khaun** → link billing → enable **Places API (New)** → Credentials → API key restricted to Places API (New) → `GOOGLE_MAPS_API_KEY` in `server/.env` and in Render's Environment. Results are cached for 6 hours per ~1 km area and search, to stay inside Google's free monthly usage.

Without a key or location the app falls back to the sample Mumbai menu (marked "sample").

## Sign-in (Firebase, like KARIS)

Firebase checks the email + password (or Google account), sends the verification and password-reset emails for free, and gives the app an ID token. The app sends it to `POST /api/auth/firebase`; the server checks it with Firebase, accepts **verified emails only**, links it to one Kya Khaun account per email, and returns our own session. Firebase's own session is thrown away straight after.

**One-time Firebase setup (free Spark plan):**
1. https://console.firebase.google.com → **Add project** → "Kya Khaun" (Google Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method**: enable **Email/Password** and **Google**.
3. **Project settings → Your apps → Web (`</>`)** → register "Kya Khaun web" → copy `apiKey`, `authDomain`, `projectId`, `appId` into `mobile/.env` (`EXPO_PUBLIC_FIREBASE_*`). These are public, not secrets.
4. `server/.env`: `FIREBASE_PROJECT_ID` = the same project ID. No service-account key is needed.

Email + password then works everywhere — Expo Go, the browser and app builds.

**Google sign-in** needs an installed **development build** (not Expo Go):
1. Make a free account at https://expo.dev, then in `mobile/`: `npx eas-cli login`.
2. `npm run build:android` (answer **Yes** to generating a keystore). ~15 min; open the .apk link on the phone to install.
3. `npx eas-cli credentials -p android` → copy the **SHA-1**.
4. Firebase → Project settings → **Add app → Android**: package `app.kyakhaun`, paste the SHA-1.
5. Firebase → Authentication → Sign-in method → **Google** → *Web SDK configuration* → copy the **Web client ID** into `mobile/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
6. `npx expo start --dev-client` and open the installed app.

**iPhone (later):** needs an Apple Developer account. Add an iOS app in Firebase, then add the plugin to `app.json` with its URL scheme:
`["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<your-ios-client-id>" }]`
(Don't add the plugin without `iosUrlScheme` — that switches it to google-services.json mode and the Android build fails.)

## API

| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/firebase` | `{ idToken, name? }` — Firebase ID token from an email or Google sign-in; verified emails only |
| POST | `/api/auth/refresh` | `{ refreshToken }` |
| POST | `/api/auth/logout` | `{ refreshToken }` |
| GET | `/api/profile` | (Bearer access token) |
| PATCH | `/api/profile` | `{ name?, preferences?, memoryEnabled?, onboarded? }` |
| POST | `/api/auth/guest` | (testing only; needs `ALLOW_GUEST_LOGIN=true`) |
| POST | `/api/chat/messages` | `{ conversationId?, text }` → `{ conversation, picks, recipes, kitchen }` |
| GET | `/api/chat` | your recent chats |
| GET | `/api/cook/ingredients` | ingredient names for quick-add, and whether photo scan is on |
| POST | `/api/cook/recipes` | `{ ingredients[], mood?, timeMax? }` → `{ kitchen, recipes }` |
| GET | `/api/cook/recipes/:id?have=a,b` | full recipe marked against what you have |
| POST | `/api/cook/scan` | `{ image (base64), mediaType }` → `{ items }` (needs the API key) |
| POST | `/api/plan` | `{ budget?, mood?, meals[]?, location? }` → `{ plan }`: one pick per meal plus swaps (each with a `home` recipe), total, and Chatora's note |
| POST | `/api/plan/note` | `{ budget, moodLabel, meals[{ label, cook, name, … }] }` → `{ note }` for what's showing now |
| GET / PUT / DELETE | `/api/me/saved`, `/api/me/saved/:itemId` | list, save `{ item }`, unsave |
| POST | `/api/me/activity` | `{ kind: opened \| ordered \| not_for_me, item, app? }` (ignored while memory is off) |
| GET / DELETE | `/api/me/history`, `/api/me/history/:id` | orders and saved days, newest first (`?before=` for more); remove one or all |
| POST | `/api/me/history/plan` | save a day plan |
| GET / DELETE | `/api/me/learned` | what taste learning picked up; clear it |
| GET | `/api/chat/:id` | one chat, with its picks re-ranked |
| POST | `/api/chat/quick-picks` | `{ mood? }` → 5 picks from your taste profile |

Sign-in responses return `{ accessToken, refreshToken, isNew, user }`. Access tokens last 15 minutes; the app renews them automatically with the refresh token (valid 30 days, replaced on every use).
