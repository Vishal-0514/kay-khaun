import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Google's sign-in needs native code that Expo Go and the browser preview
// don't have, so the library is only loaded inside a real app build — a plain
// import would crash Expo Go at startup.
function loadNative() {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

const native = loadNative();
let configured = false;

// Why Google can't be used right now, or null when it can.
export function googleUnavailableReason() {
  if (!native) return 'Google sign-in works in the installed Kya Khaun app. For now, please continue with email.';
  if (!WEB_CLIENT_ID) return "Google sign-in isn't set up yet. Please continue with email.";
  return null;
}

// Opens Google's account picker. Resolves with Google's ID token (handed to
// Firebase in lib/firebase.js), or null if they closed the picker.
export async function signInWithGoogle() {
  const reason = googleUnavailableReason();
  if (reason) throw new Error(reason);

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = native;
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const idToken = response.data?.idToken;
    if (!idToken) throw new Error('Google did not return a sign-in token. Please try again.');
    return idToken;
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play services is missing or out of date on this phone.');
      }
    }
    throw err instanceof Error ? err : new Error('Google sign-in failed. Please try again.');
  }
}

// On sign out, so the next Google sign-in shows the account picker again
// instead of silently reusing the last account.
export async function signOutOfGoogle() {
  if (!native || !configured) return;
  try {
    await native.GoogleSignin.signOut();
  } catch {}
}
