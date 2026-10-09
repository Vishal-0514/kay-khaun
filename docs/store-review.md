# Store review kit

Everything to paste into App Store Connect and Google Play Console, plus what to set up first.
Replace `SERVER` below with the live server address (today: `https://kya-khaun-server.onrender.com`).

## Before you submit

- [ ] On Render → Environment, set **SUPPORT_EMAIL** (a real inbox you read) and **LEGAL_NAME** (your name or company). They appear on the privacy, terms and delete-account pages.
- [ ] Optional: set **FIREBASE_SERVICE_ACCOUNT** (Firebase console → Project settings → Service accounts → Generate new private key; paste the JSON on one line). With it, "Delete my account" also removes the Firebase sign-in record. Without it, all Kya Khaun data is still deleted; only the email stays in Firebase.
- [ ] Create a **reviewer account** in the app: Continue with email → create an account with an email you control → verify it → finish "Your taste" → choose **Allow AI**. Keep the password for the notes below.
- [ ] Decide on hosting so the first open doesn't take up to a minute (see the hosting reminder).

## Links

| What | URL |
| --- | --- |
| Privacy policy | `SERVER/privacy` |
| Terms of use | `SERVER/terms` |
| Delete account (Play "Data deletion" URL) | `SERVER/delete-account` |

## Notes for the reviewer

Paste into App Store Connect → App Review Information → Notes, and Play Console → App content → App access.

```
Kya Khaun? helps people in India decide what to eat. Chatora, the in-app guide, suggests dishes, places and recipes. The app does not sell food or take payments: "Zomato" and "Swiggy" buttons open those apps or websites, where the person orders. Kya Khaun is not affiliated with Zomato or Swiggy, and says so in the app. Some dishes are sample data that show how picks work; these are labelled "Sample".

Sign-in: email + password, or Google.
Demo account:  email: ____________   password: ____________

AI: Chatora's replies, recipe ideas and fridge-photo scans use Claude (Anthropic). After setup, the app explains what is sent to Anthropic and asks permission ("Allow AI" / "Not now, use basic mode"). This can be changed any time in Profile → Use AI. Every AI reply has a "Report" link, and reports reach us for review.

Account deletion: Profile → scroll down → "Delete my account". It deletes the account and all its data immediately. Web: SERVER/delete-account

Permissions (all optional, asked only when used):
- Location: to find food near you.
- Camera / photos: to scan your fridge for ingredients.
- Microphone / speech recognition: to speak your craving instead of typing.
- Notifications: meal reminders you set up yourself.
```

## Google Play: Data safety

Data is encrypted in transit: **Yes**. People can request deletion: **Yes** (in app + `SERVER/delete-account`). No data is sold or used for ads. Service providers (Anthropic, Google, MongoDB, Render) process data on our behalf, which Play does not count as "sharing".

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Personal info → Name | Yes | No | Required | Account management, app functionality |
| Personal info → Email address | Yes | No | Required | Account management |
| Location → Approximate location | Yes, processed ephemerally | No | Optional | App functionality |
| Photos and videos → Photos | Yes, processed ephemerally | No | Optional | App functionality (fridge scan) |
| App activity → App interactions | Yes | No | Optional ("Remember my taste") | Personalisation |
| App activity → In-app search history | Yes (chats) | No | Required to use chat | App functionality, personalisation |
| App activity → Other user-generated content | Yes (chats, reports) | No | Required to use chat | App functionality |

Not collected: financial info, contacts, messages, audio (speech is turned into text by the phone's own recogniser), health, device or advertising IDs.

## Apple: App Privacy

Tracking: **No**. For each item: **Linked to the user: Yes**, **Used for tracking: No**.

| Data type | Purposes |
| --- | --- |
| Contact info → Name, Email address | App functionality |
| Location → Coarse location | App functionality |
| User content → Photos | App functionality |
| User content → Other user content (chats, reports) | App functionality |
| Search history (what you ask Chatora) | App functionality, product personalisation |
| Usage data → Product interaction (opened, ordered, saved) | Product personalisation |

## Content and age rating

- No user-to-user content or chat between people; AI replies are about food, can be reported, and Claude follows Anthropic's usage policies.
- No gambling, violence or mature content. Expected rating: Everyone / 4+ (choose "contains AI-generated content" where asked).
