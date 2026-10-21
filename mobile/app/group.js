import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { PressScale, rise, riseUp } from '../components/Motion';
import { useChatStore } from '../store/useChatStore';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// Order for a Group: how many are eating, how many are veg, what kind of
// group and the budget each, then restaurants that work for everyone.
const KINDS = [
  { id: 'friends', label: 'Friends', icon: 'people' },
  { id: 'family', label: 'Family', icon: 'home' },
  { id: 'office', label: 'Office', icon: 'bag' },
  { id: 'party', label: 'Party', icon: 'spark' },
];
const BUDGETS = [200, 300, 500, 800, 1200];
const CUISINES = ['North Indian', 'Biryani', 'Chinese', 'South Indian', 'Street food', 'Mughlai'];

// − 6 + with big round buttons.
function Stepper({ value, min, max, onChange, label }) {
  const step = (d) => {
    const next = Math.max(min, Math.min(max, value + d));
    if (next !== value) {
      tap();
      onChange(next);
    }
  };
  return (
    <View style={styles.stepper} aria-label={label}>
      <PressScale scaleTo={0.88} role="button" aria-label={t('Fewer')} disabled={value <= min} onPress={() => step(-1)} style={[styles.stepBtn, value <= min && styles.stepOff]}>
        <Text style={styles.stepSign}>−</Text>
      </PressScale>
      <Text style={styles.stepValue} aria-live="polite">
        {value}
      </Text>
      <PressScale scaleTo={0.88} role="button" aria-label={t('More')} disabled={value >= max} onPress={() => step(1)} style={[styles.stepBtn, value >= max && styles.stepOff]}>
        <Text style={styles.stepSign}>+</Text>
      </PressScale>
    </View>
  );
}

function Chip({ label, icon, on, onPress }) {
  return (
    <PressScale scaleTo={0.94} role="radio" aria-checked={on} onPress={() => (tap(), onPress())} style={[styles.chip, on && styles.chipOn]}>
      {icon ? <Icon name={icon} size={16} color={on ? colors.gold : colors.ink} /> : null}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </PressScale>
  );
}

export default function Group() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const groupPicks = useChatStore((s) => s.groupPicks);
  const [people, setPeople] = useState(4);
  const [veg, setVeg] = useState(2);
  const [kind, setKind] = useState('friends');
  const [budget, setBudget] = useState(500);
  const [cuisine, setCuisine] = useState(null);
  const [busy, setBusy] = useState(false);
  const bandHeight = 190 + insets.top;
  const nonveg = people - veg;

  function changePeople(n) {
    setPeople(n);
    setVeg((v) => Math.min(v, n));
  }

  async function find() {
    setBusy(true);
    try {
      await groupPicks({ people, veg, kind, budgetPerHead: budget, cuisine });
      router.push('/results');
    } catch (err) {
      notify(t("Couldn't find places"), errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.sm }]}>
            <IconButton name="back" label={t('Back')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <Text style={styles.title} role="heading">
              {t('Order for a Group')}
            </Text>
          </View>
          <Text style={styles.sub}>{t("Tell me who's eating. I'll find places that work for everyone.")}</Text>
        </MaroonBand>

        <Animated.View entering={riseUp(0, 150)} style={[styles.card, { marginTop: bandHeight - 48 }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("How many are eating?")}</Text>
              <Text style={type.small}>{t('Including you')}</Text>
            </View>
            <Stepper value={people} min={2} max={30} onChange={changePeople} label={t('People')} />
          </View>
          <View style={[styles.row, styles.rowLine]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t('How many are veg?')}</Text>
              <Text style={type.small}>{nonveg ? t('{n} non-veg', { n: nonveg }) : t('Everyone is veg')}</Text>
            </View>
            <Stepper value={veg} min={0} max={people} onChange={setVeg} label={t('Veg')} />
          </View>
          {/* One dot per person: green veg, brown non-veg. */}
          <View style={styles.dots} aria-hidden>
            {Array.from({ length: Math.min(people, 30) }, (_, i) => (
              <View key={i} style={[styles.dot, { borderColor: i < veg ? colors.vegMark : colors.nonvegMark }]}>
                <View style={[styles.dotIn, { backgroundColor: i < veg ? colors.vegMark : colors.nonvegMark }]} />
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={rise(0, 250)}>
          <Text style={[type.head, styles.section]}>{t('What kind of group?')}</Text>
          <View style={styles.chips} role="radiogroup">
            {KINDS.map((k) => (
              <Chip key={k.id} label={t(k.label)} icon={k.icon} on={kind === k.id} onPress={() => setKind(k.id)} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={rise(1, 250)}>
          <Text style={[type.head, styles.section]}>{t('Budget per person')}</Text>
          <View style={styles.chips} role="radiogroup">
            {BUDGETS.map((b) => (
              <Chip key={b} label={b === 1200 ? '₹1,200+' : `₹${b}`} on={budget === b} onPress={() => setBudget(b)} />
            ))}
            <Chip label={t('Any budget')} on={budget === null} onPress={() => setBudget(null)} />
          </View>
        </Animated.View>

        <Animated.View entering={rise(2, 250)}>
          <Text style={[type.head, styles.section]}>{t('Any cuisine in mind?')}</Text>
          <View style={styles.chips} role="radiogroup">
            <Chip label={t('Anything')} on={cuisine === null} onPress={() => setCuisine(null)} />
            {CUISINES.map((c) => (
              <Chip key={c} label={t(c)} on={cuisine === c} onPress={() => setCuisine(c)} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={rise(3, 250)} style={styles.summary}>
          <Icon name="people" size={22} color={colors.goldText} />
          <Text style={styles.summaryText}>
            {[
              t('{n} people', { n: people }),
              veg === people ? t('all veg') : veg ? t('{veg} veg, {nonveg} non-veg', { veg, nonveg }) : t('non-veg'),
              budget ? t('about ₹{n} in all', { n: (budget * people).toLocaleString('en-IN') }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Animated.View>
        {veg > 0 && nonveg > 0 ? <Text style={styles.mixNote}>{t('Mixed group: I’ll pick places with good veg and non-veg choices.')}</Text> : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={t('Find places for us')} loading={busy} icon={<Icon name="search" size={18} color="#FFFFFF" />} onPress={find} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.base },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.cream },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted, marginHorizontal: space.lg, marginTop: space.md },
  card: { marginHorizontal: space.base, padding: space.base, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow.lifted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.hair, marginTop: space.sm, paddingTop: space.md },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.35 },
  stepSign: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 28, color: colors.red },
  stepValue: { minWidth: 36, textAlign: 'center', fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  dot: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 8, height: 8, borderRadius: 4 },
  section: { marginHorizontal: space.lg, marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginHorizontal: space.base, marginTop: space.sm },
  chip: { minHeight: 42, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.gold },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.base, marginTop: space.lg, padding: space.base, borderRadius: radius.card, backgroundColor: colors.goldSoft },
  summaryText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  mixNote: { ...type.small, marginHorizontal: space.lg, marginTop: space.sm },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.base, paddingTop: space.md, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.hair },
});
