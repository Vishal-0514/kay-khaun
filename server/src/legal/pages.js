// Public web pages the app stores ask for: privacy policy, terms of use and how
// to delete your account. Served at /privacy, /terms and /delete-account.
// Contact details come from SUPPORT_EMAIL and LEGAL_NAME in the server's env.

const UPDATED = '9 October 2026';

const contact = () => process.env.SUPPORT_EMAIL || 'support@kyakhaun.app';
const owner = () => process.env.LEGAL_NAME || 'Kya Khaun';
const mail = () => `<a href="mailto:${contact()}">${contact()}</a>`;

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Kya Khaun?</title>
<style>
  :root { --ink:#2B0F0B; --body:#4A3631; --muted:#6E5A52; --red:#C8161D; --maroon:#5C0A0F; --gold:#E8A93A; --canvas:#FFFBF4; --hair:#EFE4D3; --soft:#FCF1DA; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--canvas); color:var(--body); font:16px/1.65 -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { background:var(--maroon); color:#FFF4E6; padding:28px 16px 32px; border-radius:0 0 28px 28px; }
  header .in, main { max-width:720px; margin:0 auto; }
  header a { color:var(--gold); text-decoration:none; font-weight:700; }
  header h1 { margin:10px 0 4px; font-size:28px; line-height:1.2; color:#FFF4E6; }
  header p { margin:0; color:#F3D6C8; font-size:14px; }
  main { padding:8px 16px 48px; }
  h2 { color:var(--ink); font-size:20px; margin:32px 0 8px; }
  h3 { color:var(--ink); font-size:16px; margin:20px 0 4px; }
  a { color:var(--red); }
  ul { padding-left:20px; }
  li { margin:4px 0; }
  .note { background:var(--soft); border-radius:16px; padding:14px 16px; margin:20px 0; color:#86560F; }
  table { width:100%; border-collapse:collapse; font-size:14px; margin:8px 0; }
  th, td { text-align:left; vertical-align:top; padding:8px; border-bottom:1px solid var(--hair); }
  th { color:var(--ink); }
  footer { max-width:720px; margin:0 auto; padding:0 16px 40px; font-size:14px; color:var(--muted); }
  footer a { margin-right:16px; }
</style>
</head>
<body>
<header><div class="in"><a href="/privacy">Kya Khaun?</a><h1>${title}</h1><p>Last updated ${UPDATED}</p></div></header>
<main>${body}</main>
<footer><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a><a href="/delete-account">Delete your account</a></footer>
</body>
</html>`;
}

export function privacyPage() {
  return page(
    'Privacy policy',
    `
<p>Kya Khaun? ("Kya Khaun", "we") is an app that helps you decide what to eat. You tell Chatora, our food guide, what you feel like, and it suggests dishes and places, or recipes from what's in your kitchen. You order on Zomato or Swiggy as you normally would. This policy explains what we collect, why, who we share it with, and the choices you have. It is provided by ${owner()}.</p>

<div class="note"><strong>In short:</strong> we collect only what we need to suggest food. We don't sell your data, we don't show ads and we don't track you across other apps or websites. You can delete your chats, your history or your whole account from inside the app at any time.</div>

<h2>What we collect</h2>
<table>
<tr><th>What</th><th>Why</th></tr>
<tr><td><strong>Account:</strong> your name and email address. If you sign in with Google, the name and email on your Google account.</td><td>To sign you in and keep your account. Passwords are handled by Google Firebase; we never see them.</td></tr>
<tr><td><strong>Your taste:</strong> diet, spice level, budget, favourite cuisines and things you avoid.</td><td>To suggest food that suits you.</td></tr>
<tr><td><strong>Chats with Chatora</strong>, and the day plans you save.</td><td>To answer you, and so you can go back to them.</td></tr>
<tr><td><strong>What you do with picks:</strong> dishes you open, order, save (♡) or mark "Not for me".</td><td>To learn your taste and show "Order again". Only while "Remember my taste" is on. Saves are kept because you asked for them.</td></tr>
<tr><td><strong>Approximate location</strong>, if you allow it.</td><td>To find food near you. It is sent with each request and not stored in your account.</td></tr>
<tr><td><strong>Fridge or shelf photos</strong>, only when you choose to scan.</td><td>To spot the ingredients you have. We don't keep the photo.</td></tr>
<tr><td><strong>Voice</strong>, only when you tap the mic.</td><td>Your phone's own speech recognition (Google or Apple) turns it into text. We receive only the text.</td></tr>
</table>
<p>Meal reminders and your language setting stay on your phone. We don't collect advertising IDs, contacts, or anything for advertising.</p>

<h2>Artificial intelligence (AI)</h2>
<p>Chatora's replies and recipe ideas come from Claude, an AI model made by Anthropic. The app asks before using it. If you agree, we send Anthropic what's needed to answer you: your message and the recent chat, your taste settings, your first name and, when you scan, the photo. Anthropic processes it to produce a reply and, under its commercial terms, does not use it to train its models. You can turn AI off in Profile → "Use AI". The app keeps working with simpler matching, and photo scan is switched off.</p>
<p>AI can make mistakes. Always check allergens and ingredients with the restaurant. If a reply looks wrong or unsafe, use "Report" on it in the app.</p>

<h2>Who we share it with</h2>
<p>We don't sell your personal data. We use these service providers to run the app, and they may process your data only for that:</p>
<ul>
<li><strong>Anthropic</strong> (AI replies, if you agree), USA.</li>
<li><strong>Google Firebase</strong> (sign-in and account emails) and <strong>Google Maps Platform</strong> (nearby places, from your approximate location and what you searched).</li>
<li><strong>MongoDB Atlas</strong> (our database) and <strong>Render</strong> (our server).</li>
</ul>
<p>Some of these providers process data outside India. When you tap Zomato or Swiggy, we open their app or website; we don't send them your data, and their own privacy policies apply there. We may share information if the law requires it.</p>

<h2>How long we keep it</h2>
<p>We keep your data while you have an account. You can delete single chats, all chats, your history and what the app has learned from inside the app. When you delete your account, your data is deleted from our database straight away. Copies in backups are removed within 30 days.</p>

<h2>Your choices and rights</h2>
<ul>
<li>See and change your taste settings in Profile.</li>
<li>Turn off "Remember my taste" or "Use AI" at any time.</li>
<li>Delete chats, history or the account: Profile → Delete my account. You can also <a href="/delete-account">ask us by email</a>.</li>
<li>Ask us for a copy of your data, or to correct it, by writing to ${mail()}.</li>
</ul>

<h2>Children</h2>
<p>Kya Khaun is not meant for children under 13. If you are under 18, please use it with a parent's or guardian's permission. If you think a child has given us personal data, write to us and we will delete it.</p>

<h2>Security</h2>
<p>Data travels over encrypted connections (HTTPS). Sign-in is handled by Firebase and the app stores its sign-in token in the phone's secure storage.</p>

<h2>Changes and contact</h2>
<p>If we change this policy, we'll update the date above and tell you in the app when the change matters. For questions, requests or complaints (including as our grievance contact under India's data protection law), write to ${mail()}.</p>
`
  );
}

export function termsPage() {
  return page(
    'Terms of use',
    `
<p>These terms apply when you use the Kya Khaun? app ("Kya Khaun"), provided by ${owner()}. By using the app you agree to them.</p>

<h2>What Kya Khaun does</h2>
<p>Kya Khaun suggests what to eat: dishes and places to order from, recipes to cook, and plans for a day of meals. <strong>We don't sell, prepare or deliver food.</strong> When you choose to order, we open Zomato or Swiggy, and your order is between you, that app and the restaurant, under their terms.</p>
<p>Kya Khaun is independent. It is not affiliated with, endorsed by or sponsored by Zomato, Swiggy or any restaurant. Their names are used only to show where you can order.</p>

<h2>Suggestions, prices and AI</h2>
<ul>
<li>Prices, delivery times, ratings, menus and opening hours are estimates and may be different in the ordering app. Some dishes are samples that show how picks work; they are labelled "Sample" in the app.</li>
<li>Replies from Chatora are written by AI and can be wrong. They are not medical, nutritional or allergy advice. If you have an allergy or a diet for health reasons, check every dish with the restaurant before you order or cook.</li>
<li>Recipes are ideas. Cook safely and use your own judgement.</li>
</ul>

<h2>Your account</h2>
<p>Keep your sign-in details to yourself and tell us if you think someone else is using your account. You can delete your account at any time from Profile → Delete my account.</p>

<h2>Fair use</h2>
<p>Please don't misuse the app: no trying to break or overload it, getting around its limits, copying it at scale, or using Chatora to create harmful or illegal content. We may limit or close accounts that do.</p>

<h2>Our responsibility</h2>
<p>We work to keep Kya Khaun useful and available, but it is provided "as is". As far as the law allows, we are not responsible for food, orders, payments or deliveries made through other apps, or for losses that come from relying on a suggestion. Nothing here limits rights you have by law.</p>

<h2>Changes</h2>
<p>We may update the app and these terms. When a change matters, we'll tell you in the app. Using the app after that means you accept the new terms.</p>

<h2>Law and contact</h2>
<p>These terms are governed by the laws of India, and the courts of Mumbai have jurisdiction. Questions? Write to ${mail()}.</p>
`
  );
}

export function deleteAccountPage() {
  return page(
    'Delete your Kya Khaun account',
    `
<h2>From the app (quickest)</h2>
<ol>
<li>Open Kya Khaun? and go to <strong>Profile</strong>.</li>
<li>Scroll down and tap <strong>Delete my account</strong>.</li>
<li>Confirm. Your account and data are deleted straight away.</li>
</ol>

<h2>Without the app</h2>
<p>Email ${mail()} from the email address you sign in with, with the subject <strong>"Delete my account"</strong>. We'll confirm and delete it within 7 days.</p>

<h2>What gets deleted</h2>
<ul>
<li>Your account: name, email and sign-in.</li>
<li>Your taste settings, chats with Chatora, saved dishes and places, saved day plans, order history and everything the app learned about your taste.</li>
</ul>
<p>If you reported a reply from Chatora, the report text is kept for safety review but is no longer linked to you. Copies in backups are removed within 30 days. Meal reminders live on your phone and go when you uninstall the app.</p>
<p>Want to remove only some data? In the app you can delete single chats, clear your history, or clear what the app has learned, without deleting the account.</p>
`
  );
}
