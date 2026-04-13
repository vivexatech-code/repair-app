import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';

export function LocationSelector({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed, style]}
    >
      <Text style={styles.icon}>📍</Text>
      <View style={styles.textWrap}>
        <Text style={styles.caption}>Service location</Text>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={styles.chev}>▼</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  chev: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
