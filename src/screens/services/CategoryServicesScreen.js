import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ServiceCard } from '../../components/ServiceCard';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { subscribeServicesByCategoryId } from '../../services/serviceCatalogService';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';
import { CategoryVideoPlayer } from '../../components/CategoryVideoPlayer';
import { resolveBannerSectionsForCategory } from '../../constants/bannerSections';
import { useCategories } from '../../hooks/useCategories';

const theme = {
  surface: '#FFFFFF',
  surfaceLow: '#F4F5F8',
  onSurface: '#191C1E',
  onSurfaceVariant: '#73777A',
  primary: '#a53500',
  border: '#E3E6E8',
};

function ServiceRowSkeleton() {
  return (
    <View style={skeletonStyles.row}>
      <SkeletonLoader width={96} height={96} borderRadius={radius.lg} />
      <View style={skeletonStyles.body}>
        <SkeletonLoader height={18} width="55%" style={skeletonStyles.mb} />
        <SkeletonLoader height={14} width="85%" style={skeletonStyles.mb} />
        <SkeletonLoader height={14} width="40%" />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  mb: { marginBottom: 8 },
});

export function CategoryServicesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const categoryId = route.params?.categoryId;
  const categoryName = route.params?.categoryName || 'Services';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const { categories } = useCategories();
  const category = useMemo(
    () => (categories || []).find((c) => String(c?.id) === String(categoryId)) || null,
    [categories, categoryId],
  );

  const bannerSections = useMemo(
    () =>
      resolveBannerSectionsForCategory(
        { id: categoryId, name: categoryName, title: categoryName },
        ['category'],
      ),
    [categoryId, categoryName],
  );

  useEffect(() => {
    if (!categoryId) {
      setServices([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsub = subscribeServicesByCategoryId(
      categoryId,
      (rows) => {
        setServices(rows);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Could not load services');
        setLoading(false);
      },
    );
    return () => unsub?.();
  }, [categoryId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q),
    );
  }, [services, query]);

  const openService = (item) => {
    navigation.navigate('ServiceDetails', {
      serviceId: item.id,
      categoryId,
      categoryName,
    });
  };

  const listEmpty =
    !loading && !error && filtered.length === 0 ? (
      <View style={styles.empty}>
        <MaterialIcons
          name="inventory-2"
          size={48}
          color={theme.onSurfaceVariant}
        />
        <Text style={styles.emptyTitle}>No services here yet</Text>
        <Text style={styles.emptySub}>
          {query.trim()
            ? 'Try a different search term.'
            : 'Check back soon for services in this category.'}
        </Text>
      </View>
    ) : null;

  return (
      <>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      <Header
        title={categoryName}
        onBack={() => navigation.goBack()}
      />
      <ScreenContainer style={styles.inner}>
        <View style={styles.searchWrap}>
          <MaterialIcons
            name="search"
            size={22}
            color={theme.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search in this category..."
            placeholderTextColor={theme.onSurfaceVariant}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <MaterialIcons
                name="close"
                size={20}
                color={theme.onSurfaceVariant}
              />
            </Pressable>
          ) : null}
        </View>

        <SectionPromoBanner section={bannerSections} />
        <CategoryVideoPlayer category={category} />

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4, 5].map((k) => (
              <ServiceRowSkeleton key={k} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) =>
              item?.id != null ? String(item.id) : `cat-svc-${index}`
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={listEmpty}
            renderItem={({ item }) => (
              <ServiceCard service={item} onPress={() => openService(item)} />
            )}
          />
        )}
      </ScreenContainer>
      </>
    
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLow,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: theme.onSurface,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 120,
  },
  skeletonList: {
    paddingTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: theme.onSurface,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
