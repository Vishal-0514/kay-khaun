import { useEffect, useMemo, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { PressScale, appear, leave, rise, smoothLayout } from '../components/Motion';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Path, Circle, Rect } from 'react-native-svg';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { useCookStore } from '../store/useCookStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { pickKitchenPhoto } from '../lib/photo';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { colors, fonts, radius, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// "What's in your kitchen?" — snap the fridge (Claude spots the ingredients) or
// type them, then see what you can cook. Design: V5Fridge.
function Jaali() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="kjaali" width="36" height="36" patternUnits="userSpaceOnUse">
          <Path d="M18 3C25 11 25 11 33 18C25 25 25 25 18 33C11 25 11 25 3 18C11 11 11 11 18 3Z" fill="none" stroke={colors.gold} strokeWidth="1" />
          <Circle cx="18" cy="18" r="2.2" fill={colors.gold} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#kjaali)" opacity={0.08} />
    </Svg>
  );
}

// Gold line sweeping over the photo while Claude reads it.
function ScanLine() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t]);
  const animated = useAnimatedStyle(() => ({ top: `${4 + t.value * 92}%` }));
  return <Animated.View pointerEvents="none" style={[styles.scanLine, animated]} />;
}

function Chip({ item, onRemove, onConfirm }) {
  const unsure = item.sure === false;
  return (
    <Animated.View entering={rise(0)} exiting={leave} layout={smoothLayout} style={[styles.chip, unsure && styles.chipUnsure]}>
      <Pressable role={unsure ? "button" : undefined} onPress={unsure ? onConfirm : undefined} disabled={!unsure} aria-label={unsure ? t('Confirm {name}', { name: t(item.label) }) : undefined} hitSlop={4}>
        <Text style={styles.chipText}>
          {t(item.label)}
          {unsure ? '?' : ''}
        </Text>
      </Pressable>
      <Pressable role="button" aria-label={t('Remove {name}', { name: t(item.label) })} onPress={onRemove} hitSlop={6} style={styles.chipX}>
        <Icon name="close" size={12} color={colors.muted} strokeWidth={2.4} />
      </Pressable>
    </Animated.View>
  );
}

export default function Kitchen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams();
  const fromChat = from === 'chat';
  const aiOff = useAuthStore((s) => s.user?.aiConsent === false);
  const { catalogue, scanAvailable, kitchen, loadCatalogue, add, remove, confirm, scan, findRecipes, confirmedNames } = useCookStore();
  const sendChat = useChatStore((s) => s.send);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState(null);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    loadCatalogue().catch(() => {});
  }, [loadCatalogue]);

  const haveIds = new Set(kitchen.map((k) => k.id));
  const unsureCount = kitchen.filter((k) => k.sure === false).length;
  const readyCount = kitchen.length - unsureCount;

  // While typing: matching names. Otherwise: common things not yet added.
  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    const pool = catalogue.filter((c) => !haveIds.has(c.id));
    if (!q) return pool.filter((c) => c.common).slice(0, 12);
    return pool.filter((c) => c.label.toLowerCase().includes(q) || c.aliases.some((a) => a.startsWith(q))).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, catalogue, kitchen]);

  function addTyped() {
    // "eggs, onion, bread" adds three.
    text
      .split(/,|\band\b|\baur\b|\n/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(add);
    setText('');
  }

  async function takePhoto(source) {
    if (!scanAvailable) {
      notify(t('Photo scan is off'), aiOff ? t('Photo scan uses AI, which is off. Turn on "Use AI" in Profile, or type what you have below.') : t("Fridge scanning switches on once the AI key is added to the server. For now, type what you have below."));
      return;
    }
    setScanNote(null);
    let shot;
    try {
      shot = await pickKitchenPhoto(source);
    } catch (err) {
      notify(err.code === 'PERMISSION' ? t('Allow access') : t("Couldn't open the camera"), err.code === 'PERMISSION' ? `${err.message} Turn it on in your phone settings, or type what you have.` : err.message);
      return;
    }
    if (!shot) return;
    setPhoto(shot.uri);
    setScanning(true);
    try {
      const data = await scan(shot);
      setScanNote(data.items.length ? null : data.message);
    } catch (err) {
      setScanNote(errorMessage(err));
    } finally {
      setScanning(false);
    }
  }

  async function showRecipes() {
    if (text.trim()) addTyped();
    const names = useCookStore.getState().confirmedNames();
    if (!names.length) return;
    setFinding(true);
    try {
      if (fromChat) {
        // Keep the conversation going: Chatora answers with recipes in the chat.
        const data = await sendChat(`I have ${names.join(', ')}`);
        router.replace(data.recipes?.length ? '/recipes' : '/chat');
      } else {
        await findRecipes();
        router.push('/recipes');
      }
    } catch (err) {
      notify(t("Couldn't find recipes"), errorMessage(err));
    } finally {
      setFinding(false);
    }
  }

  const title = scanning ? t('Looking at your photo…') : kitchen.length ? t(kitchen.length === 1 ? 'You have {n} thing' : 'You have {n} things', { n: kitchen.length }) : t("What's in your kitchen?");
  const subtitle = unsureCount
    ? t(unsureCount > 1 ? "Tap the ones with “?” to confirm them, or remove anything that's wrong." : "Tap the one with “?” to confirm it, or remove it if it's wrong.")
    : kitchen.length
      ? t('Add anything else you have. Salt, oil and spices are already counted.')
      : t('Add a few things you have. Salt, oil and spices are already counted.');

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Camera area */}
        <View style={[styles.camera, { paddingTop: insets.top + space.base }]}>
          <Jaali />
          <View style={styles.header}>
            <IconButton name="close" label={t("Close")} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <Text style={styles.headerTitle}>{t("Your kitchen")}</Text>
            <View style={{ width: 44 }} />
          </View>

          <Animated.View entering={appear(0, 150)} style={styles.frame}>
            {photo ? (
              <>
                <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" aria-label={t("Your kitchen photo")} />
                {scanning ? <ScanLine /> : null}
                {scanning ? (
                  <View style={styles.scanOverlay}>
                    <ActivityIndicator color={colors.gold} size="large" />
                    <Text style={styles.scanText}>{t("Spotting ingredients…")}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.framePrompt}>
                <View style={styles.frameIcon}>
                  <Icon name="camera" size={28} color={colors.gold} />
                </View>
                <Text style={styles.frameTitle}>{scanAvailable ? t('Snap your fridge or shelf') : t('Type what you have')}</Text>
                <Text style={styles.frameText}>
                  {scanAvailable ? t('Chatora will spot the ingredients for you.') : aiOff ? t('Photo scan uses AI. Turn it on in Profile → Use AI.') : t('Photo scan switches on once the AI is connected.')}
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={[styles.shutterRow, !scanAvailable && { opacity: 0.45 }]}>
            <PressScale scaleTo={0.88} role="button" aria-label={t("Choose a photo")} onPress={() => takePhoto('library')} disabled={scanning} style={styles.gallery}>
              <Icon name="image" size={22} color="#FFFFFF" />
            </PressScale>
            <PressScale scaleTo={0.88} role="button" aria-label={t("Take a photo")} onPress={() => takePhoto('camera')} disabled={scanning} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </PressScale>
            <View style={{ width: 48 }} />
          </View>
        </View>

        {/* Ingredient sheet */}
        <Animated.View entering={rise(0, 250)} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Text style={type.title} role="heading">
            {title}
          </Text>
          <Text style={[type.small, { marginTop: space.xs }]}>{subtitle}</Text>
          {scanNote ? <Text style={styles.scanNote}>{scanNote}</Text> : null}

          {kitchen.length ? (
            <View style={styles.chips}>
              {kitchen.map((k) => (
                <Chip key={k.id} item={k} onRemove={() => remove(k.id)} onConfirm={() => confirm(k.id)} />
              ))}
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("Add an ingredient (e.g. aloo, eggs)")}
              placeholderTextColor="#B3A196"
              style={styles.input}
              aria-label={t("Add an ingredient")}
              returnKeyType="done"
              onSubmitEditing={addTyped}
              maxLength={80}
            />
            <Pressable role="button" aria-label={t("Add")} onPress={addTyped} disabled={!text.trim()} style={[styles.addBtn, !text.trim() && { opacity: 0.4 }]}>
              <Icon name="plus" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {suggestions.length ? (
            <>
              <Text style={[type.label, { marginTop: space.lg }]}>{text.trim() ? t('Did you mean') : t('Quick add')}</Text>
              <View style={styles.chips}>
                {suggestions.map((c, i) => (
                  <Animated.View key={c.id} entering={rise(i, 50)} exiting={leave} layout={smoothLayout}>
                  <PressScale
                    scaleTo={0.9}
                    role="button"
                    onPress={() => {
                      add(c.label);
                      setText('');
                    }}
                    style={styles.suggest}
                  >
                    <Icon name="plus" size={14} color={colors.ink} />
                    <Text style={styles.suggestText}>{t(c.label)}</Text>
                  </PressScale>
                  </Animated.View>
                ))}
              </View>
            </>
          ) : null}

          <Button
            title={readyCount ? t('Show recipes') : t('Add something to start')}
            icon={readyCount ? <Icon name="arrow" size={18} color="#FFFFFF" /> : null}
            onPress={showRecipes}
            loading={finding}
            disabled={!readyCount && !text.trim()}
            style={{ marginTop: space.xl }}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A0B08' },
  camera: { backgroundColor: '#1A0B08', paddingBottom: space.xl + 28, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: '#FFFFFF' },
  frame: { marginHorizontal: space.xl, marginTop: space.lg, height: 240, borderRadius: radius.cardLg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(232,169,58,0.7)', overflow: 'hidden', backgroundColor: '#2A1A15' },
  framePrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, gap: space.sm },
  frameIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(232,169,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  frameTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.cream, textAlign: 'center' },
  frameText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted, textAlign: 'center' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, zIndex: 2 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,11,8,0.6)', alignItems: 'center', justifyContent: 'center', gap: space.md },
  scanText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cream },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48, marginTop: space.lg },
  gallery: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.red },
  sheet: { flexGrow: 1, marginTop: -28, backgroundColor: colors.canvas, borderTopLeftRadius: radius.cardLg, borderTopRightRadius: radius.cardLg, padding: space.lg },
  scanNote: { marginTop: space.md, padding: space.md, borderRadius: 14, backgroundColor: colors.goldSoft, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.goldText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  chip: { height: 36, paddingLeft: 14, paddingRight: 6, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, flexDirection: 'row', alignItems: 'center', gap: 2 },
  chipUnsure: { backgroundColor: colors.goldSoft, borderStyle: 'dashed', borderColor: colors.gold },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  chipX: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg, height: 52, borderRadius: radius.button, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, paddingLeft: space.base, paddingRight: 4 },
  input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  suggest: { height: 36, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C9B48F', flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
