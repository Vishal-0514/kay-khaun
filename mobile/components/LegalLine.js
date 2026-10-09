import { Text } from 'react-native';
import { PAGES, openPage } from '../lib/pages';
import { colors, fonts } from '../lib/theme';
import { t } from '../lib/i18n';

// "By continuing you agree to our Terms and Privacy Policy." with both as links.
// The sentence is translated whole ({terms} and {privacy} mark the links), so
// word order can change by language.
export default function LegalLine({ text, style, linkColor }) {
  const link = [{ textDecorationLine: 'underline', fontFamily: fonts.semibold, color: linkColor ?? colors.ink }];
  const parts = t(text).split(/(\{terms\}|\{privacy\})/);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part === '{terms}' ? (
          <Text key={i} role="link" style={link} onPress={() => openPage(PAGES.terms)}>
            {t('Terms')}
          </Text>
        ) : part === '{privacy}' ? (
          <Text key={i} role="link" style={link} onPress={() => openPage(PAGES.privacy)}>
            {t('Privacy Policy')}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}
