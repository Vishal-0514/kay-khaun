# Store review kit

Everything to paste into App Store Connect and Google Play Console, plus what to set up first.
Last checked: 21 October 2026 (app 1.2.0).

## Before you submit

- [ ] Optional: set **FIREBASE_SERVICE_ACCOUNT** on Render (Firebase console → Project settings → Service accounts → Generate new private key; paste the JSON on one line). With it, "Delete my account" also removes the Firebase sign-in record. Without it, all Kya Khaun data is still deleted; only the email stays in Firebase.
- [ ] Create a **reviewer account** in the app: Continue with email → create an account with an email you control → verify it → choose **Allow AI**. Keep the password for the notes below.
- [ ] Decide on hosting so the first open doesn't take up to a minute (see the hosting reminder).

## Links

| What | URL |
| --- | --- |
| Privacy policy | `https://www.karisglobalretail.com/apps/kya-khaun/privacy` |
| Terms of use | `https://www.karisglobalretail.com/apps/kya-khaun/terms` |
| Support | `https://www.karisglobalretail.com/apps/kya-khaun/support` |
| Delete account (Play "Data deletion" URL) | `https://www.karisglobalretail.com/apps/kya-khaun/delete-account` |

## Notes for the reviewer

Paste into App Store Connect → App Review Information → Notes, and Play Console → App content → App access.

```
Kya Khaun? helps people in India decide what to eat. Chatora, the in-app guide, suggests dishes, places and recipes, and festival dishes for the season. The app does not sell food or take payments: "Zomato" and "Swiggy" buttons open the restaurant's page in those apps or websites, where the person orders, and "Call restaurant" opens the phone's dialler. Kya Khaun is not affiliated with Zomato or Swiggy, and says so in the app. Some dishes are sample data that show how picks work; these are labelled "Sample".

Sign-in: email + password, or Google.
Demo account:  email: ____________   password: ____________

AI: Chatora's replies, recipe ideas, fridge-photo scans, Snap Your Order and song picks use Claude (Anthropic). After sign-up, the app explains what is sent to Anthropic and asks permission ("Allow AI" / "Not now, use basic mode"). This can be changed any time: tap the circle at the top of Home → Settings → Use AI. Every AI reply has a "Report" link, and reports reach us for review.

Account deletion: tap the circle at the top of Home → Settings → scroll down → "Delete my account". It deletes the account and all its data immediately. Web: https://www.karisglobalretail.com/apps/kya-khaun/delete-account

Permissions (all optional, asked only when used):
- Location: to find food near you.
- Camera / photos: to scan your fridge for ingredients, for Snap Your Order (a photo of where you are, read for the setting only and not stored), for songs for your meal (a photo of the food, not stored), and to keep a photo of a dish you cooked in My Kitchen (stored only on the phone, never uploaded).
- Microphone / speech recognition: to speak to Chatora instead of typing, and to say "next" or "repeat" while cooking.
- Notifications: meal reminders you set up yourself.
```

## Google Play: Data safety

Data is encrypted in transit: **Yes**. People can request deletion: **Yes** (in app + the delete-account page). No data is sold or used for ads. Service providers (Anthropic, Google, Sentry, MongoDB, Render) process data on our behalf, which Play does not count as "sharing".

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Personal info → Name | Yes | No | Required | Account management, app functionality |
| Personal info → Email address | Yes | No | Required | Account management |
| Location → Approximate location | Yes, processed ephemerally | No | Optional | App functionality |
| Photos and videos → Photos | Yes, processed ephemerally | No | Optional | App functionality (fridge scan, Snap Your Order, songs for your meal) |
| App activity → App interactions | Yes (saved picks, history) | No | Optional | App functionality (Saved, History, "Order again") |
| App activity → In-app search history | Yes (chats) | No | Required to use chat | App functionality |
| App activity → Other user-generated content | Yes (chats, reports) | No | Required to use chat | App functionality |
| App info and performance → Crash logs, Diagnostics | Yes, once Sentry DSNs are set | No | Required | App functionality (fixing bugs) |

Photos of dishes people cook (My Kitchen) stay on the phone and are never sent to us, so they are **not** "collected" in Play's sense.

Not collected: financial info, contacts, messages, audio (speech is turned into text by the phone's own recogniser), health, device or advertising IDs, and no taste profile (the app stopped keeping one in version 1.2.0).

## Apple: App Privacy

Tracking: **No**. For each item: **Linked to the user: Yes**, **Used for tracking: No** (crash data: not linked).

| Data type | Purposes |
| --- | --- |
| Contact info → Name, Email address | App functionality |
| Location → Coarse location | App functionality |
| User content → Photos | App functionality |
| User content → Other user content (chats, reports) | App functionality |
| Search history (what you ask Chatora) | App functionality |
| Usage data → Product interaction (saved, history) | App functionality |
| Diagnostics → Crash data | App functionality (fixing bugs); not linked to the account |

## Content and age rating

- Music: the app only suggests song names (checked against Apple's public iTunes catalogue, explicit songs skipped) and opens Spotify, YouTube Music or Apple Music. No music plays inside the app and no lyrics are shown, so no music licence is needed.
- No user-to-user content or chat between people; AI replies are about food, can be reported, and Claude follows Anthropic's usage policies.
- No gambling or violence. **Alcohol:** bars, pubs, clubs and breweries are never suggested (filtered by place type and name). If the user says they are drinking (wine, beer…), Chatora suggests food that goes with it. It never suggests or encourages alcohol, and reminds people not to drive after drinking. Answer the questionnaires as "mild or infrequent references to alcohol": expected rating about **12+ on Apple** and **Teen / PEGI 12 on Google Play**. Choose "contains AI-generated content" where asked.
- Sign in with Apple: required by Apple because the app offers Google sign-in. Not built yet (launch phase).
