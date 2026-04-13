import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { radius, shadows, spacing } from '../constants/spacing';
import { IconRow } from './IconRow';

export function AddressCard({
  title,
  subtitle,
  icon,
  onPress,
  highlighted,
  iconColor,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.highlight,
        pressed && styles.pressed,
      ]}
    >
      <IconRow
        icon={icon}
        title={title}
        subtitle={subtitle}
        iconColor={iconColor}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  highlight: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  pressed: {
    opacity: 0.92,
  },
});
