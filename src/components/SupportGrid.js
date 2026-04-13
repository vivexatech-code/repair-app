import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { radius, shadows, spacing } from '../constants/spacing';

export function SupportGrid({ items }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <Ionicons name={item.icon} size={22} color={colors.primary} />
          <Text style={styles.title}>{item.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 100,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
});
