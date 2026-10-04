// Google sign-in uses the official native library, which only exists in a
// development or store build of the app — not in Expo Go or the web preview.
// Loading it lazily keeps those working; the button then explains instead.
import { Platform } from 'react-native';

let google = null;
if (Platform.OS !== 'web') {
  try {
    google = require('@react-native-google-signin/google-signin');
  } catch {
    google = null;
  }
}

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
let configured = false;

export function googleUnavailableReason() {
  if (!google?.GoogleSignin) return 'Google sign-in works in the installed app build. For now, continue with phone or email.';
  if (!webClientId) return 'Google sign-in is not set up yet (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID). Continue with phone or email for now.';
  return null;
}

// Returns Google's ID token, or null if the user closed the sheet.
export async function getGoogleIdToken() {
  const { GoogleSignin, isSuccessResponse } = google;
  if (!configured) {
    GoogleSignin.configure({ webClientId, iosClientId });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  return response.data.idToken;
}
