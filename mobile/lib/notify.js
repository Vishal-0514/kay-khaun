import { Alert, Platform } from 'react-native';
import { t } from './i18n';

// Simple message box that also works in the web preview.
export function notify(title, message) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

// Yes/no question for things that can't be undone. Resolves true on yes.
export function confirm(title, message, yesLabel = 'Yes') {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: yesLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
