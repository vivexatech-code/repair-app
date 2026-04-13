import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, shadows, spacing } from '../constants/spacing';
import { BOOKING_STATUS } from '../constants';

function statusColor(status) {
  switch (status) {
    case BOOKING_STATUS.COMPLETED:
      return colors.success;
    case BOOKING_STATUS.CANCELLED:
      return colors.error;
    case BOOKING_STATUS.ASSIGNED:
      return colors.primaryDark;
    default:
      return colors.primary;
  }
}

export function BookingCard({ booking, onPress }) {
  const scheduled = booking.scheduledAt?.toDate
    ? booking.scheduledAt.toDate()
    : null;
  const dateLabel = scheduled
    ? scheduled.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {booking.serviceName}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusColor(booking.status) + '22' },
          ]}
        >
          <Text style={[styles.badgeText, { color: statusColor(booking.status) }]}>
            {booking.status}
          </Text>
        </View>
      </View>
      <Text style={styles.code}>Code: {booking.bookingCode}</Text>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.amount}>₹{Number(booking.amount || 0)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.94,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
