import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { BookingCard } from '../../components/BookingCard';
import { BookingCardSkeleton } from '../../components/SkeletonLoader';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { BOOKING_STATUS } from '../../constants';
import { useBookings } from '../../context/BookingsContext';

const TABS = [
  { id: 'upcoming', label: 'Upcoming', statuses: [BOOKING_STATUS.NEW, BOOKING_STATUS.ASSIGNED] },
  { id: 'completed', label: 'Completed', statuses: [BOOKING_STATUS.COMPLETED] },
  { id: 'cancelled', label: 'Cancelled', statuses: [BOOKING_STATUS.CANCELLED] },
];

export function BookingsScreen() {
  const navigation = useNavigation();
  const { bookings, loading, error } = useBookings();
  const [tab, setTab] = useState('upcoming');

  const rows = useMemo(() => {
    const cfg = TABS.find((t) => t.id === tab);
    if (!cfg) return bookings;
    return bookings.filter((b) => cfg.statuses.includes(b.status));
  }, [bookings, tab]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Bookings" />
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <View style={styles.listPad}>
          {[1, 2, 3].map((k) => (
            <BookingCardSkeleton key={k} />
          ))}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPad}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error || 'No bookings in this tab.'}
            </Text>
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() =>
                navigation.navigate('BookingDetails', { bookingId: item.id })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.surface,
  },
  listPad: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
