import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { create } from 'zustand';
import Button from './Button';
import Icon from './Icon';
import { PressScale, sheetUp } from './Motion';
import { toast } from './Toast';
import { api, errorMessage } from '../lib/api';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// "Report this reply": anyone can flag something Chatora (the AI) wrote.
// Call reportReply({ kind: 'chat', conversationId, messageId }) or
// reportReply({ kind: 'plan', text }); <ReportHost /> in the root layout shows the sheet.

const REASONS = [
  { id: 'wrong', label: "It's wrong or misleading" },
  { id: 'unsafe', label: 'Unsafe food or allergy advice' },
  { id: 'offensive', label: 'Offensive or inappropriate' },
  { id: 'other', label: 'Something else' },
];

const useReport = create((set) => ({ target: null, open: (target) => set({ target }), close: () => set({ target: null }) }));

export const reportReply = (target) => useReport.getState().open(target);

// The small "Report" link shown under AI replies.
export function ReportLink({ target, style }) {
  return (
    <Pressable onPress={() => reportReply(target)} hitSlop={10} role="button" aria-label={t('Report this reply')} style={[styles.link, style]}>
      <Icon name="flag" size={12} color={colors.muted} />
      <Text style={styles.linkText}>{t('Report')}</Text>
    </Pressable>
  );
}

export function ReportHost() {
  const target = useReport((s) => s.target);
  const close = useReport((s) => s.close);
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  function dismiss() {
    close();
    setReason(null);
    setNote('');
  }

  async function send() {
    setSending(true);
    try {
      await api.post('/reports', { ...target, reason, ...(note.trim() ? { note: note.trim() } : {}) });
      dismiss();
      toast(t('Thanks. We’ll look into it.'), 'check');
    } catch (err) {
      toast(errorMessage(err), 'close');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={Boolean(target)} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={dismiss} aria-label={t('Close')} />
      {target ? (
        <Animated.View entering={sheetUp(0)} style={[styles.sheet, { paddingBottom: insets.bottom + space.base }]} role="dialog" aria-label={t('Report this reply')}>
          <View style={styles.grip} />
          <Text style={type.title} role="heading">
            {t('Report this reply')}
          </Text>
          <Text style={type.small}>{t('What’s wrong with what Chatora said? Reports help us keep it safe and useful.')}</Text>
          <View style={styles.reasons} role="radiogroup">
            {REASONS.map((r) => {
              const on = reason === r.id;
              return (
                <PressScale
                  key={r.id}
                  role="radio"
                  aria-checked={on}
                  onPress={() => {
                    tap();
                    setReason(r.id);
                  }}
                  style={[styles.reason, on && styles.reasonOn]}
                >
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
                  <Text style={styles.reasonText}>{t(r.label)}</Text>
                </PressScale>
              );
            })}
          </View>
          {reason ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('Tell us more (optional)')}
                placeholderTextColor="#B3A196"
                aria-label={t('Tell us more (optional)')}
                style={styles.note}
                maxLength={500}
                multiline
              />
            </Animated.View>
          ) : null}
          <Button title={t('Send report')} disabled={!reason} loading={sending} onPress={send} />
          <Button variant="link" title={t('Cancel')} onPress={dismiss} />
        </Animated.View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 24 },
  linkText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43,15,11,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md, backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hair, marginBottom: space.sm },
  reasons: { gap: space.sm },
  reason: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.base, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair },
  reasonOn: { borderColor: colors.red, backgroundColor: colors.redSoft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.red },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  reasonText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  note: { minHeight: 72, padding: space.md, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
});
