import React, { memo, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { HomeOfferCarousel } from './home/HomeOfferCarousel';

/**
 * Same carousel as the top home banner — reused for every section.
 */
export const InlineSectionBanners = memo(function InlineSectionBanners({
  banners,
  onNavigate,
  style,
}) {
  const { width } = useWindowDimensions();
  const list = Array.isArray(banners)
    ? banners.filter((b) => b?.image || b?.imageUrl || b?.mobileImage)
    : [];

  const onOfferNavigate = useCallback(
    (screen, params) => {
      if (typeof onNavigate === 'function') {
        onNavigate(screen, params);
        return;
      }
    },
    [onNavigate],
  );

  if (!list.length) return null;

  return (
    <View style={[styles.wrap, style]}>
      <HomeOfferCarousel
        offers={list}
        width={width}
        onOfferNavigate={onOfferNavigate}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
});
