# Kya Khaun?

An AI food companion: tell it your craving, budget and time, and it picks what to eat (order in or cook at home).

```
kya-khaun-app/
├── server/   Node + Express 5 + MongoDB (Mongoose) API
├── mobile/   Expo (React Native) app, expo-router
└── design/   Approved screen designs (V5*.dc.html = final "Rich classic" design)
```

## What's built (Phase 0 + 1)

- **Server:** email + password and Google sign-in (plus "Forgot password" by emailed code); short-lived access tokens with rotating refresh tokens; profile and taste preferences API.
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

While `EMAIL_PROVIDER=console`, password-reset codes are **printed in this terminal** instead of being emailed, which costs nothing. Look for lines like `[Password reset] you@example.com -> 482913`.

If `db` shows `disconnected`, your internet address probably changed: in MongoDB Atlas → Network Access, add `0.0.0.0/0` (allow from anywhere) so it stops happening.

### 3. Run the app
```bash
cd mobile
npm run web
```
To run on your phone with Expo Go, run `npx expo start` and scan the QR code. Then set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your PC's Wi-Fi address, e.g. `http://192.168.1.20:4100/api`.

## Google sign-in (later)

Google sign-in uses the official native library, so it works in a **development build**, not in Expo Go or the browser. Until then the button explains this, and email sign-in works everywhere.

1. In Google Cloud Console → APIs & Services → Credentials, create OAuth client IDs:
   - **Web** (used to issue the ID token)
   - **Android** (package `app.kyakhaun` + your SHA-1)
   - **iOS** (bundle `app.kyakhaun`)
2. `mobile/.env`: set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`).
3. `mobile/app.json`: give the `@react-native-google-signin/google-signin` plugin your iOS URL scheme:
   `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<your-ios-client-id>" }]`
4. `server/.env`: set `GOOGLE_CLIENT_IDS` to the web, android and ios client IDs, comma-separated.
5. Build: `npx expo run:android` (or an EAS development build).

## Real password-reset email (before launch)

Set `EMAIL_PROVIDER=smtp` plus the `SMTP_*` values. Gmail with an app password or Brevo's free plan both work. The server refuses to start in production while it is still `console`.

## API

| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/email/sign-up` | `{ name, email, password }` (password 8+ characters) |
| POST | `/api/auth/email/log-in` | `{ email, password }` (8 wrong tries locks the email for 15 min) |
| POST | `/api/auth/password/forgot` | `{ email }` → emails a 6-digit code (same answer whether or not the account exists) |
| POST | `/api/auth/password/reset` | `{ email, code, password }` → signs you in |
| POST | `/api/auth/google` | `{ idToken }` |
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
| GET | `/api/chat/:id` | one chat, with its picks re-ranked |
| POST | `/api/chat/quick-picks` | `{ mood? }` → 5 picks from your taste profile |

Sign-in responses return `{ accessToken, refreshToken, isNew, user }`. Access tokens last 15 minutes; the app renews them automatically with the refresh token (valid 30 days, replaced on every use).
