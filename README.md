# Kya Khaun?

An AI food companion: tell it your craving, budget and time, and it picks what to eat (order in or cook at home).

```
kya-khaun-app/
├── server/   Node + Express 5 + MongoDB (Mongoose) API
├── mobile/   Expo (React Native) app, expo-router
└── design/   Approved screen designs (V5*.dc.html = final "Rich classic" design)
```

## What's built (Phase 0 + 1)

- **Server:** phone OTP, email OTP and Google sign-in; short-lived access tokens with rotating refresh tokens; profile and taste preferences API.
- **App:** design system in code (colours, Baloo 2 + Figtree, maroon jaali header, plate ring), plus the Welcome, Sign in, Enter code, Your taste and a simple Home screen.

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

While `SMS_PROVIDER=console` and `EMAIL_PROVIDER=console`, sign-in codes are **printed in this terminal** instead of being sent, which costs nothing. Look for lines like `[OTP] phone +919876543210 -> 482913`.

### 3. Run the app
```bash
cd mobile
npm run web
```
To run on your phone with Expo Go, run `npx expo start` and scan the QR code. Then set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your PC's Wi-Fi address, e.g. `http://192.168.1.20:4100/api`.

## Google sign-in (later)

Google sign-in uses the official native library, so it works in a **development build**, not in Expo Go or the browser. Until then the button explains this, and phone and email sign-in work everywhere.

1. In Google Cloud Console → APIs & Services → Credentials, create OAuth client IDs:
   - **Web** (used to issue the ID token)
   - **Android** (package `app.kyakhaun` + your SHA-1)
   - **iOS** (bundle `app.kyakhaun`)
2. `mobile/.env`: set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`).
3. `mobile/app.json`: give the `@react-native-google-signin/google-signin` plugin your iOS URL scheme:
   `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<your-ios-client-id>" }]`
4. `server/.env`: set `GOOGLE_CLIENT_IDS` to the web, android and ios client IDs, comma-separated.
5. Build: `npx expo run:android` (or an EAS development build).

## Real SMS and email (before launch)

- **Email:** set `EMAIL_PROVIDER=smtp` plus the `SMTP_*` values. Gmail with an app password or Brevo's free plan both work.
- **SMS:** set `SMS_PROVIDER=msg91` with your MSG91 keys (about ₹0.20 per SMS; needs DLT registration in India).

The server refuses to start in production while either provider is still `console`.

## API

| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/phone/send-otp` | `{ phone }` |
| POST | `/api/auth/phone/verify-otp` | `{ phone, code }` |
| POST | `/api/auth/email/send-otp` | `{ email }` |
| POST | `/api/auth/email/verify-otp` | `{ email, code }` |
| POST | `/api/auth/google` | `{ idToken }` |
| POST | `/api/auth/refresh` | `{ refreshToken }` |
| POST | `/api/auth/logout` | `{ refreshToken }` |
| GET | `/api/profile` | (Bearer access token) |
| PATCH | `/api/profile` | `{ name?, preferences?, memoryEnabled?, onboarded? }` |

Sign-in responses return `{ accessToken, refreshToken, isNew, user }`. Access tokens last 15 minutes; the app renews them automatically with the refresh token (valid 30 days, replaced on every use).
