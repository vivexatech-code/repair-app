import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Original Hooks & Contexts
import { SERVICE_STATUS } from '../../constants';
import { useAllServices } from '../../hooks/useAllServices';

// Local theme object to replicate the target design's aesthetic
const theme = {
  surface: '#FFFFFF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F4F5F7',
  surfaceHigh: '#EAECEE',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#6C7278',
  primary: '#FF5700',
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
  const [filter, setFilter] = useState('all');

  // Original Filtering Logic Preserved
  const filtered = useMemo(() => {
    let rows = services || [];
    const q = query.trim().toLowerCase();
    
    if (q) {
      rows = rows.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
      );
    }
    
    if (filter === 'active') {
      rows = rows.filter((s) => s.status === SERVICE_STATUS.ACTIVE);
    } else if (filter === 'under300') {
      rows = rows.filter((s) => Number(s.price || 0) < 300);
    } else if (filter === 'mid') {
      rows = rows.filter((s) => {
        const p = Number(s.price || 0);
        return p >= 300 && p <= 600;
      });
    } else if (filter === 'high') {
      rows = rows.filter((s) => Number(s.price || 0) > 600);
    }
    return rows;
  }, [services, query, filter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            Experience the gold standard in home appliance maintenance. Our technicians blend technical precision with the white-glove service of a luxury atelier.
          </Text>
        </View>

        {/* Search Bar (Adapted from original logic to match new UI) */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color={theme.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for any service..."
            placeholderTextColor={theme.onSurfaceVariant}
            style={styles.searchInput}
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
          {loading && filtered.length === 0 ? (
             <View style={styles.loadingState}>
               <ActivityIndicator size="large" color={theme.primary} />
               <Text style={styles.loadingText}>Loading services...</Text>
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
                  image={service.image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop"} // Fallback image
                  icon="build" // Fallback icon
                  category={service.category || "Maintenance"}
                  title={service.name || "Service"}
                  price={`₹${service.price || 0}`}
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
  desc,
}) => (
  <View style={styles.detailedCard}>
    <ImageBackground source={{ uri: image }} style={styles.cardImage}>
      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "transparent"]}
        style={styles.cardGradient}
      >
        <View style={styles.cardBadge}>
          <MaterialIcons name={icon} size={14} color={theme.primary} />
          <Text style={styles.cardBadgeText}>{category}</Text>
        </View>
      </LinearGradient>
    </ImageBackground>

    <View style={styles.cardContent}>
      <View style={styles.cardHeaderInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{price}</Text>
        </View>
      </View>
      
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

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    // paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
    fontSize: 40,
    fontWeight: "900",
    color: theme.onSurface,
    lineHeight: 44,
    marginBottom: 12,
  },
  heroTitleHighlight: {
    color: theme.primary,
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.onSurfaceVariant,
    lineHeight: 22,
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
    gap: 12,
  },
  filterPill: {
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
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.onSurfaceVariant,
    fontWeight: "500",
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
  },
  cardGradient: {
    flex: 1,
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
    gap: 6,
  },
  cardBadgeText: {
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
    fontSize: 20, // Slightly smaller to accommodate pricing pill
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