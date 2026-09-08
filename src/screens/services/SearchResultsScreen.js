import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { ServiceCard } from '../../components/ServiceCard';
import { ServiceCardSkeleton } from '../../components/SkeletonLoader';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { searchServicesByText } from '../../services/serviceCatalogService';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';

export function SearchResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const query = String(route.params?.query || '').trim();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await searchServicesByText(query);
        if (mounted) setRows(list);
      } catch (e) {
        if (mounted) setError(e?.message || 'Unable to search services');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title={`Search: ${query || 'Results'}`} onBack={() => navigation.goBack()} />
      <FlatList
        contentContainerStyle={styles.list}
        data={loading ? [] : rows}
        keyExtractor={(item, index) =>
          item?.id != null ? String(item.id) : `search-${index}`
        }
        ListHeaderComponent={<SectionPromoBanner section="search" />}
        ListEmptyComponent={
          loading ? (
            <View>
              {[1, 2, 3, 4].map((k) => (
                <ServiceCardSkeleton key={k} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {error || `No services found for "${query}".`}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
