import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../hooks/useCategories";
import { useActiveServices } from "../../hooks/useActiveServices";
import { useBookings } from "../../context/BookingsContext";
import { useLocationContext } from "../../context/LocationContext";
import { subscribeCustomerProfile } from "../../services/customerService";
import { savedAddressLabel } from "../../utils/address";
import { FadeInContent, SkeletonLoader } from "../../components/SkeletonLoader";
import { subscribeOfferBanners, subscribeComingSoonServices } from "../../services/serviceCatalogService";
import { subscribeGeneralSettings } from "../../services/generalSettingsService";
import { subscribeHomeSections } from "../../services/homeSectionsService";
import { ScreenContainer } from "../../components/ScreenContainer";
import { HomeOfferCarousel } from "../../components/home/HomeOfferCarousel";
import { HomePremiumSections } from "../../components/home/HomePremiumSections";
import { homeTheme, homeLayout, homeCardShadow } from "../../components/home/homeTheme";
import { BookingApprovalBanner } from "../../components/BookingApprovalBanner";
import { BookingPaymentHomeBanner } from "../../components/BookingPaymentHomeBanner";
import { useRotatingSearchPlaceholder } from "../../hooks/useRotatingSearchPlaceholder";

const QUICK_ACTIONS = [
  { id: "services", icon: "apps", label: "All Services", screen: "Services" },
  { id: "bookings", icon: "event-note", label: "Bookings", screen: "Bookings" },
  { id: "cart", icon: "shopping-cart", label: "Cart", screen: "Cart" },
  { id: "account", icon: "person", label: "Account", screen: "Account" },
];

function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { user, customer } = useAuth();
  const { categories, loading, refresh } = useCategories();
  const { services, loading: servicesLoading, refresh: refreshServices } = useActiveServices();
  const { bookings } = useBookings();
  const {
    locationLabel,
    loading: locationLoading,
    permissionStatus,
    refreshLocation,
    setManualLocation,
  } = useLocationContext();

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchPlaceholder = useRotatingSearchPlaceholder(
    searchFocused || Boolean(query.trim()),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [offers, setOffers] = useState([]);
  const [homeReviews, setHomeReviews] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [cmsSections, setCmsSections] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setSavedList([]);
      return undefined;
    }
    const unsub = subscribeCustomerProfile(
      user.uid,
      (data) => {
        const list = Array.isArray(data?.addresses) ? data.addresses : [];
        setSavedList(list.filter(Boolean));
      },
      () => setSavedList([]),
    );
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    const unsub = subscribeOfferBanners(
      (rows) => {
        setOffers(Array.isArray(rows) ? rows : []);
        setBannersLoading(false);
      },
      () => {
        setOffers([]);
        setBannersLoading(false);
      },
      { section: null },
    );
    return () => unsub?.();
  }, []);

  const homeCarouselOffers = useMemo(
    () =>
      (offers || []).filter(
        (o) => o.section === 'home' || o.section === 'offers' || !o.section,
      ),
    [offers],
  );

  const bannersFor = useCallback(
    (section) => (offers || []).filter((o) => o.section === section),
    [offers],
  );

  useEffect(() => {
    const unsub = subscribeComingSoonServices(
      (rows) => setComingSoon(Array.isArray(rows) ? rows : []),
      () => setComingSoon([]),
    );
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = subscribeHomeSections(
      (rows) => setCmsSections(Array.isArray(rows) ? rows : []),
      () => setCmsSections([]),
      { platform: "app" },
    );
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = subscribeGeneralSettings(
      (settings) => {
        setHomeReviews(Array.isArray(settings?.homeReviews) ? settings.homeReviews : []);
      },
      () => setHomeReviews([]),
    );
    return () => unsub?.();
  }, []);

  const refreshing = loading || servicesLoading;

  const onPullRefresh = useCallback(() => {
    refresh();
    refreshServices();
  }, [refresh, refreshServices]);

  const firstName = useMemo(() => {
    const raw = String(customer?.name ?? "").trim();
    if (!raw) return null;
    return raw.split(/\s+/)[0];
  }, [customer?.name]);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const hasLocationLabel = useMemo(() => {
    const label = String(locationLabel ?? "").trim();
    return Boolean(label && label !== "Set your service location");
  }, [locationLabel]);

  const showLocationSkeleton = locationLoading && !hasLocationLabel;

  const openCategory = (item) => {
    navigation.navigate("CategoryServices", {
      categoryId: item?.id,
      categoryName: item?.name,
    });
  };

  const pickLocation = (value) => {
    if (value && typeof value === 'object') {
      setManualLocation(value);
    } else {
      setManualLocation(String(value || ''));
    }
    setLocationOpen(false);
  };

  const navigateToOffer = useCallback(
    (screen, params) => {
      if (params !== undefined) navigation.navigate(screen, params);
      else navigation.navigate(screen);
    },
    [navigation],
  );

  const applyCategoryFilter = (id) => {
    setFilterCategoryId(id);
    setFilterOpen(false);
  };

  const onQuickAction = (action) => {
    if (action.screen === "Account") {
      navigation.navigate("MainTabs", { screen: "Account" });
      return;
    }
    navigation.navigate(action.screen);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenContainer style={styles.screenInner}>
        <StatusBar barStyle="dark-content" backgroundColor={homeTheme.bg} />

        {/* Header */}
        <LinearGradient colors={homeTheme.heroGradient} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.locationContainer}
              onPress={() => setLocationOpen(true)}
              activeOpacity={0.75}
            >
              <View style={styles.locationIconBg}>
                <MaterialIcons name="location-on" size={20} color={homeTheme.primary} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>SERVICE LOCATION</Text>
                <View style={styles.locationRow}>
                  {showLocationSkeleton ? (
                    <SkeletonLoader
                      height={16}
                      width={Math.min(140, width * 0.38)}
                      borderRadius={6}
                    />
                  ) : (
                    <Text style={styles.locationCity} numberOfLines={1}>
                      {String(locationLabel ?? "").trim() || "Set your location"}
                    </Text>
                  )}
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={18}
                    color={homeTheme.textSecondary}
                  />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("Cart")}
              activeOpacity={0.75}
            >
              <MaterialIcons name="shopping-cart" size={22} color={homeTheme.text} />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.hero}>
            <Text style={styles.greeting}>
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </Text>
            <Text style={styles.heroSub}>
              What can we fix for you today?
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={22} color={homeTheme.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={
                  searchFocused || query.trim()
                    ? "Search services..."
                    : searchPlaceholder
                }
                placeholderTextColor={homeTheme.textMuted}
                returnKeyType="search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onSubmitEditing={() => {
                  const q = query.trim();
                  if (q) navigation.navigate("SearchResults", { query: q });
                }}
              />
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              activeOpacity={0.85}
              onPress={() => setFilterOpen(true)}
              accessibilityLabel="Filter by category"
            >
              <MaterialIcons name="tune" size={20} color="#fff" />
              {filterCategoryId ? <View style={styles.filterDot} /> : null}
            </TouchableOpacity>
          </View>

          {/* Quick actions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickChip}
                onPress={() => onQuickAction(action)}
                activeOpacity={0.8}
              >
                <View style={styles.quickIconWrap}>
                  <MaterialIcons name={action.icon} size={18} color={homeTheme.primary} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* Location sheet */}
        <Modal visible={locationOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
            <Pressable style={styles.modalBackdrop} onPress={() => setLocationOpen(false)} />
            <View style={[styles.sheet, Platform.OS === 'web' && styles.sheetWeb]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Choose location</Text>
              <View style={styles.sheetContent}>
                <Pressable
                  style={styles.sheetRow}
                  onPress={async () => {
                    try {
                      await refreshLocation();
                    } catch {
                      /* permission edge cases */
                    }
                    setLocationOpen(false);
                  }}
                >
                  <MaterialIcons name="my-location" size={22} color={homeTheme.primary} />
                  <Text style={[styles.sheetRowText, { color: homeTheme.primary }]}>
                    {permissionStatus === "granted"
                      ? "Use current location"
                      : "Enable current location"}
                  </Text>
                </Pressable>
                {savedList.map((item, idx) => {
                  const label =
                    typeof item === 'string' ? item : savedAddressLabel(item);
                  if (!label) return null;
                  return (
                    <Pressable
                      key={item?.id || `${idx}-${label}`}
                      style={styles.sheetRow}
                      onPress={() => pickLocation(item)}
                    >
                      <MaterialIcons name="place" size={22} color={homeTheme.textSecondary} />
                      <Text style={styles.sheetRowText} numberOfLines={2}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Filter sheet */}
        <Modal visible={filterOpen} transparent animationType="slide">
          <View style={styles.modalBg}>
            <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)} />
            <View style={[styles.sheet, Platform.OS === 'web' && styles.sheetWeb]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitle}>Filter by category</Text>
                {filterCategoryId ? (
                  <TouchableOpacity onPress={() => applyCategoryFilter(null)}>
                    <Text style={styles.clearFilter}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                <Pressable style={styles.sheetRow} onPress={() => applyCategoryFilter(null)}>
                  <MaterialIcons
                    name="apps"
                    size={22}
                    color={filterCategoryId === null ? homeTheme.primary : homeTheme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sheetRowText,
                      filterCategoryId === null && styles.sheetRowActive,
                    ]}
                  >
                    All categories
                  </Text>
                  {filterCategoryId === null ? (
                    <MaterialIcons name="check" size={20} color={homeTheme.primary} />
                  ) : null}
                </Pressable>
                {categories?.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={styles.sheetRow}
                    onPress={() => applyCategoryFilter(cat.id)}
                  >
                    <MaterialIcons
                      name="label-outline"
                      size={22}
                      color={filterCategoryId === cat.id ? homeTheme.primary : homeTheme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sheetRowText,
                        filterCategoryId === cat.id && styles.sheetRowActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {filterCategoryId === cat.id ? (
                      <MaterialIcons name="check" size={20} color={homeTheme.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={homeTheme.primary}
              colors={[homeTheme.primary]}
            />
          }
        >
          <BookingPaymentHomeBanner
            bookings={bookings}
            navigation={navigation}
            style={styles.bannerPad}
          />
          <BookingApprovalBanner
            bookings={bookings}
            navigation={navigation}
            style={styles.bannerPad}
          />

          {bannersLoading ? (
            <View style={styles.bannerSkeleton}>
              <SkeletonLoader height={188} borderRadius={20} />
            </View>
          ) : homeCarouselOffers.length > 0 ? (
            <FadeInContent visible style={styles.carouselWrap}>
              <HomeOfferCarousel
                offers={homeCarouselOffers}
                width={width}
                onOfferNavigate={navigateToOffer}
              />
            </FadeInContent>
          ) : null}

          <HomePremiumSections
            loading={loading || servicesLoading}
            cmsSections={cmsSections}
            categories={
              filterCategoryId
                ? (categories || []).filter((c) => c.id === filterCategoryId)
                : categories
            }
            services={
              filterCategoryId
                ? (services || []).filter((s) => s.categoryId === filterCategoryId)
                : services
            }
            comingSoon={comingSoon}
            reviews={homeReviews}
            width={width}
            sectionBanners={{
              categories: bannersFor("categories"),
              coming_soon: bannersFor("coming_soon"),
              coming_soon_main: bannersFor("coming_soon_main"),
              coming_soon_commercial: bannersFor("coming_soon_commercial"),
              featured: bannersFor("featured"),
              popular_services: bannersFor("popular_services"),
            }}
            onOfferNavigate={navigateToOffer}
            onCategoryPress={openCategory}
            onServicePress={(svc) => {
              const cat = (categories || []).find((c) => c.id === svc?.categoryId);
              navigation.navigate("ServiceDetails", {
                serviceId: svc.id,
                categoryId: svc?.categoryId || cat?.id,
                categoryName: cat?.name,
              });
            }}
            onBookPress={() => navigation.navigate("Services")}
            onSeeAllCategories={() => navigation.navigate("Services")}
            onSeeAllServices={() => navigation.navigate("Services")}
            onComingSoonPress={(svc) =>
              navigation.navigate("ComingSoonService", { serviceId: svc.id })
            }
            onViewAllPath={(path) => {
              const p = String(path || "").trim();
              if (!p) return;
              if (p === "/categories" || p === "categories") {
                navigation.navigate("Services");
                return;
              }
              if (p === "/services" || p === "services") {
                navigation.navigate("Services");
                return;
              }
              if (p.startsWith("http")) return;
              navigation.navigate("Services");
            }}
          />
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: homeTheme.bg },
  screenInner: { flex: 1, backgroundColor: homeTheme.bg },
  scrollContent: { paddingBottom: 100 },

  headerGradient: {
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: homeTheme.borderLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: homeLayout.pad,
    paddingTop: 8,
    paddingBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  locationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: homeTheme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationTextContainer: { flex: 1 },
  locationLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: homeTheme.primary,
    letterSpacing: 0.6,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  locationCity: {
    fontSize: 15,
    fontWeight: "800",
    color: homeTheme.text,
    flexShrink: 1,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: homeTheme.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(1),
  },

  hero: {
    paddingHorizontal: homeLayout.pad,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: homeTheme.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 15,
    color: homeTheme.textSecondary,
    marginTop: 6,
    fontWeight: "500",
  },

  searchRow: {
    flexDirection: "row",
    paddingHorizontal: homeLayout.pad,
    gap: 10,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: homeTheme.surface,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(1),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: homeTheme.text,
    fontWeight: "500",
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: homeTheme.text,
    alignItems: "center",
    justifyContent: "center",
  },
  filterDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: homeTheme.primary,
    borderWidth: 1.5,
    borderColor: homeTheme.text,
  },

  quickRow: {
    paddingHorizontal: homeLayout.pad,
    paddingBottom: 16,
    gap: 10,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: homeTheme.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    gap: 8,
    ...homeCardShadow(1),
  },
  quickIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: homeTheme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "700", color: homeTheme.text },

  bannerPad: { marginHorizontal: homeLayout.pad, marginTop: 12 },
  bannerSkeleton: { marginHorizontal: homeLayout.pad, marginTop: 16, marginBottom: 8 },
  carouselWrap: { marginTop: 8 },

  modalBg: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: homeTheme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "80%",
  },
  sheetWeb: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 28,
    marginBottom: 24,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: homeTheme.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: homeTheme.text,
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clearFilter: { fontSize: 14, fontWeight: "700", color: homeTheme.primary },
  sheetContent: {
    backgroundColor: homeTheme.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 4,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: homeTheme.borderLight,
  },
  sheetRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: homeTheme.text,
  },
  sheetRowActive: { color: homeTheme.primary, fontWeight: "700" },
});
