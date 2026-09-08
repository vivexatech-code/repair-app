import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import {
  replyToSupportTicket,
  subscribeSupportTicket,
} from '../../services/supportService';
import { showAppToast } from '../../utils/appToast';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

function formatWhen(ts) {
  try {
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function SupportTicketScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const ticketId = route?.params?.ticketId ? String(route.params.ticketId) : '';

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      return undefined;
    }
    return subscribeSupportTicket(
      ticketId,
      (doc) => {
        setTicket(doc);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [ticketId]);

  const messages = useMemo(() => {
    const list = Array.isArray(ticket?.messages) ? [...ticket.messages] : [];
    list.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    return list;
  }, [ticket?.messages]);

  const onSend = async () => {
    if (!user?.uid || !ticketId || sending) return;
    setSending(true);
    try {
      await replyToSupportTicket({
        ticketId,
        customerId: user.uid,
        message: draft,
      });
      setDraft('');
    } catch (e) {
      showAppToast(e?.message || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header
        title={ticket?.subject ? String(ticket.subject).slice(0, 28) : 'Ticket'}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !ticket ? (
        <Text style={styles.empty}>Ticket not found.</Text>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          {ticket.bookingId ? (
            <Text style={styles.bookingHint}>
              Related booking: {String(ticket.bookingId)}
            </Text>
          ) : null}
          <FlatList
            data={messages}
            keyExtractor={(item, idx) => item.id || `msg_${idx}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const mine = String(item.sender || '') === 'customer';
              return (
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                    {item.body}
                  </Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {formatWhen(item.createdAt)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
          />
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a reply…"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendDisabled]}
              onPress={() => void onSend()}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bookingHint: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  list: { padding: spacing.md, paddingBottom: 20 },
  bubble: {
    maxWidth: '86%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { marginTop: 4, fontSize: 10, color: colors.textMuted },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.8)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
