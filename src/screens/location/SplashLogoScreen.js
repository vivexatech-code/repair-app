import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, StatusBar } from 'react-native';
import { Image } from 'expo-image';

import { colors } from '../../constants/colors';
import { APP_NAME } from '../../constants';

export const SPLASH_BACKGROUND = colors.background;

/** Static logo for auth bootstrap (no animation). */
export function BrandSplashLogo() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SPLASH_BACKGROUND} />
      <View style={styles.glow} />
      <View style={styles.center}>
        <View style={styles.logoRing}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Trusted home services</Text>
      </View>
    </View>
  );
}

const FADE_IN_MS = 520;
const HOLD_MS = 900;
const FADE_OUT_MS = 380;

export function SplashLogoScreen({ onComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(ring, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    if (!onCompleteRef.current) return undefined;

    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        if (finished.current) return;
        finished.current = true;
        onCompleteRef.current?.();
      });
    }, FADE_IN_MS + HOLD_MS);

    return () => clearTimeout(t);
  }, [opacity, scale, ring]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.35],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.45, 0.22, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SPLASH_BACKGROUND} />
      <View style={styles.glow} />
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoStack}>
          <Animated.View
            style={[
              styles.pulseRing,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <View style={styles.logoRing}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logo}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
        </View>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Trusted home services, on time</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primarySoft,
    opacity: 0.55,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoStack: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  pulseRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  logoRing: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
