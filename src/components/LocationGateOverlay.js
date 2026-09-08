import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useLocationContext } from '../context/LocationContext';
import { homeTheme } from './home/homeTheme';
import {
  isStoredLocationFresh,
  loadStoredUserLocation,
} from '../utils/userLocationCache';

/**
 * Location animation on open. Uses cached coords/label when fresh so the pin
 * does not jump to a new reverse-geocode string every launch.
 */
export function LocationGateOverlay() {
  const navigation = useNavigation();
  const {
    loading,
    permissionStatus,
    refreshLocation,
    coords,
    locationLabel,
  } = useLocationContext();
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState('Finding your location');
  const startedRef = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const startPulse = useCallback(() => {
    pulse.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const hideGate = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
  }, [fade]);

  const check = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setVisible(true);
    setDenied(false);
    setProgress(12);
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    startPulse();

    const cached = await loadStoredUserLocation();
    if (cached && isStoredLocationFresh(cached)) {
      setStatusLine(cached.locationLabel || cached.address || 'Saved location');
      setProgress(100);
      await refreshLocation({ force: false });
      setTimeout(() => hideGate(), 650);
      return;
    }

    setStatusLine('Finding your location');
    const result = await refreshLocation({ force: true });
    if (result?.denied) {
      setDenied(true);
    }
  }, [refreshLocation, fade, startPulse, hideGate]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (!visible || denied || loading) return;
    if (coords?.latitude != null && coords?.longitude != null) {
      setProgress(100);
      if (locationLabel) setStatusLine(locationLabel);
      const t = setTimeout(() => hideGate(), 400);
      return () => clearTimeout(t);
    }
    if (permissionStatus === 'denied') {
      setDenied(true);
    }
  }, [visible, loading, coords, permissionStatus, denied, hideGate, locationLabel]);

  useEffect(() => {
    if (!visible || denied) return;
    const t = setInterval(() => setProgress((p) => (p >= 92 ? p : p + 5)), 280);
    return () => clearInterval(t);
  }, [visible, denied]);

  const onAllow = async () => {
    setDenied(false);
    setProgress(0);
    startPulse();
    await refreshLocation({ force: true });
  };

  const onManual = async () => {
    setVisible(false);
    navigation.navigate('Address');
  };

  if (!visible) return null;

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.05] });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <View style={styles.card}>
          {!denied ? (
            <>
              <View style={styles.iconStack}>
                <Animated.View
                  style={[styles.pulseRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
                />
                <View style={styles.iconWrap}>
                  <MaterialIcons name="my-location" size={40} color={homeTheme.primary} />
                </View>
              </View>
              <Text style={styles.title}>{statusLine}</Text>
              <Text style={styles.sub}>
                Using your saved pin when available so nearby services stay consistent.
              </Text>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.pct}>{Math.min(99, Math.round(progress))}%</Text>
            </>
          ) : (
            <>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <MaterialIcons name="location-off" size={44} color="#DC2626" />
              </View>
              <Text style={styles.title}>Location needed</Text>
              <Text style={styles.sub}>
                Location access is required to show nearby services and available partners.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={() => void onAllow()}>
                <Text style={styles.primaryBtnText}>Allow Location</Text>
              </Pressable>
              <Pressable style={styles.outlineBtn} onPress={() => void onManual()}>
                <Text style={styles.outlineBtnText}>Enter Address Manually</Text>
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  iconStack: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: homeTheme.primary,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: homeTheme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: homeTheme.text, textAlign: 'center' },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: homeTheme.textMuted,
    textAlign: 'center',
  },
  track: {
    marginTop: 20,
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  bar: { height: '100%', backgroundColor: homeTheme.primary, borderRadius: 999 },
  pct: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: homeTheme.primary,
  },
  primaryBtn: {
    marginTop: 20,
    width: '100%',
    height: 48,
    borderRadius: 999,
    backgroundColor: homeTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  outlineBtn: {
    marginTop: 12,
    width: '100%',
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: homeTheme.text, fontWeight: '700', fontSize: 15 },
});
