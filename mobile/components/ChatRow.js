import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from './Icon';
import { PressScale } from './Motion';
import { useChatStore } from '../store/useChatStore';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { dayLabel, timeOf } from '../lib/dates';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// One past chat with Chatora: Recent chats, and the chat screen's empty state.

// What the chat ended with, in a few words.
function summary(c) {
  const last = c.last;
  if (!last) return '';
  if (last.kind === 'picks' && last.count) return t(last.count === 1 ? '1 pick to order' : '{n} picks to order', { n: last.count });
  if (last.kind === 'recipes' && last.count) return t(last.count === 1 ? '1 recipe to cook' : '{n} recipes to cook', { n: last.count });
  return last.role === 'user' ? t('You: {text}', { text: last.text }) : last.text;
}

export default function ChatRow({ chat, onOpen, onRemove, showDay = false }) {
  const cook = chat.branch === 'cook';
  return (
    <View style={styles.card}>
      <PressScale scaleTo={0.98} role="button" aria-label={t('Open chat: {title}', { title: t(chat.title) })} onPress={onOpen} style={styles.cardMain}>
        <View style={[styles.tile, { backgroundColor: cook ? colors.goldSoft : colors.redSoft }]}>
          <Icon name={cook ? 'pot' : chat.branch === 'order' ? 'bag' : 'chat'} size={18} color={cook ? colors.goldText : colors.red} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {t(chat.title)}
            </Text>
            <Text style={styles.time}>{showDay ? dayLabel(chat.updatedAt) : timeOf(chat.updatedAt)}</Text>
          </View>
          <Text style={type.small} numberOfLines={2}>
            {summary(chat)}
          </Text>
        </View>
      </PressScale>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10} aria-label={t('Delete chat: {title}', { title: t(chat.title) })} role="button" style={styles.remove}>
          <Icon name="trash" size={16} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Open a past chat where it left off.
export function useOpenChat() {
  const router = useRouter();
  const open = useChatStore((s) => s.open);
  return async (id) => {
    try {
      await open(id);
      router.navigate('/chat');
    } catch (err) {
      notify(t("Couldn't open that chat"), errorMessage(err));
    }
  };
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: space.md, paddingLeft: space.md, paddingRight: space.sm, ...shadow.card },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  time: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  remove: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
