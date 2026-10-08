import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon, { DietMark } from '../../components/Icon';
import PlateRing from '../../components/PlateRing';
import Button from '../../components/Button';
import Animated from 'react-native-reanimated';
import { appear, rise, riseUp, sheetUp } from '../../components/Motion';
import { useCookStore } from '../../store/useCookStore';
import { useMeStore } from '../../store/useMeStore';
import { errorMessage } from '../../lib/api';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';

const fmtTimer = (s) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} sec`);

function Fact({ icon, value }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={16} color={colors.gold} />
      <Text style={styles.factText}>{value}</Text>
    </View>
  );
}

// One ingredient line: have it (green tick), missing (gold), optional, or pantry basic.
function Ingredient({ item, n }) {
  const mark = {
    have: { bg: colors.green, icon: 'check', color: '#FFFFFF' },
    missing: { bg: colors.goldSoft, icon: 'plus', color: colors.goldText },
    optional: { bg: colors.soft, icon: null },
    basic: { bg: colors.soft, icon: null },
  }[item.status];
  const note = { missing: 'You need this', optional: 'Optional', basic: 'Pantry' }[item.status];
  return (
    <Animated.View entering={rise(n, 350)} style={styles.ing}>
      <View style={[styles.ingMark, { backgroundColor: mark.bg }]}>{mark.icon ? <Icon name={mark.icon} size={12} color={mark.color} strokeWidth={3} /> : <View style={styles.ingDot} />}</View>
      <View style={{ flex: 1 }}>
        <View style={styles.ingTop}>
          <Text style={[styles.ingName, item.status === 'basic' && { color: colors.body, fontFamily: fonts.regular }]}>{item.label}</Text>
          <Text style={styles.ingQty}>{item.qty}</Text>
        </View>
        {note ? <Text style={[styles.ingNote, item.status === 'missing' && { color: colors.goldText, fontFamily: fonts.bold }]}>{note}</Text> : null}
        {item.sub ? <Text style={styles.sub}>{item.sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

export default function Recipe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const openRecipe = useCookStore((s) => s.openRecipe);
  const track = useMeStore((s) => s.track);
  const current = useCookStore((s) => s.current);
  const recipe = current?.id === id ? current : null;
  const [error, setError] = useState(null);
  const bandHeight = 360 + insets.top;

  useEffect(() => {
    setError(null);
    openRecipe(id).catch((err) => setError(errorMessage(err)));
  }, [id, openRecipe]);

  // Looking at a recipe hints at the cuisines they like (taste learning).
  useEffect(() => {
    if (recipe) track('opened', { id: `recipe-${recipe.id}`, source: 'recipe', name: recipe.name, cuisine: recipe.cuisine, diet: recipe.diet });
  }, [recipe?.id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (!recipe) {
    return (
      <View style={[styles.root, styles.center, { padding: space.lg }]}>
        {error ? (
          <>
            <Text style={[type.head, { textAlign: 'center' }]}>{error}</Text>
            <Button title="Try again" onPress={() => openRecipe(id).catch((err) => setError(errorMessage(err)))} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
            <Button title="Go back" variant="link" onPress={back} />
          </>
        ) : (
          <ActivityIndicator color={colors.red} size="large" />
        )}
      </View>
    );
  }

  const shown = [...recipe.ingredients.filter((i) => i.status !== 'basic'), ...recipe.ingredients.filter((i) => i.status === 'basic')];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.base }]}>
            <IconButton name="back" label="Back" onDark onPress={back} />
          </View>
          <Animated.View entering={appear(0, 100)} style={styles.hero}>
            <PlateRing size={150} value={recipe.have / recipe.total} dark ticks>
              <Text style={styles.ringValue}>
                {recipe.have}
                <Text style={styles.ringTotal}>/{recipe.total}</Text>
              </Text>
              <Text style={styles.ringLabel}>you have</Text>
            </PlateRing>
            <View style={styles.nameRow}>
              <DietMark type={recipe.diet === 'veg' ? 'veg' : 'nonveg'} size={16} />
              <Text style={styles.name} role="heading">
                {recipe.name}
              </Text>
            </View>
            <View style={styles.facts}>
              <Fact icon="clock" value={`${recipe.time} min`} />
              <Fact icon="flame" value={recipe.level} />
              <Fact icon="people" value={`Serves ${recipe.serves}`} />
            </View>
          </Animated.View>
        </MaroonBand>

        <Animated.View entering={riseUp(0, 280)} style={[styles.card, { marginTop: bandHeight - 36 }]}>
          <Icon name="spark" size={18} color={colors.goldText} />
          <Text style={styles.cardText}>{recipe.missing.length ? `You'll need ${recipe.missing.map((m) => m.label.toLowerCase()).join(' and ')}. ${recipe.reason}.` : `${recipe.reason}.`}</Text>
        </Animated.View>

        <View style={styles.section}>
          <Text style={type.head}>Ingredients</Text>
          {shown.map((i, n) => (
            <Ingredient key={i.id} item={i} n={Math.min(n, 10)} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={type.head}>
            {recipe.steps.length} steps · about {recipe.time} min
          </Text>
          {recipe.steps.map((s) => (
            <View key={s.n} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.stepText}>{s.text}</Text>
                {s.timer ? (
                  <View style={styles.stepTimer}>
                    <Icon name="clock" size={13} color={colors.goldText} />
                    <Text style={styles.stepTimerText}>{fmtTimer(s.timer)} timer</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Animated.View entering={sheetUp(300)} style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Button title="Start cooking" icon={<Icon name="play" size={16} color="#FFFFFF" />} onPress={() => router.push(`/cook/${recipe.id}`)} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', paddingHorizontal: space.lg },
  hero: { alignItems: 'center', marginTop: space.xs },
  ringValue: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, color: colors.cream },
  ringTotal: { fontSize: 22, color: colors.gold },
  ringLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.creamMuted },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, paddingHorizontal: space.lg },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.cream, textAlign: 'center', flexShrink: 1 },
  facts: { flexDirection: 'row', gap: space.base, marginTop: space.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  card: { marginHorizontal: space.base, flexDirection: 'row', gap: space.md, padding: space.base, backgroundColor: colors.surface, borderRadius: radius.card, ...shadow.lifted },
  cardText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.ink },
  section: { marginHorizontal: space.lg, marginTop: space.lg, gap: space.xs },
  ing: { flexDirection: 'row', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.hair },
  ingMark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9B48F' },
  ingTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  ingName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, flexShrink: 1 },
  ingQty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'right', flexShrink: 1 },
  ingNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  sub: { marginTop: space.xs, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.body, backgroundColor: colors.goldSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  step: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.bold, fontSize: 13, color: colors.gold },
  stepText: { ...type.body, color: colors.ink },
  stepTimer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepTimerText: { fontFamily: fonts.bold, fontSize: 12, color: colors.goldText },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hair },
});
