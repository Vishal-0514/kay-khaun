import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import Icon, { DietMark } from '../components/Icon';
import { api, errorMessage } from '../lib/api';
import { signOut } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const DIETS = [
  { id: 'veg', label: 'Veg' },
  { id: 'nonveg', label: 'Non-veg' },
  { id: 'egg', label: 'Egg only' },
];
const SPICE = ['Mild', 'Light', 'Medium', 'Hot', 'Extra hot'];
const HEAT = ['#F2C14E', '#EDA03A', '#E2762E', '#D4442A', colors.red];
const CUISINES = [
  { name: 'North Indian', tint: '#FCEBD0', ink: '#86560F' },
  { name: 'Biryani', tint: '#FDE8D6', ink: '#9A3F12' },
  { name: 'Street food', tint: '#FDE3E1', ink: colors.maroon },
  { name: 'Chinese', tint: '#FBE4EC', ink: '#8E2049' },
  { name: 'South Indian', tint: '#E3F2E7', ink: '#1E6B3A' },
  { name: 'Healthy', tint: '#E3F2E7', ink: '#1E6B3A' },
  { name: 'Desserts', tint: '#FBE4EC', ink: '#8E2049' },
];
const BUDGETS = [
  { id: 'low', label: 'Under ₹300' },
  { id: 'mid', label: '₹300–500' },
  { id: 'high', label: '₹500+' },
];
const AVOID = ['Mushroom', 'Karela', 'Baingan', 'Seafood', 'Onion & garlic'];

const toggle = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export default function Taste() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bandHeight = useBandHeight(208);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const p = user?.preferences ?? {};

  const [name, setName] = useState(user?.name ?? '');
  const [diet, setDiet] = useState(p.diet ?? 'nonveg');
  const [spice, setSpice] = useState(p.spice ?? 3);
  const [cuisines, setCuisines] = useState(p.cuisines?.length ? p.cuisines : ['North Indian', 'Biryani', 'Street food']);
  const [budget, setBudget] = useState(p.budget ?? 'mid');
  const [avoid, setAvoid] = useState(p.avoid ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch('/profile', {
        name: name.trim(),
        preferences: { diet, spice, cuisines, budget, avoid },
        onboarded: true,
      });
      setUser(data.user);
      router.replace('/home');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <BandHeader
        height={bandHeight}
        title="What do you like to eat?"
        subtitle="The more I know, the fewer questions I'll ask."
        onBack={user?.onboarded ? undefined : () => signOut().then(() => router.replace('/welcome'))}
      />
      <ScrollView contentContainerStyle={{ paddingTop: bandHeight - 32, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.section} nativeID="name-label">What should I call you?</Text>
          <TextInput
            aria-labelledby="name-label"
            aria-label="Your name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor="#B3A196"
            autoComplete="given-name"
            textContentType="givenName"
            maxLength={60}
          />

          <Text style={[styles.section, styles.gap]}>Diet</Text>
          <View style={styles.row}>
            {DIETS.map((d) => {
              const on = diet === d.id;
              return (
                <Pressable key={d.id} role="radio" aria-checked={on} onPress={() => setDiet(d.id)} style={[styles.pill, on && styles.pillOn]}>
                  {d.id !== 'egg' && <DietMark type={d.id} />}
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.spaceBetween, styles.gap]}>
            <Text style={styles.section}>Spice level</Text>
            <Text style={styles.spiceLabel}>{SPICE[spice - 1]}</Text>
          </View>
          <View style={styles.spiceRow}>
            {SPICE.map((label, i) => {
              const n = i + 1;
              return (
                <Pressable key={label} role="radio" aria-label={`Spice: ${label}`} aria-checked={n === spice} onPress={() => setSpice(n)} style={styles.spiceHit}>
                  <View style={[styles.spiceBar, { height: 12 + n * 6, backgroundColor: n <= spice ? HEAT[i] : colors.hair }]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.spaceBetween}>
            <Text style={styles.scaleText}>Mild</Text>
            <Text style={styles.scaleText}>Extra hot</Text>
          </View>

          <Text style={[styles.section, styles.gap]}>Favourite cuisines</Text>
          <View style={styles.wrap}>
            {CUISINES.map((c) => {
              const on = cuisines.includes(c.name);
              return (
                <Pressable
                  key={c.name}
                  role="checkbox"
                  aria-checked={on}
                  onPress={() => setCuisines(toggle(cuisines, c.name))}
                  style={[styles.chip, on && { backgroundColor: c.tint, borderColor: c.ink, borderWidth: 1.5 }]}
                >
                  <Text style={[styles.chipText, on && { color: c.ink, fontFamily: fonts.bold }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.section, styles.gap]}>Budget per meal</Text>
          <View style={styles.row}>
            {BUDGETS.map((b) => {
              const on = budget === b.id;
              return (
                <Pressable key={b.id} role="radio" aria-checked={on} onPress={() => setBudget(b.id)} style={[styles.budget, on && styles.budgetOn]}>
                  <Text style={[styles.budgetText, on && { color: colors.goldText }]}>{b.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.section, styles.gap]}>Foods you avoid</Text>
          <View style={styles.wrap}>
            {AVOID.map((item) => {
              const on = avoid.includes(item);
              return (
                <Pressable key={item} role="checkbox" aria-checked={on} onPress={() => setAvoid(toggle(avoid, item))} style={[styles.chip, on && styles.avoidOn]}>
                  {on && <Icon name="close" size={14} color={colors.cream} strokeWidth={2.4} />}
                  <Text style={[styles.chipText, on && { color: colors.cream }]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.base }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Continue" icon={null} onPress={save} loading={busy} disabled={!name.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, ...shadow.lifted },
  section: { ...type.head, color: colors.ink },
  gap: { marginTop: 20 },
  input: { marginTop: space.md, height: 52, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, paddingHorizontal: space.base, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pill: { height: 44, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  pillTextOn: { color: '#FFFFFF' },
  spiceLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.red },
  spiceRow: { flexDirection: 'row', gap: 6, marginTop: space.md, alignItems: 'flex-end' },
  spiceHit: { flex: 1, height: 44, justifyContent: 'flex-end' },
  spiceBar: { borderRadius: 8 },
  scaleText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  chip: { height: 40, paddingHorizontal: space.base, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  avoidOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  budget: { flex: 1, height: 48, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  budgetOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1.5 },
  budgetText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.hair },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.red, marginBottom: space.sm, textAlign: 'center' },
});
