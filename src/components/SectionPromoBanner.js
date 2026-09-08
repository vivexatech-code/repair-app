import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { subscribeSectionBanners } from '../services/serviceCatalogService';
import { HomeOfferCarousel } from './home/HomeOfferCarousel';

/**
 * Compact promo carousel for any app section (services, bookings, account, …).
 */
export const SectionPromoBanner = memo(function SectionPromoBanner({
  section = 'home',
  style,
}) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [offers, setOffers] = useState([]);
  const sectionKey = Array.isArray(section)
    ? section.filter(Boolean).join('|')
    : String(section || 'home');

  useEffect(() => {
    const wanted = sectionKey.split('|').filter(Boolean);
    if (!wanted.length) {
      setOffers([]);
      return undefined;
    }
    const unsub = subscribeSectionBanners(
      wanted.length === 1 ? wanted[0] : wanted,
      (rows) => setOffers(Array.isArray(rows) ? rows : []),
      () => setOffers([]),
    );
    return () => unsub?.();
  }, [sectionKey]);

  const onOfferNavigate = useCallback(
    (screen, params) => {
      try {
        navigation.navigate(screen, params);
      } catch {
        /* ignore */
      }
    },
    [navigation],
  );

  if (!offers.length) return null;

  return (
    <View style={[styles.wrap, style]}>
      <HomeOfferCarousel
        offers={offers}
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
