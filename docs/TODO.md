# Kya Khaun? — To-do list

Last updated: 20 October 2026

Order agreed: 1 New features → 2 Experience polish → 3 Store rules → 4–7 Blueprint features → 8 Reliability → 9 Security → 10 Launch preparation.
Phases 1–3 are done and pushed (latest commit `95bc586`).

---

## 1. Your to-dos (only you can do these)

### Now (small, quick)
- [ ] **Install the latest APK** and test: new icon, AI consent screen, vibration, meal reminders, Hindi voice, share.
  APK: https://expo.dev/artifacts/eas/zYbbFzeZFzlbaFnaWJYY7b7qRxWcXXWRLf09n94jl9g.apk
- [ ] **Sentry** (free, crash reports): create 2 projects (React Native + Node.js) and send the 2 DSNs.
- [ ] **GitHub → Settings → Secrets and variables → Actions:** add `MONGODB_URI` and `BACKUP_PASSPHRASE` (a long password you keep safe) for nightly backups. See docs/backups.md. Don't paste them in chat.
- [ ] **Claude Console → Limits:** set a monthly spend limit (for example $20) so a bug or abuse can't run up a big bill.

### Before launch
- [x] **Google Places key**, so picks are real restaurants instead of sample dishes. **This is the most important item for launch.** Add a card in Google Cloud, then set a budget alert and a daily cap.
- [ ] **Hosting decision (reminder):** Render's free plan sleeps, so the first open can take up to a minute. Options:
  - free pinger that keeps it awake (UptimeRobot / cron-job.org)
  - Render paid (about $7 a month)
  - Google Cloud Run (once the Google card is added)
- [x] **Domain and website:** karisglobalretail.com is live on Vercel; the app's privacy, terms and support links point to it.
- [ ] **Google Cloud free credit runs out around 9 January 2027** (84 days left on 17 October 2026). Upgrade to a full billing account before then, or nearby places and Chatora's voice stop. Set a budget alert at the same time.
- [ ] **Google Play developer account** ($25 one-time). A personal account needs a **closed test with 12 testers for 14 days** before publishing, so start this early.
- [ ] **Apple Developer account** ($99 a year). No Mac needed; EAS builds the iPhone app in the cloud.
- [ ] **Reviewer demo account**: create it in the app, following the steps in `docs/store-review.md`.
- [ ] **Rotate the Claude key and the MongoDB password**. Both were shared in chat earlier.
- [ ] **Firebase:** decide whether it stays on the current Google account or moves to a company or client account before launch.
- [ ] Optional: **`FIREBASE_SERVICE_ACCOUNT`** on Render, so "Delete my account" also removes the Firebase sign-in email.

### Business
- [ ] Decide the **legal name** (individual or company). It goes on the store listings and the policies.
- [ ] Check the name **"Kya Khaun"** isn't already trademarked or used by another app on the stores.
- [ ] Optional: apply to the **Swiggy Builders Club** (Startup track). It takes 4+ weeks.
  - Apply: https://mcp.swiggy.com/builders/access/ · builders@swiggy.in
  - Ask about commission per order, menus before sign-in, branding rules, and whether the integration can be published on the app stores.
  - Zomato currently does not allow third-party apps on its MCP. Keep the "Open Zomato" link.
- [ ] **Every year:** update the festival dates in `server/src/data/occasions.js`.

---

## 2. What I will build (in order)

Phases 4–7 come from the blueprint PDFs ("Full Product Flow & Feature Blueprint" and "Snap Your Food – Get Your Song").
Plan page: https://claude.ai/artifact/7UpJaXKGgZHUCmF53X3hvs

### Phase 4: Quick upgrades (the half-built parts)
- [x] At most 5 recipes in Cook at home
- [x] Weather in Chatora's thinking (rain → chai and pakoda, heat → coolers). Built; switches on once **you** enable the Weather API on the Google key
- [x] Food that goes with your drink ("I'm drinking wine tonight"). Store age rating becomes about 12+ / Teen (see docs/store-review.md)
- [x] Chatora suggests a swap for any missing ingredient, respecting the diet and avoid list

### Phase 5: Go Out ("Where should I go?")
- [x] Third choice beside Order and Cook, in chat, voice and on Home
- [x] Understands café, dinner, chill, live music, date, long drive
- [x] 3–4 real nearby places: rating, distance, travel time, vibe, open now, "Why it fits"
- [x] Travel time with traffic (Google Routes).
- [x] Long drive ideas (scenic spots, dhabas 20–80 km away)
- [x] Directions button (Google Maps / Apple Maps); save ♡ and history for places
- Bars, pubs and nightclubs are left out of Go Out (alcohol and the age rating)

### Phase 6: Snap My Mood
- [x] Home's Snap offers: Where I am / My kitchen / My food
- [x] Photo of where you are, plus an optional voice or text line
- [x] Chatora reads the setting as hints (never claims your mood) and gives 4–5 food or place ideas with "Why this fits"
- [x] Privacy policy, AI consent and store data-safety updates (the photo isn't kept)

### Phase 7: Snap Your Food, Get Your Song
- [x] Photo of your food, then Hindi / English / Both
- [x] 3–4 songs with a short reason, each checked against Apple's public music catalogue so none are made up
- [x] Open in Spotify, YouTube Music or Apple Music (no playback or lyrics in the app)
- [x] "Song for this meal?" on every dish page (no photo needed)

### Phase 8: Reliability
- [x] Sentry crash reporting (app + server): built; switches on when **you** add the DSNs (app: `EXPO_PUBLIC_SENTRY_DSN` in eas.json; server: `SENTRY_DSN` on Render)
- [x] Over-the-air updates (EAS Update): set up; works from the next build. Send a fix with `npm run update:preview -- "what changed"`
- [x] App version in Profile + a "What's new" screen after updates (app version is now 1.1.0)
- [x] Automatic server tests on every push (GitHub Actions, 27 tests)
- [x] Nightly encrypted database backup, kept 30 days: needs **you** to add `MONGODB_URI` and `BACKUP_PASSPHRASE` in GitHub (see docs/backups.md)
- [x] Fix: a reopened saved day plan shows its note in English even in Hindi mode

### Phase 9: Security
- [x] Request limits per user and IP + a **daily AI limit per user** (protects the Claude bill)
- [x] Security headers (helmet), and CORS locked down
- [x] Google and Firebase keys: checked, both already limited to the APIs they need (see docs/security.md; no app restriction on the Firebase key, it would break sign-in)
- [x] Request limits count each person's real address (they counted Cloudflare's shared ones)
- [x] The app only opens https links to known sites (ordering, maps, music)
- [x] Update dependencies and fix known vulnerabilities (server: 0 known issues)
- Chat auto-delete: skipped (owner's decision). People can delete chats, or their account, any time
- [x] Security + QA review (docs/security.md): secrets, routes, tokens, load test, links, keyboard. Re-run before release

### Phase 10: Launch preparation
- [ ] Sign in with Apple (required by Apple because the app offers Google sign-in)
- [ ] Switch on Google Places and test real restaurants
- [ ] Production builds (Play Store AAB + iPhone)
- [ ] Store listing text (English + Hindi), screenshots, feature graphic
- [ ] Fill the Play Data safety and Apple App Privacy forms (answers ready in `docs/store-review.md`)
- [ ] iPhone testing through TestFlight
- [ ] Final hosting move, if one is chosen

### Phase 11 (optional): Swiggy in-app ordering
- [ ] Only after Swiggy approves: link a Swiggy account → cart → place order → track, all inside Kya Khaun
- [ ] Update the privacy policy, the "not linked to Swiggy" note and the store forms

---

## 3. Suggestions (not started; pick what you want)

### Make the app better
- [ ] **Allergies in "Your taste"** (peanuts, dairy, gluten…): Chatora always avoids them and warns. The most important safety addition for an AI food app.
- [ ] **"Where should we eat?" group vote**: share a link on WhatsApp, friends vote on 3 picks, and the winner shows. Fun, and it brings new users.
- [ ] **"Send feedback"** in Profile, for early users.
- [ ] **"Rate Kya Khaun" prompt**, asked once after a few good picks. Ratings help store ranking.
- [ ] **Privacy-friendly analytics**, to see which features people use. Needs a privacy policy update and a consent line.
- [ ] **Festival push notifications** (for example, "Diwali sweets near you"). Only with permission; needs a small server setup.

### Money (later)
- [ ] **Kya Khaun Plus**: more AI chats, weekly meal plans, family planning. Sold through Apple and Google in-app purchase (they take 15–30%).
- [ ] **Clearly labelled "Sponsored" restaurant spots** from local restaurants. They must never change Chatora's honest ranking.
- [ ] **Restaurants' own ordering links** (Petpooja, DotPe, WhatsApp ordering), which save restaurants the commission. Restaurants could pay to be featured.
- [ ] **Grocery links in Cook at home**: "missing ingredients? Get them on Amazon Fresh" (Amazon Associates India). Check whether Blinkit, Zepto or Instamart run affiliate programs.
- [ ] Long-term: **ONDC** buyer app, for in-app ordering without Swiggy or Zomato. Needs a company, payments, refunds and a grievance process.

---

## Suggested order
1. The quick to-dos: Render settings, Sentry, GitHub secret, Claude spend limit
2. Phases 4–7 (blueprint features), then Phase 8
3. Google Places key + domain
4. Phase 9
5. Developer accounts (start the Play closed test early, because it takes 14 days) + Phase 10
