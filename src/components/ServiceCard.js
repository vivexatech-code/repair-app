import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, shadows, spacing } from '../constants/spacing';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80';

export function ServiceCard({ service, onPress }) {
  const uri = service.imageUrl || PLACEHOLDER;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={{ uri }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {service.name}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {service.description}
        </Text>
        <View style={styles.row}>
          <Text style={styles.price}>₹{Number(service.price || 0)}</Text>
          <Text style={styles.duration}>{service.duration} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  image: {
    width: 96,
    height: 96,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  duration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
