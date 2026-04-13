import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';

export function Badge({ label, tone = 'light' }) {
  const bg = tone === 'dark' ? colors.primary : `${colors.primary}1F`;
  const text = tone === 'dark' ? colors.surface : colors.primaryDark;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
