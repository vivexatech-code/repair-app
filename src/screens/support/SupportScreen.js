import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import {
  createSupportTicket,
  subscribeSupportTickets,
} from '../../services/supportService';
import { showAppToast } from '../../utils/appToast';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

function formatWhen(ts) {
  try {
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function SupportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, customer } = useAuth();
  const prefillBookingId = route?.params?.bookingId
    ? String(route.params.bookingId)
    : '';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(Boolean(prefillBookingId));
  const [subject, setSubject] = useState(
    prefillBookingId ? `Help with booking ${prefillBookingId.slice(0, 8)}` : '',
  );
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState(prefillBookingId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setTickets([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return subscribeSupportTickets(
      user.uid,
      (rows) => {
        setTickets(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user?.uid]);

  const emptyHint = useMemo(
    () => (creating ? null : 'No support tickets yet. Tap New ticket to contact us.'),
    [creating],
  );

  const onCreate = async () => {
    if (!user?.uid || saving) return;
    setSaving(true);
    try {
      const res = await createSupportTicket({
        customerId: user.uid,
        subject,
        message,
        bookingId: bookingId.trim() || undefined,
        customerName: customer?.name || user.displayName || '',
        customerEmail: customer?.email || user.email || '',
      });
      showAppToast('Ticket created');
      setCreating(false);
      setSubject('');
      setMessage('');
      setBookingId('');
      navigation.navigate('SupportTicket', { ticketId: res.id });
    } catch (e) {
      showAppToast(e?.message || 'Could not create ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header
        title="Support"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => setCreating((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={creating ? 'Show tickets' : 'New ticket'}
          >
            <Text style={styles.headerAction}>{creating ? 'List' : 'New'}</Text>
          </TouchableOpacity>
        }
      />

      {creating ? (
        <View style={styles.form}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="What do you need help with?"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Booking ID (optional)</Text>
          <TextInput
            style={styles.input}
            value={bookingId}
            onChangeText={setBookingId}
            placeholder="Paste booking id"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.message]}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the issue"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={() => void onCreate()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit ticket</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>{emptyHint}</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('SupportTicket', { ticketId: item.id })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.subject || 'Support ticket'}
                </Text>
                <Text style={styles.badge}>{String(item.status || 'open')}</Text>
              </View>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.bookingId ? `Booking ${String(item.bookingId).slice(0, 8)} · ` : ''}
                {formatWhen(item.createdAt) || 'Recent'}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.textMuted}
                style={styles.chevron}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerAction: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  list: { padding: spacing.md, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 20 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  cardMeta: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  chevron: { position: 'absolute', right: 10, top: 16 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { padding: spacing.md, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  message: { minHeight: 120 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
