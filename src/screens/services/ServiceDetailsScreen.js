import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { ServiceDetailSkeleton } from '../../components/SkeletonLoader';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { fetchServiceById } from '../../services/serviceCatalogService';
import { useCart } from '../../context/CartContext';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80';

export function ServiceDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceId } = route.params || {};
  const { addItem } = useCart();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const row = await fetchServiceById(serviceId);
        if (mounted) {
          setService(row);
          setError(row ? '' : 'Service not found');
        }
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Service" onBack={() => navigation.goBack()} />
        <ServiceDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Service" onBack={() => navigation.goBack()} />
        <Text style={styles.err}>{error}</Text>
      </SafeAreaView>
    );
  }

  const uri = service.imageUrl || PLACEHOLDER;
  const points = Array.isArray(service.keyPoints) ? service.keyPoints : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={service.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Image source={{ uri }} style={styles.banner} />
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>★ 4.8</Text>
          <Text style={styles.ratingSub}>(2.4k reviews)</Text>
        </View>
        <Text style={styles.price}>₹{Number(service.price || 0)}</Text>
        <Text style={styles.duration}>{service.duration} minutes</Text>
        <Text style={styles.desc}>{service.description}</Text>
        <Text style={styles.section}>Features</Text>
        {points.length ? (
          points.map((p, i) => (
            <View key={i} style={styles.pointRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.point}>{p}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No feature list provided.</Text>
        )}
        <Button
          title="Add to cart"
          onPress={() => {
            addItem(service, 1);
            navigation.navigate('Cart');
          }}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    paddingBottom: spacing.xl * 2,
  },
  banner: {
    height: 200,
    backgroundColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  rating: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginRight: spacing.sm,
  },
  ratingSub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  duration: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  desc: {
    fontSize: 15,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  pointRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  bullet: {
    width: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  point: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  muted: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  cta: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    ...shadows.card,
  },
  err: {
    padding: spacing.lg,
    color: colors.error,
  },
});
