import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { homeTheme } from './home/homeTheme';

const PING_URL = 'https://www.gstatic.com/generate_204';
const INTERVAL_MS = 12000;

/**
 * Lightweight offline banner (no NetInfo / expo-network dependency).
 * Uses a short fetch ping against a public 204 endpoint.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const check = async () => {
      try {
        const controller =
          typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = setTimeout(() => controller?.abort?.(), 4000);
        const res = await fetch(PING_URL, {
          method: 'GET',
          cache: 'no-store',
          ...(controller ? { signal: controller.signal } : {}),
        });
        clearTimeout(timeout);
        if (!cancelled) setOffline(!(res.ok || res.status === 204));
      } catch {
        if (!cancelled) setOffline(true);
      }
    };

    void check();
    timer = setInterval(() => void check(), INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!offline) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
    >
      <MaterialIcons name="wifi-off" size={16} color="#fff" />
      <Text style={styles.text}>You are offline. Some actions may not work.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#44403C',
    paddingBottom: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
