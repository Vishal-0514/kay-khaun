import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Icon from './Icon';
import { PressScale } from './Motion';
import { useTip, useTips } from '../lib/tips';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../lib/theme';
import { t } from '../lib/i18n';

// A one-line hint shown the first time someone reaches a screen.
export default function Tip({ id, text, icon = 'spark', style }) {
  const show = useTip(id);
  if (!show) return null;
  return (
    <Animated.View entering={FadeIn.duration(300).delay(500)} exiting={FadeOut.duration(200)} style={[styles.tip, style]} role="note">
      <Icon name={icon} size={18} color={colors.goldText} />
      <Text style={styles.tipText}>{text}</Text>
      <Pressable onPress={() => useTips.getState().dismiss(id)} hitSlop={10} role="button" aria-label={t('Got it, hide this tip')} style={styles.close}>
        <Icon name="close" size={14} color={colors.goldText} />
      </Pressable>
    </Animated.View>
  );
}

const STEPS = [
  { icon: 'mic', title: 'Tell Chatora a craving', text: 'Speak or type in any language, like "kuch teekha, 400 ke andar".' },
  { icon: 'flame', title: 'Or just tap a mood', text: 'Spicy, Comfort, Light, Street or Sweet: five picks in one tap.' },
  { icon: 'bag', title: 'Order where you already do', text: 'Kya Khaun helps you decide. You order on Zomato or Swiggy as usual.' },
  { icon: 'heart', title: 'It learns your taste', text: 'Save what you love and say "Not for me" to the rest. Your picks get better.' },
];

// Home's welcome guide for someone new: four short steps, shown once.
export function WelcomeTips({ style }) {
  const show = useTip('welcome');
  const [step, setStep] = useState(0);
  if (!show) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const done = () => useTips.getState().dismiss('welcome');

  return (
    <Animated.View entering={FadeIn.duration(400).delay(900)} exiting={FadeOut.duration(250)} style={[styles.card, style]} role="region" aria-label={t('How Kya Khaun works')}>
      <View style={styles.head}>
        <Text style={styles.label}>{t('New here? {n} of {total}', { n: step + 1, total: STEPS.length })}</Text>
        {last ? null : (
          <Pressable onPress={done} hitSlop={10} role="button">
            <Text style={styles.skip}>{t('Skip')}</Text>
          </Pressable>
        )}
      </View>
      <Animated.View key={step} entering={FadeIn.duration(280)} style={styles.body}>
        <View style={styles.iconWrap}>
          <Icon name={s.icon} size={22} color={colors.red} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{t(s.title)}</Text>
          <Text style={styles.text}>{t(s.text)}</Text>
        </View>
      </Animated.View>
      <View style={styles.foot}>
        <View style={styles.dots} aria-hidden>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        <PressScale
          role="button"
          onPress={() => {
            tap();
            if (last) done();
            else setStep(step + 1);
          }}
          style={styles.next}
        >
          <Text style={styles.nextText}>{last ? t('Got it') : t('Next')}</Text>
          {last ? null : <Icon name="arrow" size={16} color="#FFFFFF" />}
        </PressScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, paddingLeft: space.base, paddingRight: space.sm, borderRadius: 16, backgroundColor: colors.goldSoft },
  tipText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.goldText },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { padding: space.base, gap: space.md, borderRadius: radius.card, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: '#F1DDB4' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.goldText },
  skip: { fontFamily: fonts.semibold, fontSize: 14, color: colors.goldText, textDecorationLine: 'underline' },
  body: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 64 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, color: colors.ink },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.body },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EBD3A6' },
  dotOn: { width: 20, backgroundColor: colors.gold },
  next: { height: 44, paddingHorizontal: space.base, borderRadius: radius.full, backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },
});
