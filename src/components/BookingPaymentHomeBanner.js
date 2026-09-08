import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FadeInContent } from './SkeletonLoader';

import { homeTheme } from './home/homeTheme';

const theme = {
  primary: homeTheme.primary,
  surface: homeTheme.surfaceWarm,
  border: '#FDBA74',
  text: homeTheme.text,
  muted: homeTheme.textSecondary,
};

export function BookingPaymentHomeBanner({ bookings, navigation, style }) {
  const pending = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter((b) => {
      const pr = b?.paymentRequest;
      return pr && String(pr.status).toLowerCase() === 'pending' && String(pr.method).toLowerCase() === 'rs_app';
    });
  }, [bookings]);

  if (pending.length === 0) return null;

  const first = pending[0];
  const amount = Number(first.paymentRequest?.amount) || Number(first.totalAmount) || Number(first.amount) || 0;

  return (
    <FadeInContent visible style={[{ marginBottom: 12 }, style]}>
      <View style={styles.card}>
        <MaterialIcons name="payments" size={26} color={theme.primary} />
        <View style={styles.col}>
          <Text style={styles.title}>Payment requested</Text>
          <Text style={styles.body}>
            Your partner sent a ₹{Math.round(amount)} payment request. Tap to pay in the app.
          </Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: String(first.id) })}
          >
            <Text style={styles.ctaText}>Pay now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </FadeInContent>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  col: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: theme.text },
  body: { fontSize: 13, color: theme.muted, marginTop: 4, lineHeight: 18 },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
