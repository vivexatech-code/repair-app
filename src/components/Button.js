import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { SkeletonLoader } from './SkeletonLoader';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  textStyle,
}) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        !isOutline && !isGhost && styles.primary,
        (disabled || loading) && styles.disabled,
        !disabled && !loading && pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <SkeletonLoader
            width={88}
            height={18}
            borderRadius={radius.full}
            style={[
              styles.loadingBar,
              isOutline || isGhost
                ? styles.loadingBarOutline
                : styles.loadingBarPrimary,
            ]}
          />
        ) : (
          <Text
            style={[
              styles.text,
              isOutline || isGhost ? styles.textOutline : styles.textPrimary,
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    minHeight: 52,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  inner: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBar: {
    opacity: 0.7,
  },
  loadingBarPrimary: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  loadingBarOutline: {
    backgroundColor: colors.borderStrong,
  },
  text: {
    ...typography.button,
  },
  textPrimary: {
    color: colors.surface,
  },
  textOutline: {
    color: colors.primary,
  },
});
