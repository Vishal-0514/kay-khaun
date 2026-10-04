import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BandHeader, { useBandHeight } from '../components/BandHeader';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import PlateRing from '../components/PlateRing';
import { signOut } from '../lib/session';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const SPICE = ['Mild', 'Light', 'Medium', 'Hot', 'Extra hot'];
const BUDGET = { low: 'Under ₹300', mid: '₹300–500', high: '₹500+' };
const DIET = { veg: 'Veg', nonveg: 'Non-veg', egg: 'Egg only' };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Phase 1 home: confirms sign-in and the saved taste profile.
// The craving box, moods and Chatora's picks arrive in Phase 2.
export default function Home() {
  const router = useRouter();
  const bandHeight = useBandHeight(220);
  const user = useAuthStore((s) => s.user);
  const p = user?.preferences ?? {};

  return (
    <View style={styles.root}>
      <BandHeader
        height={bandHeight}
        onBack={false}
        title={`${greeting()}, ${user?.name || 'there'}`}
        subtitle="Your taste profile is saved."
        right={<IconButton name="user" label="Edit your taste" onDark onPress={() => router.push('/taste')} />}
      />
      <View style={[styles.card, { marginTop: bandHeight - 32 }]}>
        <View style={styles.cardTop}>
          <PlateRing size={72} value={(p.spice ?? 3) / 5}>
            <Text style={styles.ringValue}>{p.spice ?? 3}/5</Text>
          </PlateRing>
          <View style={{ flex: 1 }}>
            <Text style={type.label}>Your taste</Text>
            <Text style={styles.summary}>
              {DIET[p.diet] ?? '—'} · {SPICE[(p.spice ?? 3) - 1]} spice · {BUDGET[p.budget] ?? '—'}
            </Text>
          </View>
        </View>
        {p.cuisines?.length ? <Text style={styles.line}>Loves: {p.cuisines.join(', ')}</Text> : null}
        {p.avoid?.length ? <Text style={styles.line}>Avoids: {p.avoid.join(', ')}</Text> : null}
        <Button variant="outline" title="Edit my taste" onPress={() => router.push('/taste')} style={{ marginTop: space.lg }} />
      </View>
      <View style={styles.bottom}>
        <Button variant="link" title="Sign out" onPress={() => signOut().then(() => router.replace('/welcome'))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, ...shadow.lifted },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  ringValue: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  summary: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, marginTop: 2 },
  line: { ...type.small, marginTop: space.md },
  bottom: { marginTop: 'auto', paddingBottom: space.xl },
});
