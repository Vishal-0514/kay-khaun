# Kya Khaun? — To-do list

Last updated: 11 October 2026

Order agreed: 1 New features → 2 Experience polish → 3 Store rules → 4 Reliability → 5 Security → 6 Launch preparation.
Phases 1–3 are done and pushed (latest commit `95bc586`).

---

## 1. Your to-dos (only you can do these)

### Now (small, quick)
- [ ] **Render → Environment:** add `SUPPORT_EMAIL` (a real inbox) and `LEGAL_NAME` (your name or company). The privacy, terms and delete-account pages show them.
- [ ] **Install the latest APK** and test: new icon, AI consent screen, vibration, meal reminders, Hindi voice, share.
  APK: https://expo.dev/artifacts/eas/zYbbFzeZFzlbaFnaWJYY7b7qRxWcXXWRLf09n94jl9g.apk
- [ ] **Sentry** (free, crash reports): create 2 projects (React Native + Node.js) and send the 2 DSNs.
- [ ] **GitHub → Settings → Secrets and variables → Actions:** add `MONGODB_URI` for nightly database backups. Don't paste it in chat.
- [ ] **Claude Console → Limits:** set a monthly spend limit (for example $20) so a bug or abuse can't run up a big bill.

### Before launch
- [ ] **Google Places key**, so picks are real restaurants instead of sample dishes. **This is the most important item for launch.** Add a card in Google Cloud, then set a budget alert and a daily cap.
- [ ] **Hosting decision (reminder):** Render's free plan sleeps, so the first open can take up to a minute. Options:
  - free pinger that keeps it awake (UptimeRobot / cron-job.org)
  - Render paid (about $7 a month)
  - Google Cloud Run (once the Google card is added)
- [ ] **Buy a domain** (about ₹800–1,500 a year, for example `kyakhaun.app` or `kyakhaun.in`). It gives a professional support email and privacy/terms links that don't break if hosting changes.
- [ ] **Google Play developer account** ($25 one-time). A personal account needs a **closed test with 12 testers for 14 days** before publishing, so start this early.
- [ ] **Apple Developer account** ($99 a year). No Mac needed; EAS builds the iPhone app in the cloud.
- [ ] **Reviewer demo account**: create it in the app, following the steps in `docs/store-review.md`.
- [ ] **Rotate the Claude key and the MongoDB password** (Phase 5). Both were shared in chat earlier.
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

### Phase 4: Reliability
- [ ] Sentry crash reporting (app + server)
- [ ] Over-the-air updates (EAS Update): small fixes reach phones without a new build
- [ ] App version in Profile + a "What's new" screen after updates
- [ ] Automatic server tests on every push (GitHub Actions)
- [ ] Nightly database backup (last 30 days kept)
- [ ] Fix: a reopened saved day plan shows its note in English even in Hindi mode

### Phase 5: Security
- [ ] Request limits per user and IP + a **daily AI limit per user** (protects the Claude bill)
- [ ] Security headers (helmet), and CORS locked down
- [ ] Restrict the Google and Firebase keys to the app only
- [ ] Update dependencies and fix known vulnerabilities
- [ ] Chat retention: for example, auto-delete chats older than 90 days, and update the privacy policy to match
- [ ] Final security review of the whole codebase

### Phase 6: Launch preparation
- [ ] Sign in with Apple (required by Apple because the app offers Google sign-in)
- [ ] Switch on Google Places and test real restaurants
- [ ] Production builds (Play Store AAB + iPhone)
- [ ] Store listing text (English + Hindi), screenshots, feature graphic
- [ ] Fill the Play Data safety and Apple App Privacy forms (answers ready in `docs/store-review.md`)
- [ ] iPhone testing through TestFlight
- [ ] Final hosting move, if one is chosen

### Phase 7 (optional): Swiggy in-app ordering
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
2. Phase 4
3. Google Places key + domain
4. Phase 5
5. Developer accounts (start the Play closed test early, because it takes 14 days) + Phase 6
