import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRotatingSearchPlaceholder } from '../../hooks/useRotatingSearchPlaceholder';

// Original Hooks & Contexts
import { SERVICE_STATUS } from '../../constants';
import { useAllServices } from '../../hooks/useAllServices';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { OptimizedImage } from '../../components/OptimizedImage';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';
import { getServicePriceBounds, getServicePriceListLabel } from '../../utils/serviceVariations';

function serviceMatchesPriceFilter(service, filterId) {
  if (filterId === 'all') return true;
  if (filterId === 'active') return true;
  const { min, max } = getServicePriceBounds(service);
  if (min <= 0 && max <= 0) return false;
  if (filterId === 'under300') return min < 300;
  if (filterId === 'mid') return max >= 300 && min <= 600;
  if (filterId === 'high') return max > 600;
  return true;
}
const theme = {
  surface: '#FFFFFF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F4F5F7',
  surfaceHigh: '#EAECEE',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#6C7278',
  primary: '#C45508',
  primaryContainer: '#FF8A50',
};

// Merging original logic filters with new UI Pill styling
const FILTERS = [
  { id: 'all', label: 'All Services' },
  { id: 'active', label: 'Active' },
  { id: 'under300', label: 'Under ₹300' },
  { id: 'mid', label: '₹300–600' },
  { id: 'high', label: 'Above ₹600' },
];

export function ServicesScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  const navigation = useNavigation();
  
  const { services, loading, error, refresh } = useAllServices();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchPlaceholder = useRotatingSearchPlaceholder(
    searchFocused || Boolean(query.trim()),
  );
  const [filter, setFilter] = useState('all');

  // Original Filtering Logic Preserved
  const filtered = useMemo(() => {
    let rows = Array.isArray(services) ? services : [];
    const q = query.trim().toLowerCase();

    if (q) {
      rows = rows.filter(
        (s) =>
          s != null &&
          ((s.name || '').toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q)),
      );
    }

    if (filter === 'active') {
      rows = rows.filter((s) => s.status === SERVICE_STATUS.ACTIVE);
    } else if (filter === 'under300' || filter === 'mid' || filter === 'high') {
      rows = rows.filter((s) => serviceMatchesPriceFilter(s, filter));
    }
    return rows;
  }, [services, query, filter]);

  const hasCatalogRows = Array.isArray(services) && services.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenContainer style={styles.screenInner}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Our Services</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <MaterialIcons name="shopping-cart" size={22} color={theme.onSurface} />
          <View style={styles.cartBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[theme.primary]} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Expert care for{"\n"}
            <Text style={styles.heroTitleHighlight}>your sanctuary.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Experience the gold standard in home appliance maintenance. Our partners blend technical precision with the white-glove service of a luxury atelier.
          </Text>
        </View>

        <SectionPromoBanner section="services" />

        {/* Search Bar (Adapted from original logic to match new UI) */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color={theme.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              searchFocused || query.trim()
                ? 'Search for any service...'
                : searchPlaceholder
            }
            placeholderTextColor={theme.onSurfaceVariant}
            style={styles.searchInput}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onSubmitEditing={() => {
              const q = query.trim();
              if (q) navigation.navigate('SearchResults', { query: q });
            }}
          />
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
          style={styles.filtersContainer}
        >
          {FILTERS.map((item) => (
            <FilterPill
              key={item.id}
              label={item.label}
              isActive={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </ScrollView>

        {/* Detailed Service Cards Grid */}
        <View style={styles.cardsGrid}>
          {loading && !hasCatalogRows ? (
             <View style={styles.loadingState}>
               {[1, 2, 3, 4].map((item) => (
                 <View key={item} style={{ width: isTablet ? '48%' : '100%', marginBottom: 20 }}>
                   <ServiceCardLoadingSkeleton />
                 </View>
               ))}
             </View>
          ) : filtered.length > 0 ? (
            filtered.map((service) => (
              <TouchableOpacity
                key={service.id}
                activeOpacity={0.9}
                style={{ width: isTablet ? "48%" : "100%", marginBottom: 20 }}
                onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.id })}
              >
                <DetailedServiceCard
                  isTablet={isTablet}
                  image={service.imageUrl || service.image}
                  icon="build" // Fallback icon
                  category={service.category || "Maintenance"}
                  title={service.name || "Service"}
                  price={getServicePriceListLabel(service)}
                  optionCount={
                    service.hasVariations &&
                    Array.isArray(service.variations) &&
                    service.variations.length > 0
                      ? service.variations.length
                      : 0
                  }
                  desc={service.description || "Expert service for your home appliances."}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color={theme.onSurfaceVariant} />
              <Text style={styles.emptyStateText}>
                {error || `No services found for "${FILTERS.find(f => f.id === filter)?.label}".`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const FilterPill = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.filterPill, isActive && styles.filterPillActive]}
  >
    <Text
      style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const DetailedServiceCard = ({
  image,
  icon,
  category,
  title,
  price,
  optionCount = 0,
  desc,
}) => (
  <View style={styles.detailedCard}>
    <View style={styles.cardImage}>
      {image ? (
        <OptimizedImage
          uri={image}
          width={800}
          height={400}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          priority="normal"
        />
      ) : (
        <LinearGradient
          colors={[theme.surfaceHigh, theme.surfaceLow]}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "transparent"]}
        style={styles.cardGradient}
      >
        <View style={styles.cardBadge}>
          <MaterialIcons name={icon} size={14} color={theme.primary} />
          <Text style={styles.cardBadgeText}>{category}</Text>
        </View>
      </LinearGradient>
    </View>

    <View style={styles.cardContent}>
      <View style={styles.cardHeaderInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.pricePill}>
          <Text style={styles.priceText} numberOfLines={1}>{price}</Text>
        </View>
      </View>
      {optionCount > 0 ? (
        <Text style={styles.cardOptionHint}>{optionCount} options</Text>
      ) : null}
      
      <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>
      
      <View style={styles.selectButtonContainer}>
        <LinearGradient
          colors={[theme.primary, theme.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.selectButton}
        >
          <Text style={styles.selectButtonText}>Select Service</Text>
        </LinearGradient>
      </View>
    </View>
  </View>
);

const ServiceCardLoadingSkeleton = () => (
  <View style={styles.detailedCard}>
    <SkeletonLoader height={220} borderRadius={24} />
    <View style={styles.cardContent}>
      <SkeletonLoader height={18} width="70%" />
      <SkeletonLoader height={14} width="40%" style={{ marginTop: 10 }} />
      <SkeletonLoader height={12} width="100%" style={{ marginTop: 12 }} />
      <SkeletonLoader height={12} width="85%" style={{ marginTop: 8 }} />
      <SkeletonLoader height={48} borderRadius={16} style={{ marginTop: 20 }} />
    </View>
  </View>
);

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    // paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  screenInner: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(245, 246, 247, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 227, 228, 0.5)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.onSurface,
  },
  cartButton: {
    padding: 10,
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: theme.primary,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.surfaceLowest,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120, // Tab bar clearance
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: theme.onSurface,
    lineHeight: 38,
    marginBottom: 12,
  },
  heroTitleHighlight: {
    color: theme.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    lineHeight: 20,
    maxWidth: "95%",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLowest,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.onSurface,
    fontWeight: '500',
  },
  filtersContainer: {
    marginBottom: 24,
    marginHorizontal: -20, // Allows full bleed scrolling
  },
  filtersScroll: {
    paddingHorizontal: 20,
  },
  filterPill: {
    marginRight: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.surfaceLowest,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.8)",
    borderRadius: 24,
  },
  filterPillActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emptyState: {
    width: "100%",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.onSurfaceVariant,
    fontWeight: "500",
  },
  loadingState: {
    width: "100%",
    paddingVertical: 8,
  },
  detailedCard: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.5)",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.03,
    shadowRadius: 40,
    elevation: 3,
  },
  cardImage: {
    height: 220,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardBadgeText: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: "bold",
    color: theme.onSurface,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardContent: {
    padding: 24,
  },
  cardHeaderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Align items to center to handle long text properly
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18, // Slightly smaller to avoid clipping
    fontWeight: "900",
    color: theme.onSurface,
    flex: 1,
    marginRight: 12,
  },
  pricePill: {
    backgroundColor: "rgba(165, 53, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.primary,
    maxWidth: 140,
  },
  cardOptionHint: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.onSurfaceVariant,
    marginBottom: 10,
    marginTop: -4,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 24,
  },
  selectButtonContainer: {
    borderRadius: 16,
    overflow: "hidden", // Ensures the gradient stays within the border radius
  },
  selectButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});