import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius } from '../constants/spacing';

export function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ServiceCardSkeleton() {
  return (
    <View style={styles.serviceRow}>
      <SkeletonLoader width={72} height={72} borderRadius={radius.md} />
      <View style={styles.cardBody}>
        <SkeletonLoader height={18} style={styles.mb} />
        <SkeletonLoader height={14} width="70%" />
      </View>
    </View>
  );
}

export function BookingCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <SkeletonLoader height={16} width="45%" />
        <SkeletonLoader height={14} width="22%" />
      </View>
      <SkeletonLoader height={14} width="60%" style={styles.mt} />
      <SkeletonLoader height={12} width="40%" style={styles.mtSm} />
    </View>
  );
}

export function ServiceDetailSkeleton() {
  return (
    <View style={styles.detail}>
      <SkeletonLoader height={180} borderRadius={radius.lg} />
      <SkeletonLoader height={24} width="55%" style={styles.mtLg} />
      <SkeletonLoader height={16} width="30%" style={styles.mt} />
      <SkeletonLoader height={14} style={styles.mt} />
      <SkeletonLoader height={14} width="90%" style={styles.mtSm} />
      <SkeletonLoader height={14} width="80%" style={styles.mtSm} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  mb: {
    marginBottom: 8,
  },
  mt: {
    marginTop: 12,
  },
  mtSm: {
    marginTop: 8,
  },
  mtLg: {
    marginTop: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detail: {
    paddingHorizontal: 16,
  },
});
