import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, shadows, spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { OptimizedImage } from './OptimizedImage';
import { getServicePriceListLabel } from '../utils/serviceVariations';

export function ServiceCard({ service, onPress }) {
  const uri = service.imageUrl || service.image || null;
  const duration = Number(service.duration || 0);
  const priceLabel = getServicePriceListLabel(service);
  const varCount = Array.isArray(service.variations) ? service.variations.length : 0;
  const showVarHint = service.hasVariations === true && varCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${service.name || 'Service'} details`}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <OptimizedImage
        uri={uri}
        width={192}
        height={192}
        borderRadius={16}
        style={styles.image}
        priority="high"
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {service.name}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {service.description}
        </Text>
        {showVarHint ? (
          <Text style={styles.optionHint}>{varCount} options</Text>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.price} numberOfLines={1}>
            {priceLabel}
          </Text>
          <Text style={styles.duration}>{duration} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    marginBottom: spacing.md,
    overflow: 'hidden',

    // Better depth
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,

    // subtle border for premium feel
    borderWidth: 1,
    borderColor: colors.border,
  },

  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }],
  },

  image: {
    width: 100,
    height: 100,
    borderRadius: 16,
    margin: spacing.md,
    backgroundColor: colors.surfaceVariant,
  },

  body: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    justifyContent: 'space-between',
  },

  name: {
    ...typography.title,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  optionHint: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '15', // soft tint
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  price: {
    ...typography.title,
    color: colors.primary,
    fontWeight: '700',
  },

  duration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
