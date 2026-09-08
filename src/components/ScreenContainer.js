import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useResponsive } from '../utils/layout';

/**
 * Centers main content on web/tablet-wide layouts so the UI does not stretch edge-to-edge.
 */
export function ScreenContainer({ children, style }) {
  const { isWeb, isWide } = useResponsive();
  return (
    <View
      style={[
        styles.root,
        isWeb && styles.web,
        isWide && styles.webWide,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  web: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  webWide: {
    paddingHorizontal: 24,
  },
});
