import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import {
  markNotificationRead,
  normalizeNotificationPrefs,
  subscribeUserNotifications,
  updateNotificationPrefs,
} from '../../services/notificationInboxService';
import { subscribeCustomerProfile } from '../../services/customerService';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { showAppToast } from '../../utils/appToast';

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

export function NotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(normalizeNotificationPrefs());
  const [savingKey, setSavingKey] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }
    const unsubProfile = subscribeCustomerProfile(user.uid, (profile) => {
      setPrefs(normalizeNotificationPrefs(profile?.notificationPrefs));
    });
    const unsubInbox = subscribeUserNotifications(
      user.uid,
      (rows) => {
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => {
      unsubProfile?.();
      unsubInbox?.();
    };
  }, [user?.uid]);

  const onToggle = async (key, value) => {
    if (!user?.uid) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    try {
      await updateNotificationPrefs(user.uid, next);
    } catch {
      setPrefs(prefs);
      showAppToast('Could not save preference');
    } finally {
      setSavingKey('');
    }
  };

  const onOpenItem = async (item) => {
    if (!item?.read) {
      await markNotificationRead(user?.uid, item);
    }
    const bookingId = item?.data?.bookingId || item?.bookingId;
    if (bookingId) {
      navigation.navigate('BookingDetails', { bookingId: String(bookingId) });
    }
  };

  return (
    <View style={styles.root}>
      <Header title="Notifications" onBack={() => navigation.goBack()} />

      <View style={styles.prefsCard}>
        <Text style={styles.prefsTitle}>Preferences</Text>
        {[
          { key: 'bookingUpdates', label: 'Booking updates' },
          { key: 'offers', label: 'Offers & promos' },
          { key: 'marketing', label: 'Marketing' },
        ].map((row) => (
          <View key={row.key} style={styles.prefRow}>
            <Text style={styles.prefLabel}>{row.label}</Text>
            <Switch
              value={Boolean(prefs[row.key])}
              onValueChange={(v) => void onToggle(row.key, v)}
              disabled={savingKey === row.key}
              trackColor={{ false: colors.border, true: '#FDBA74' }}
              thumbColor={prefs[row.key] ? colors.primary : '#f4f3f4'}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Inbox</Text>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No notifications yet.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              activeOpacity={0.75}
              onPress={() => void onOpenItem(item)}
            >
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title || 'Notification'}
              </Text>
              <Text style={styles.cardBody} numberOfLines={3}>
                {item.body || ''}
              </Text>
              <Text style={styles.cardMeta}>{formatWhen(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  prefsCard: {
    margin: spacing.md,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  prefsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prefLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  sectionLabel: {
    marginHorizontal: spacing.md,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardUnread: {
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardBody: { marginTop: 4, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  cardMeta: { marginTop: 8, fontSize: 11, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
  centered: { paddingTop: 40, alignItems: 'center' },
});
