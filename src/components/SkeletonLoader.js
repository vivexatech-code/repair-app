import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius } from '../constants/spacing';

const SHIMMER_WIDTH = 120;

export function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}) {
  const opacity = useRef(new Animated.Value(0.38)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.38,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[styles.shimmerWrap, { borderRadius, height, width }, style]}>
      <Animated.View
        style={[
          styles.shimmerBase,
          {
            width: '100%',
            height: '100%',
            borderRadius,
            opacity,
          },
        ]}
      />
      <ShimmerSweep borderRadius={borderRadius} height={height} />
    </View>
  );
}

function ShimmerSweep({ borderRadius, height }) {
  const x = useRef(new Animated.Value(-SHIMMER_WIDTH)).current;
  const [trackW, setTrackW] = useState(200);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, {
          toValue: trackW + SHIMMER_WIDTH,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: -SHIMMER_WIDTH,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x, trackW]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setTrackW(w);
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerHighlight,
          {
            height,
            borderRadius,
            transform: [{ translateX: x }],
          },
        ]}
      />
    </View>
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
      <SkeletonLoader height={220} borderRadius={radius.xl} />
      <SkeletonLoader height={22} width="60%" style={styles.mtLg} />
      <SkeletonLoader height={14} width="40%" style={styles.mt} />
      <View style={styles.rowChips}>
        <SkeletonLoader height={36} width={72} borderRadius={radius.full} />
        <SkeletonLoader height={36} width={72} borderRadius={radius.full} />
        <SkeletonLoader height={36} width={72} borderRadius={radius.full} />
      </View>
      <SkeletonLoader height={20} width="45%" style={styles.mtLg} />
      <View style={styles.stepSk}>
        <SkeletonLoader height={100} width={100} borderRadius={radius.md} />
        <View style={styles.stepSkText}>
          <SkeletonLoader height={16} width="85%" />
          <SkeletonLoader height={12} width="100%" style={styles.mtSm} />
          <SkeletonLoader height={12} width="70%" style={styles.mtSm} />
        </View>
      </View>
      <SkeletonLoader height={20} width="40%" style={styles.mtLg} />
      <SkeletonLoader height={48} borderRadius={radius.md} style={styles.mt} />
      <SkeletonLoader height={48} borderRadius={radius.md} style={styles.mtSm} />
    </View>
  );
}

/** Full-width blocks for initial route boot (replaces blank flash). */
export function AppBootSkeleton() {
  return (
    <View style={styles.boot}>
      <SkeletonLoader height={48} borderRadius={radius.md} style={styles.bootLine} />
      <SkeletonLoader height={120} borderRadius={radius.lg} style={styles.bootLine} />
      <SkeletonLoader height={22} width="55%" style={styles.bootLine} />
      <SkeletonLoader height={14} width="80%" style={styles.bootLine} />
      <View style={styles.bootRow}>
        <SkeletonLoader height={100} width="48%" borderRadius={radius.md} />
        <SkeletonLoader height={100} width="48%" borderRadius={radius.md} />
      </View>
      <SkeletonLoader height={160} borderRadius={radius.lg} style={styles.bootLine} />
    </View>
  );
}

/** Short opacity fade when replacing skeletons with real content (reduces flash). */
export function FadeInContent({ visible, children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 140,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View style={[{ opacity }, style]} collapsable={false}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shimmerWrap: {
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  shimmerBase: {
    backgroundColor: colors.border,
  },
  shimmerHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SHIMMER_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.55)',
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
  rowChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  stepSk: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  stepSkText: {
    flex: 1,
    paddingTop: 4,
  },
  boot: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
  },
  bootLine: {
    marginBottom: 16,
  },
  bootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
