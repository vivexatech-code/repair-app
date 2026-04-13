import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ImageBackground,
  Image,
  Platform,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Original Hooks & Contexts
import { APP_NAME, BOOKING_STATUS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useActiveServices } from '../../hooks/useActiveServices';
import { useBookings } from '../../context/BookingsContext';
import { loadSavedAddresses } from '../../utils/savedAddresses';
import { ServiceCardSkeleton } from '../../components/SkeletonLoader';
import { colors } from '../../constants/colors';

// Local theme object to replicate the target design's aesthetic
const theme = {
  surface: '#FFFFFF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F4F5F7',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#6C7278',
  primary: '#FF5700',
};

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { customer, user } = useAuth();
  const { services, loading, error, refresh } = useActiveServices();
  const { bookings } = useBookings();
  
  const [query, setQuery] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [locationLabel, setLocationLabel] = useState(
    customer?.address || 'Add your service location'
  );

  const offerCardWidth = width > 500 ? 400 : width * 0.85;

  useEffect(() => {
    if (customer?.address) {
      setLocationLabel(customer.address);
    }
  }, [customer?.address]);

  const loadSaved = useCallback(async () => {
    if (!user?.uid) return;
    const list = await loadSavedAddresses(user.uid);
    setSavedList(list);
  }, [user?.uid]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const lastCompleted = useMemo(() => {
    return bookings.find((b) => b.status === BOOKING_STATUS.COMPLETED);
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }, [services, query]);

  const openService = (item) => {
    navigation.navigate('ServiceDetails', { serviceId: item.id });
  };

  const pickLocation = (value) => {
    setLocationLabel(value);
    setLocationOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.locationContainer}
          onPress={() => {
            loadSaved();
            setLocationOpen(true);
          }}
        >
          <View style={styles.locationIconBg}>
            <MaterialIcons name="location-on" size={20} color={theme.primary} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>YOUR LOCATION</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationCity} numberOfLines={1}>
                {locationLabel.length > 20
                  ? `${locationLabel.substring(0, 20)}...`
                  : locationLabel}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color={theme.primary}
              />
            </View>
          </View>
        </TouchableOpacity>

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
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Mobile Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={24}
            color={theme.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for AC service, cleaning..."
            placeholderTextColor={theme.onSurfaceVariant}
          />
        </View>

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{
              uri: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=800&auto=format&fit=crop',
            }}
            style={styles.heroBackground}
            imageStyle={{ borderRadius: 16 }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>SUMMER SPECIAL</Text>
              </View>
              <Text style={styles.heroTitle}>Up to 40% Off AC Services</Text>
              <Text style={styles.heroSubtitle}>
                Expert maintenance to keep your home cool and breezy this season.
              </Text>
              <TouchableOpacity style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Book Now</Text>
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Explore Services */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Explore Services</Text>
            <Text style={styles.sectionSubtitle}>
              Professional help for every corner
            </Text>
          </View>
        </View>

        <View style={styles.servicesGrid}>
          {loading ? (
            // Render Skeleton Loaders if fetching
            [1, 2, 3, 4].map((k) => (
              <View key={k} style={{ width: '48%', marginBottom: 16 }}>
                <ServiceCardSkeleton />
              </View>
            ))
          ) : filtered.length > 0 ? (
            // Render dynamic mapped services
            filtered.map((item) => (
              <ServiceCard
                key={item.id}
                image={
                  item.image ||
                  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop'
                }
                title={item.name || 'Service'}
                time={item.duration || '30 mins'}
                desc={item.description || 'Expert service'}
                onPress={() => openService(item)}
              />
            ))
          ) : (
            <Text style={styles.empty}>
              {error || 'No active services yet.'}
            </Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Services' /* Adjust route if needed */)}
        >
          <Text style={styles.viewAllButtonText}>View All Services</Text>
          <MaterialIcons name="arrow-forward" size={16} color={theme.onSurface} />
        </TouchableOpacity>

        {/* Best Offers (Static from design) */}
        <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>
          Best Offers for You
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={offerCardWidth + 16}
          decelerationRate="fast"
          contentContainerStyle={styles.offersScroll}
        >
          <OfferCard
            cardWidth={offerCardWidth}
            image="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop"
            title="Appliances Day"
            desc="Flat ₹500 off on major repairs"
            code="CODE: SAVE500"
          />
          <OfferCard
            cardWidth={offerCardWidth}
            image="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=600&auto=format&fit=crop"
            title="New User Special"
            desc="Get 25% off your first booking"
            code="CODE: HELLO25"
          />
          <OfferCard
            cardWidth={offerCardWidth}
            image="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=600&auto=format&fit=crop"
            title="Kitchen Revival"
            desc="Chimney & Hob deep clean combo"
            code="STARTING ₹199"
          />
        </ScrollView>

        {/* Popular Near You (Static from design) */}
        <View style={styles.popularSection}>
          <View style={styles.popularHeader}>
            <Text style={styles.sectionTitle}>Popular Near You</Text>
            <View style={styles.trendingBadge}>
              <MaterialIcons name="trending-up" size={14} color={theme.primary} />
              <Text style={styles.trendingText}>TRENDING</Text>
            </View>
          </View>

          <PopularCard
            image="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop"
            title="Full Home Sanitization"
            rating="4.8"
            reviews="1.2k"
            desc="Eliminate 99% germs and viruses"
            price="₹999"
          />
          <PopularCard
            image="https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=400&auto=format&fit=crop"
            title="Modern Lighting Setup"
            rating="4.9"
            reviews="840"
            desc="Smart LED installations"
            price="₹599"
          />
        </View>

        {/* Quick Rebook (Dynamic from context data) */}
        {lastCompleted && (
          <View style={styles.rebookContainer}>
            <Text style={styles.sectionTitle}>Quick Rebook</Text>
            <RebookItem
              icon="history"
              title={`Book again: ${lastCompleted.serviceName}`}
              subtitle="Recently completed service"
              onPress={() =>
                navigation.navigate('ServiceDetails', {
                  serviceId: lastCompleted.serviceId,
                })
              }
            />
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={() => navigation.navigate('Bookings' /* Adjust route if needed */)}
            >
              <Text style={styles.historyButtonText}>View Booking History</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Location Bottom Sheet Modal */}
      <Modal visible={locationOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setLocationOpen(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Choose location</Text>
            {customer?.address ? (
              <Pressable
                style={styles.sheetRow}
                onPress={() => pickLocation(customer.address)}
              >
                <Text style={styles.sheetRowText}>Profile address</Text>
              </Pressable>
            ) : null}
            {savedList.map((line, idx) => (
              <Pressable
                key={`${idx}-${line}`}
                style={styles.sheetRow}
                onPress={() => pickLocation(line)}
              >
                <Text style={styles.sheetRowText} numberOfLines={2}>
                  {line}
                </Text>
              </Pressable>
            ))}
            <TouchableOpacity
              style={[styles.historyButton, { backgroundColor: 'transparent', marginTop: 16 }]}
              onPress={() => setLocationOpen(false)}
            >
              <Text style={[styles.historyButtonText, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// Sub-components mapped to target design layout
// ----------------------------------------------------

const ServiceCard = ({ image, title, time, desc, onPress }) => (
  <TouchableOpacity style={styles.serviceCard} activeOpacity={0.8} onPress={onPress}>
    <Image source={{ uri: image }} style={styles.serviceImage} />
    <View style={styles.serviceContent}>
      <Text style={styles.serviceTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.serviceDesc} numberOfLines={1}>
        {desc}
      </Text>
      <View style={styles.timeBadgeRow}>
        <MaterialIcons name="schedule" size={12} color={theme.onSurfaceVariant} />
        <Text style={styles.serviceMetaText}>{time}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const OfferCard = ({ image, title, desc, code, cardWidth }) => (
  <TouchableOpacity style={[styles.offerCard, { width: cardWidth }]} activeOpacity={0.9}>
    <ImageBackground
      source={{ uri: image }}
      style={styles.offerImage}
      imageStyle={{ borderRadius: 16 }}
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.offerGradient}
      >
        <Text style={styles.offerTitle}>{title}</Text>
        <Text style={styles.offerDesc}>{desc}</Text>
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>{code}</Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  </TouchableOpacity>
);

const PopularCard = ({ image, title, rating, reviews, desc, price }) => (
  <TouchableOpacity style={styles.popularCard} activeOpacity={0.7}>
    <Image source={{ uri: image }} style={styles.popularImage} />
    <View style={styles.popularInfo}>
      <View style={styles.ratingRow}>
        <MaterialIcons name="star" size={14} color="#eab308" />
        <Text style={styles.ratingText}>
          {rating} <Text style={styles.reviewText}>({reviews} reviews)</Text>
        </Text>
      </View>
      <Text style={styles.popularTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.popularDesc} numberOfLines={1}>
        {desc}
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceText}>{price}</Text>
        <MaterialIcons name="arrow-forward" size={18} color={theme.onSurfaceVariant} />
      </View>
    </View>
  </TouchableOpacity>
);

const RebookItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.rebookItem} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.rebookIcon}>
      <MaterialIcons name={icon} size={24} color={theme.onSurface} />
    </View>
    <View style={styles.rebookText}>
      <Text style={styles.rebookTitle}>{title}</Text>
      <Text style={styles.rebookSubtitle}>{subtitle}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color={theme.onSurfaceVariant} />
  </TouchableOpacity>
);

// ----------------------------------------------------
// Styles
// ----------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(224, 227, 228, 0.4)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: '80%', // Ensure it doesn't overlap with cart
  },
  locationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 87, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextContainer: {
    flexDirection: 'column',
    flex: 1, // Let text take remaining space
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.onSurfaceVariant,
    letterSpacing: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationCity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.onSurface,
  },
  cartButton: {
    padding: 10,
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.6)',
  },
  cartBadge: {
    position: 'absolute',
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
    paddingTop: 16,
    paddingBottom: 110,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLowest,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.onSurface,
  },
  heroContainer: {
    height: 220,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBackground: {
    flex: 1,
  },
  heroGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    maxWidth: '85%',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 20,
    maxWidth: '80%',
    lineHeight: 18,
  },
  heroButton: {
    backgroundColor: theme.surfaceLowest,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.onSurface,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    fontWeight: '500',
  },

  /* --- Updated Service Card Styles --- */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.6)',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceImage: {
    width: '100%',
    height: 100,
    backgroundColor: theme.surfaceLow,
  },
  serviceContent: {
    padding: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.onSurface,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginBottom: 8,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceMetaText: {
    color: theme.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    width: '100%',
    textAlign: 'center',
    color: theme.onSurfaceVariant,
    marginTop: 16,
    marginBottom: 16,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceLow,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.onSurface,
  },
  offersScroll: {
    gap: 16,
    paddingRight: 20,
  },
  offerCard: {
    height: 180,
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  offerImage: {
    flex: 1,
  },
  offerGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'flex-end',
  },
  offerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  offerDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 12,
  },
  offerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* --- Popular Section Styles --- */
  popularSection: {
    marginTop: 32,
  },
  popularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 87, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 4,
  },
  trendingText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  popularCard: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLowest,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.6)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  popularImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: theme.surfaceLow,
  },
  popularInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.onSurface,
  },
  reviewText: {
    fontWeight: '500',
    color: theme.onSurfaceVariant,
  },
  popularTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.onSurface,
    marginBottom: 4,
  },
  popularDesc: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.primary,
  },

  /* --- Rebook Styles --- */
  rebookContainer: {
    backgroundColor: theme.surfaceLowest,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.6)',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rebookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.4)',
  },
  rebookIcon: {
    width: 44,
    height: 44,
    backgroundColor: theme.surfaceLow,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rebookText: {
    flex: 1,
  },
  rebookTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.onSurface,
  },
  rebookSubtitle: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginTop: 2,
  },
  historyButton: {
    backgroundColor: theme.surfaceLow,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.onSurface,
  },

  /* --- Location Modal Styles --- */
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay || 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    color: theme.onSurface,
  },
  sheetRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(224, 227, 228, 0.6)',
  },
  sheetRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.onSurface,
  },
});