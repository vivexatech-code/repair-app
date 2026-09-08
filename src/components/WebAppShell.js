import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { injectWebDocumentStyles, useResponsive, WEB_PAGE_BG } from '../utils/layout';

export function WebAppShell({ children }) {
  const { isWeb, isWide, frameMax } = useResponsive();

  useEffect(() => {
    injectWebDocumentStyles();
  }, []);

  if (!isWeb) {
    return children;
  }

  return (
    <View style={styles.page}>
      <View
        style={[
          styles.frame,
          {
            maxWidth: frameMax,
            width: '100%',
            ...(isWide ? styles.frameWide : null),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100%' : undefined,
    backgroundColor: WEB_PAGE_BG,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  frameWide: {
    maxHeight: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#D6D1CB',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
});
