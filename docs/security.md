# Security and QA record

Last full review: 20 October 2026. Re-check before each store release.

## Secrets: where they live

| Secret | Where | Never in |
|---|---|---|
| Claude API key, Google Maps key, MongoDB link, JWT secret, Firebase service account, Sentry DSN (server) | `server/.env` on the developer's computer, Render → Environment | git, the app, chat |
| `MONGODB_URI`, `BACKUP_PASSPHRASE` | GitHub → Settings → Secrets → Actions | git, chat |

- Checked: no server secret has ever been committed (all of git history scanned).
- The app only contains **public** settings: the server address and the Firebase web config (`EXPO_PUBLIC_*`). Google designs Firebase web keys to be public; they are protected by restricting the key (below), not by hiding it. Anything shipped inside an app can be read by someone who unpacks it, so real secrets never go in the app.

## What the server does

- **Sign-in:** Firebase ID tokens checked by Google's library; verified email required. Our own access tokens last 15 minutes (HS256 only, algorithm pinned); refresh tokens are random, stored only as SHA-256 hashes, and rotated on every use. Test "skip login" is off in production (checked live: 404).
- **Every private route** requires sign-in and validates its input with zod (tested: 401 without a token; forged and unsigned tokens refused).
- **Security headers** (helmet): HSTS, nosniff, frame-deny and more; no `X-Powered-By`.
- **CORS:** browsers may call the API only from karisglobalretail.com (and localhost while developing). The phone apps aren't affected.
- **Request limits:**
  - 600 requests / 15 min per address for everything (`RATE_LIMIT_API`).
  - 30 / 15 min per address for sign-in (`RATE_LIMIT_AUTH`).
  - Per person per hour: chat 80, quick picks 150, day plan 40, plan note 80, fridge scan 20, reports 20; plus the features' own limits (voice 200/h, swaps 30/h, Snap 20/day, songs 30/day).
  - **Daily AI cap:** 200 Claude calls per person per day across all features (`AI_DAILY_LIMIT`), so one account can't run up the Claude bill.
- **Body size:** 100 KB normally, 6 MB only on the three photo routes.
- **Privacy in logs and crash reports:** no request bodies, photos, chat text, auth headers or emails.
- **Dependencies:** `npm audit` on the server: 0 known vulnerabilities (uuid pinned to a fixed version). The app's remaining audit warnings are build-time tools, or Firebase modules the app doesn't load; none is reachable on a phone.

## Load test (local server, real MongoDB, 20 Oct 2026)

| Test | Result |
|---|---|
| Server alone | ~2,900 requests/s |
| Signed in + database read | ~106 requests/s, median 30 ms |
| Signed in + recipe matching | ~56 requests/s, median 72 ms |
| Flood of 1,000 requests from one address | 600 served, 400 blocked (limit works) |

The limit is the **free MongoDB tier (M0, ~100 operations/second)**. Signed-in users are now remembered for 30 seconds (cleared on any account change), which doubled capacity. That is enough for a few hundred people using the app at the same moment. Before real growth, move MongoDB to a paid tier (Flex or M10) in the same region (AWS Mumbai, ap-south-1).

## QA checks done

- Every screen link in the app points to a real screen (87 links, 0 broken).
- Every button has an action.
- Hindi: every app text has a Hindi version.
- Website: all 26 pages and files load; all policy, Zomato, Swiggy, Maps, Spotify and YouTube Music links work.
- Keyboard: on Android (edge-to-edge since SDK 54) the keyboard covered text boxes. Fixed with `react-native-keyboard-controller` on every screen with typing: chat, sign-in, forgot password, kitchen, Snap, taste, and the Report sheet.
- Automatic tests: 26 server tests run on every push (GitHub Actions).

## Still to do (owner)

1. **Rotate** the Claude API key and the MongoDB password (both were shared in chat during development), then update `server/.env` and Render.
2. **Restrict the Google keys** in Google Cloud → Credentials:
   - Server key (Maps, Places, Routes, Weather, Text-to-Speech): restrict to those APIs. Render has no fixed IP on the free plan, so API restrictions are the main protection.
   - Firebase web key: restrict to the Android app (`app.kyakhaun` + SHA-1), the iOS bundle id, and the Identity Toolkit / Firebase APIs.
3. **Firebase App Check** (optional, recommended): lets only the real app use Firebase.
4. **Budget alerts** in Google Cloud and a monthly spend limit in the Claude Console.
5. Set `NODE_ENV=production` on Render, if it isn't already.
6. **Upgrade MongoDB** from the free tier before a marketing push.

## Still to do (code)

- Auto-delete chats older than 90 days, and say so in the privacy policy.
- Before release: re-run `npm audit`, the server tests, and the link check.
