import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { addressMapToString } from '../../utils/address';
import { useBookings } from '../../context/BookingsContext';

export function BookingDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId } = route.params || {};
  const { bookings } = useBookings();

  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId],
  );

  const scheduled = booking?.scheduledAt?.toDate
    ? booking.scheduledAt.toDate().toLocaleString()
    : '—';

  const addressStr = booking?.address
    ? addressMapToString(booking.address)
    : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Booking detail" onBack={() => navigation.goBack()} />
      {!booking ? (
        <Text style={styles.muted}>Booking not found or still loading.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{booking.serviceName}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{booking.status}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Booking code</Text>
            <Text style={styles.value}>{booking.bookingCode}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>₹{Number(booking.amount || 0)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>
              {booking.durationMinutes} minutes
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Scheduled</Text>
            <Text style={styles.value}>{scheduled}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{addressStr}</Text>
          </View>
          {booking.technicianName ? (
            <View style={styles.card}>
              <Text style={styles.label}>Technician</Text>
              <Text style={styles.value}>{booking.technicianName}</Text>
            </View>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{booking.notes || '—'}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  muted: {
    padding: spacing.lg,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
});
