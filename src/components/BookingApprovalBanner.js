import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FadeInContent } from './SkeletonLoader';
import { hasPendingCustomerApproval } from '../utils/bookingApproval';

const bannerTheme = {
  primary: '#a53500',
  surface: '#fff7ed',
  onSurface: '#292524',
  onSurfaceVariant: '#78716c',
  border: 'rgba(165, 53, 0, 0.35)',
};

export function BookingApprovalBanner({ bookings, navigation, style }) {
  const pending = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter((b) => b?.id && hasPendingCustomerApproval(b));
  }, [bookings]);

  if (pending.length === 0) return null;

  const first = pending[0];
  const extra = pending.length - 1;

  return (
    <FadeInContent visible style={[{ marginBottom: 16 }, style]}>
      <View style={styles.card} accessibilityRole="alert">
        <View style={styles.iconCircle}>
          <MaterialIcons name="rate-review" size={22} color={bannerTheme.primary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Booking update request</Text>
          <Text style={styles.body}>
            Partner requested additional work or services.
          </Text>
          {extra > 0 ? (
            <Text style={styles.more}>
              + {extra} more request{extra === 1 ? '' : 's'}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('BookingApproval', { bookingId: String(first.id) })
            }
            accessibilityRole="button"
            accessibilityLabel="View approval details"
          >
            <Text style={styles.ctaText}>View details</Text>
            <MaterialIcons name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </FadeInContent>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: bannerTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: bannerTheme.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(165, 53, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: bannerTheme.onSurface,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: bannerTheme.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 10,
  },
  more: {
    fontSize: 13,
    fontWeight: '700',
    color: bannerTheme.primary,
    marginBottom: 10,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: bannerTheme.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
