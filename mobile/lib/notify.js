import { Alert, Platform } from 'react-native';

// Simple message box that also works in the web preview.
export function notify(title, message) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
