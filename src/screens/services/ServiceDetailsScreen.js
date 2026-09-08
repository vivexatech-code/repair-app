import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  StyleSheet,
  Text,
  Image,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
  Pressable,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";

import {
  fetchServiceById,
  fetchFaqs,
} from "../../services/serviceCatalogService";
import { useCart } from "../../context/CartContext";
import { ServiceDetailSkeleton } from "../../components/SkeletonLoader";
import { OptimizedImage } from "../../components/OptimizedImage";
import {
  getServicePriceListLabel,
  listNormalizedVariations,
  normalizeServiceVariation,
} from "../../utils/serviceVariations";
import { SectionPromoBanner } from "../../components/SectionPromoBanner";
import { resolveBannerSectionsForCategory } from "../../constants/bannerSections";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Local theme updated to warm earthy primary
const theme = {
  surface: "#ffffff",
  surfaceLowest: "#ffffff",
  surfaceHigh: "#e5e7eb",
  onSurface: "#1a1a1a",
  onSurfaceVariant: "#666666",
  primary: "#a53500",
  primaryContainer: "#D94A00",
  success: "#16a34a",
  error: "#dc2626",
};

export function ServiceDetailsScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const navigation = useNavigation();
  const route = useRoute();
  const rawServiceId = route?.params?.serviceId ?? route?.params?.id;
  const serviceId =
    rawServiceId != null && String(rawServiceId).trim() !== ''
      ? String(rawServiceId).trim()
      : '';
  const { addItem } = useCart();

  const [service, setService] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local state: package flow (no variations)
  const [cartCount, setCartCount] = useState(0);
  /** Per-variation quantities (variation id → qty). */
  const [variationQuantities, setVariationQuantities] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!serviceId) {
          if (mounted) {
            setService(null);
            setFaqs([]);
            setError("Invalid service");
            setLoading(false);
          }
          return;
        }
        setLoading(true);
        const [row, faqRows] = await Promise.all([
          fetchServiceById(serviceId),
          fetchFaqs().catch(() => []),
        ]);
        if (mounted) {
          if (row && String(row.status ?? '').trim() === 'Coming Soon') {
            setLoading(false);
            navigation.replace('ComingSoonService', { serviceId: row.id || serviceId });
            return;
          }
          setService(row);
          setFaqs(Array.isArray(faqRows) ? faqRows : []);
          setError(row ? "" : "Service not found");
        }
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  useEffect(() => {
    setVariationQuantities({});
    setCartCount(0);
  }, [serviceId]);

  const variations = useMemo(() => {
    if (!service?.id) return [];
    const raw = Array.isArray(service.variations) ? service.variations : [];
    return raw
      .map((v, i) => normalizeServiceVariation(v, i))
      .filter(Boolean);
  }, [service]);

  const hasVariationFlow = useMemo(
    () =>
      Boolean(service) &&
      service.hasVariations === true &&
      variations.length > 0,
    [service, variations.length],
  );

  const totalVariantUnits = useMemo(
    () =>
      Object.values(variationQuantities).reduce(
        (a, b) => a + (Math.round(Number(b)) || 0),
        0,
      ),
    [variationQuantities],
  );

  const totalVariantPrice = useMemo(
    () =>
      variations.reduce((sum, v) => {
        const vid = v?.id;
        if (vid == null || vid === "") return sum;
        return (
          sum +
          (Number(v.price) || 0) *
            (Math.round(Number(variationQuantities[vid]) || 0) || 0)
        );
      }, 0),
    [variations, variationQuantities],
  );

  const bannerSections = useMemo(
    () =>
      resolveBannerSectionsForCategory(
        {
          id: service?.categoryId || route?.params?.categoryId,
          categoryId: service?.categoryId || route?.params?.categoryId,
          name: service?.categoryName || route?.params?.categoryName,
          categoryName: service?.categoryName || route?.params?.categoryName,
          slug: service?.categorySlug,
          category: service?.category,
        },
        ["service_details"],
      ),
    [
      service?.categoryId,
      service?.categoryName,
      service?.categorySlug,
      service?.category,
      route?.params?.categoryId,
      route?.params?.categoryName,
    ],
  );

  const bumpVariationQty = useCallback((id, delta) => {
    setError("");
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setVariationQuantities((prev) => {
      const cur = Math.max(0, Math.round(Number(prev[id]) || 0));
      const next = cur + delta;
      if (next <= 0) {
        const nextMap = { ...prev };
        delete nextMap[id];
        return nextMap;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const handleDone = useCallback(() => {
    try {
      if (!service) return;

      if (
        service.hasVariations === true &&
        listNormalizedVariations(service).length > 0
      ) {
        const rows = variations
          .map((v) => {
            const vid = v?.id;
            if (vid == null || vid === "") return null;
            const q = Math.round(Number(variationQuantities[vid] || 0));
            if (q <= 0) return null;
            return {
              variationId: vid,
              title: v.title,
              price: v.price,
              quantity: q,
              ...(v.imageUrl ? { imageUrl: v.imageUrl } : {}),
            };
          })
          .filter(Boolean);
        if (rows.length === 0) {
          setError("Add at least one item to continue.");
          return;
        }
        setError("");
        addItem(service, 1, {
          selectedVariations: rows,
          categoryId: route?.params?.categoryId,
          categoryName: route?.params?.categoryName,
        });
        navigation.navigate("Cart");
        return;
      }

      if (cartCount <= 0) return;
      setError("");
      addItem(service, cartCount, {
        categoryId: route?.params?.categoryId,
        categoryName: route?.params?.categoryName,
      });
      navigation.navigate("Cart");
    } catch (e) {
      setError(e?.message || "Unable to add service to cart");
    }
  }, [
    service,
    variations,
    variationQuantities,
    cartCount,
    addItem,
    navigation,
    route?.params?.categoryId,
    route?.params?.categoryName,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.skeletonWrap}>
          <ServiceDetailSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={theme.onSurface}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={{ color: theme.error, fontSize: 16 }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bannerUri = service.detailImage || service.imageUrl || null;
  const points = Array.isArray(service.keyPoints) ? service.keyPoints : [];
  const processSteps = Array.isArray(service.processSteps)
    ? service.processSteps
    : [];
  const brands = Array.isArray(service.brands) ? service.brands : [];
  const basePrice = Number(service.price || 0);
  const listPriceLabel = getServicePriceListLabel(service);
  const lineEstimate = basePrice * cartCount;
  const rating = service.rating != null ? Number(service.rating) : null;
  const reviewCount =
    service.reviewCount != null ? Number(service.reviewCount) : null;
  const showRatingRow =
    (rating != null && !Number.isNaN(rating)) ||
    (reviewCount != null && !Number.isNaN(reviewCount));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={theme.onSurface}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {service.name || "Service Details"}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.inlineErrorBanner}>
          <MaterialIcons name="error-outline" size={18} color={theme.error} />
          <Text style={styles.inlineErrorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.mainLayout}>
        {/* Left Side: Scrollable Content */}
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                hasVariationFlow && totalVariantUnits > 0
                  ? 120
                  : !isLargeScreen && cartCount > 0 && !hasVariationFlow
                    ? 100
                    : 40,
            },
          ]}
          style={isLargeScreen ? { flex: 7 } : { flex: 1 }}
        >
          <SectionPromoBanner section={bannerSections} />

          {/* Hero — detailImage (Firestore / Cloudinary URL) */}
          <View style={styles.heroSection}>
            {bannerUri ? (
              <View style={styles.heroImageWrap}>
                <OptimizedImage
                  uri={bannerUri}
                  width={Math.min(width, 1200)}
                  height={520}
                  style={styles.heroImageFill}
                  contentFit="cover"
                  priority="high"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.72)"]}
                  style={styles.heroGradient}
                >
                  {service.badgeLabel ? (
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>
                        {String(service.badgeLabel)}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.heroTitle}>{service.name}</Text>
                  {service.description ? (
                    <Text style={styles.heroDesc} numberOfLines={2}>
                      {String(service.description)}
                    </Text>
                  ) : null}
                </LinearGradient>
              </View>
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <MaterialIcons
                  name="home-repair-service"
                  size={56}
                  color={theme.surfaceHigh}
                />
                <Text style={styles.heroPlaceholderTitle}>{service.name}</Text>
                {hasVariationFlow ? (
                  <Text style={styles.heroPlaceholderMeta}>{listPriceLabel}</Text>
                ) : null}
                {hasVariationFlow ? (
                  <Text style={styles.heroPlaceholderMeta}>
                    {variations.length} options available
                  </Text>
                ) : null}
                {service.description ? (
                  <Text style={styles.heroPlaceholderDesc} numberOfLines={3}>
                    {String(service.description)}
                  </Text>
                ) : null}
              </View>
            )}

            {showRatingRow ? (
              <View style={styles.heroStatsRow}>
                <View style={styles.statGroup}>
                  {rating != null && !Number.isNaN(rating) ? (
                    <View style={styles.ratingPill}>
                      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                      <MaterialIcons
                        name="star"
                        size={14}
                        color={theme.success}
                      />
                    </View>
                  ) : null}
                  {reviewCount != null && !Number.isNaN(reviewCount) ? (
                    <Text style={styles.reviewText}>
                      {reviewCount >= 1000
                        ? `${(reviewCount / 1000).toFixed(1)}k reviews`
                        : `${reviewCount} reviews`}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.statGroup}>
                  <MaterialIcons
                    name="verified-user"
                    size={18}
                    color={theme.onSurfaceVariant}
                  />
                  <Text style={styles.bookingText}>Verified Service</Text>
                </View>
              </View>
            ) : (
              <View style={styles.heroStatsRow}>
                <View style={styles.statGroup}>
                  <MaterialIcons
                    name="verified-user"
                    size={18}
                    color={theme.success}
                  />
                  <Text style={styles.bookingText}>Verified Service</Text>
                </View>
              </View>
            )}
          </View>

          {/* Value Propositions */}
          <View style={styles.valuePropsContainer}>
            <ValueProp icon="workspace-premium" label="Quality Assured" />
            <View style={styles.valuePropDivider} />
            <ValueProp icon="engineering" label="Trained Experts" />
            <View style={styles.valuePropDivider} />
            <ValueProp icon="inventory-2" label="Best Equipment" />
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>
            Select Service
            {hasVariationFlow ? ` · ${variations.length} options` : ""}
          </Text>

          {hasVariationFlow ? (
            <>
              <Text style={styles.variationSectionIntro}>
                Tap <Text style={styles.variationIntroBold}>Add</Text> on each
                package you need. Adjust quantities anytime.
              </Text>
              <View style={styles.skuList}>
                {variations
                  .filter(
                    (v) => v?.id != null && String(v.id) !== "",
                  )
                  .map((v) => (
                  <VariationSkuCard
                    key={String(v.id)}
                    item={v}
                    qty={Math.round(variationQuantities[String(v.id)] || 0)}
                    onAdd={() => bumpVariationQty(String(v.id), 1)}
                    onInc={() => bumpVariationQty(String(v.id), 1)}
                    onDec={() => bumpVariationQty(String(v.id), -1)}
                  />
                ))}
              </View>
              {points.length > 0 ? (
                <View style={styles.includesBox}>
                  <Text style={styles.includesTitle}>WHAT'S INCLUDED</Text>
                  {points.map((item, index) => (
                    <View key={index} style={styles.includeItem}>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color={theme.success}
                      />
                      <Text style={styles.includeItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <PackageCard
              title={service.name}
              duration={`${service.duration || 0} mins`}
              subtitle={service.description}
              price={
                basePrice > 0
                  ? String(Math.round(basePrice))
                  : listPriceLabel
              }
              visitingCharge={0}
              isBestseller={true}
              isAdded={cartCount > 0}
              cartCount={cartCount}
              onIncrease={() => setCartCount((c) => c + 1)}
              onDecrease={() => setCartCount((c) => (c > 0 ? c - 1 : 0))}
              includes={points}
            />
          )}

          {processSteps.length > 0 ? (
            <View style={styles.processSectionWrap}>
              <Text style={styles.sectionTitle}>Our process</Text>
              <View style={styles.timelineContainer}>
                {processSteps.map((step, index) => (
                  <ProcessStepCard
                    key={index}
                    step={step}
                    index={index}
                    isLast={index === processSteps.length - 1}
                  />
                ))}
              </View>
              <View style={styles.sectionDivider} />
            </View>
          ) : null}

          {brands.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>We service all brands</Text>

              <Image
                source={{ uri: service?.brands?.[0]?.logoImage }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <View style={styles.sectionDivider} />
            </>
          ) : null}

          {faqs.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Frequently asked questions
              </Text>
              <View style={styles.faqCard}>
                {faqs.map((item) => (
                  <FaqRow key={item.id} item={item} />
                ))}
              </View>
              <View style={styles.sectionDivider} />
            </>
          ) : null}
        </ScrollView>

        {/* Right Side: Desktop Cart Summary (single-package services only) */}
        {!hasVariationFlow && isLargeScreen && (
          <View style={styles.desktopCartContainer}>
            <View style={styles.desktopCart}>
              <Text style={styles.cartTitle}>Cart Summary</Text>

              {cartCount > 0 ? (
                <>
                  <View style={styles.cartItemRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.cartItemTitle}>{service.name}</Text>
                      <Text style={styles.cartItemQty}>
                        {cartCount} unit{cartCount > 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text style={styles.cartItemPrice}>
                      ₹{Math.round(lineEstimate)}
                    </Text>
                  </View>

                  <View style={styles.sectionDivider} />

                  <View style={styles.cartTotals}>
                    <View style={styles.cartTotalRow}>
                      <Text style={styles.cartTotalLabel}>Item total</Text>
                      <Text style={styles.cartTotalValue}>
                        ₹{Math.round(lineEstimate)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>
                      ₹{Math.round(lineEstimate)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.checkoutBtnWrapper}
                    onPress={handleDone}
                  >
                    <LinearGradient
                      colors={[theme.primary, theme.primaryContainer]}
                      style={styles.checkoutBtn}
                    >
                      <Text style={styles.checkoutBtnText}>View Cart</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color="#ffffff"
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyCart}>
                  <MaterialIcons
                    name="shopping-cart"
                    size={48}
                    color={theme.surfaceHigh}
                  />
                  <Text style={styles.emptyCartText}>
                    No services added yet
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Multi-option sticky bar (Urban-style) */}
      {hasVariationFlow && totalVariantUnits > 0 ? (
        <View style={styles.stickySelectionBar}>
          <View style={styles.stickySelectionInner}>
            <View style={styles.stickySelectionTextCol}>
              <Text style={styles.stickySelectionMeta}>
                {totalVariantUnits} item{totalVariantUnits !== 1 ? "s" : ""}
              </Text>
              <Text style={styles.stickySelectionTotal}>
                ₹{Math.round(totalVariantPrice)}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleDone}
              style={styles.stickyDoneTouchable}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stickyDoneGradient}
              >
                <Text style={styles.stickyDoneLabel}>Done</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Mobile: single-package cart bar */}
      {!hasVariationFlow && !isLargeScreen && cartCount > 0 ? (
        <View style={styles.mobileCartBar}>
          <View style={styles.mobileCartInfo}>
            <Text style={styles.mobileCartLabel}>
              {cartCount} unit{cartCount > 1 ? "s" : ""}
            </Text>
            <Text style={styles.mobileCartPrice}>
              ₹{Math.round(lineEstimate)}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={handleDone}>
            <LinearGradient
              colors={[theme.primary, theme.primaryContainer]}
              style={styles.mobileCheckoutBtn}
            >
              <Text style={styles.mobileCheckoutText}>View cart</Text>
              <MaterialIcons name="chevron-right" size={18} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const VariationSkuCard = memo(
  function VariationSkuCard({ item, qty, onAdd, onInc, onDec }) {
    const mrp = item.originalPrice;
    const showStrike =
      mrp != null &&
      Number(mrp) > Number(item.price) &&
      Number(item.price) >= 0;
    const hasRating =
      item.rating != null &&
      !Number.isNaN(Number(item.rating)) &&
      Number(item.rating) > 0;

    return (
      <View style={styles.skuCard}>
        <View style={styles.skuCardRow}>
          {/* 1. Square Image Layout */}
          {item.imageUrl ? (
            <OptimizedImage
              uri={item.imageUrl}
              width={100}
              height={100}
              borderRadius={15}
              style={styles.skuThumb}
              contentFit="cover"
              priority="normal"
            />
          ) : (
            <View style={styles.skuThumbPlaceholder}>
              <MaterialIcons
                name="home-repair-service"
                size={28}
                color={theme.surfaceHigh}
              />
            </View>
          )}

          {/* 2. Content Middle */}
          <View style={styles.skuCardBody}>
            <Text style={styles.skuTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            {hasRating ? (
              <View style={styles.skuRatingRow}>
                <MaterialIcons name="star" size={14} color={theme.success} />
                <Text style={styles.skuRatingText}>
                  {Number(item.rating).toFixed(1)}
                </Text>
              </View>
            ) : null}

            <View style={styles.skuPriceRow}>
              <Text style={styles.skuPriceNow}>₹{Math.round(item.price)}</Text>
              {showStrike ? (
                <Text style={styles.skuPriceWas}>₹{Math.round(mrp)}</Text>
              ) : null}
            </View>
          </View>

          {/* 3. Action Right */}
          <View style={styles.skuAction}>
            {qty <= 0 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onAdd}
                style={styles.skuAddBtn}
              >
                <Text style={styles.skuAddBtnText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.skuStepper}>
                <TouchableOpacity style={styles.skuStepBtn} onPress={onDec}>
                  <MaterialIcons name="remove" size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.skuStepVal}>{qty}</Text>
                <TouchableOpacity style={styles.skuStepBtn} onPress={onInc}>
                  <MaterialIcons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.qty === next.qty &&
    prev.item.price === next.item.price &&
    prev.item.title === next.item.title &&
    prev.item.rating === next.item.rating &&
    prev.item.originalPrice === next.item.originalPrice &&
    prev.item.imageUrl === next.item.imageUrl,
);


/** Treat null, empty strings, bogus tokens, and non-loadable URIs as "no image". */
function normalizeProcessStepImageUri(raw) {
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return null;
  }
  try {
    if (/^\/\//.test(s)) {
      const u = new URL(`https:${s}`);
      return u.href;
    }
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return u.href;
    }
    if (/^file:\/\//i.test(s) || /^content:\/\//i.test(s)) {
      return s;
    }
    if (/^data:image\//i.test(s)) {
      return s;
    }
  } catch {
    return null;
  }
  return null;
}

function ProcessStepImageCard({ uri, onLoadError }) {
  const reportedRef = useRef(false);

  useEffect(() => {
    reportedRef.current = false;
  }, [uri]);

  return (
    <View style={styles.timelineImageWrap}>
      <OptimizedImage
        uri={uri}
        width={400}
        height={180}
        style={styles.timelineImage}
        contentFit="cover"
        recyclingKey={uri}
        onError={() => {
          if (reportedRef.current) return;
          reportedRef.current = true;
          onLoadError?.();
        }}
      />
    </View>
  );
}

function ProcessStepCard({ step, index, isLast }) {
  const title = String(step?.title || "").trim();
  const description = String(step?.description || "").trim();
  const rawImage = step?.image ?? step?.imageUrl;
  const validatedUri = useMemo(
    () => normalizeProcessStepImageUri(rawImage),
    [rawImage],
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [validatedUri]);

  const showImage = validatedUri != null && !imageFailed;
  const hasText = !!(title || description);

  // Subtle entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim, index]);

  if (!hasText && validatedUri == null) return null;
  if (!hasText && imageFailed) return null;

  return (
    <Animated.View
      style={[
        styles.timelineRow,
        { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
      ]}
    >
      {/* Left: Timeline Graphic (Circle + Line) */}
      <View style={styles.timelineLeft}>
        <View style={styles.timelineCircle}>
          <Text style={styles.timelineNumber}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Right: Content — image-first card when URL is valid & loading succeeds */}
      <View
        style={[
          styles.timelineContent,
          isLast
            ? styles.timelineContentLast
            : !showImage
              ? styles.timelineContentTextOnly
              : null,
        ]}
      >
        {showImage ? (
          <ProcessStepImageCard
            uri={validatedUri}
            onLoadError={() => setImageFailed(true)}
          />
        ) : null}

        {title ? (
          <Text
            style={[
              styles.timelineTitle,
              showImage ? styles.timelineTitleBelowImage : null,
            ]}
          >
            {title}
          </Text>
        ) : null}

        {description ? (
          <Text
            style={[
              styles.timelineDesc,
              showImage ? null : styles.timelineDescTextOnly,
            ]}
            numberOfLines={3}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

function BrandLogoItem({ brand }) {
  const name = String(brand?.name || "").trim();
  const logo = brand?.logoImage || brand?.logoUrl;
  return (
    <View style={styles.brandPill}>
      {logo ? (
        <OptimizedImage
          uri={String(logo)}
          width={128}
          height={80}
          style={styles.brandLogo}
          contentFit="contain"
        />
      ) : (
        <View style={styles.brandLogoFallback}>
          <Text style={styles.brandInitial}>
            {name ? name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
      )}
      {name ? (
        <Text style={styles.brandName} numberOfLines={2}>
          {name}
        </Text>
      ) : null}
    </View>
  );
}

function FaqRow({ item }) {
  const [open, setOpen] = useState(false);
  const q = String(item?.question || item?.title || "").trim();
  const a = String(item?.answer || item?.body || "").trim();
  if (!q) return null;
  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((o) => !o);
      }}
      style={({ pressed }) => [styles.faqRow, pressed && styles.faqRowPressed]}
    >
      <View style={styles.faqRowHeader}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <MaterialIcons
          name={open ? "expand-less" : "expand-more"}
          size={24}
          color={theme.onSurfaceVariant}
        />
      </View>
      {open && a ? <Text style={styles.faqAnswer}>{a}</Text> : null}
    </Pressable>
  );
}

const ValueProp = ({ icon, label }) => (
  <View style={styles.valueProp}>
    <View style={styles.valuePropIcon}>
      <MaterialIcons name={icon} size={20} color={theme.primary} />
    </View>
    <Text style={styles.valuePropText}>{label}</Text>
  </View>
);

const PackageCard = ({
  title,
  duration,
  subtitle,
  price,
  visitingCharge = 0,
  originalPrice,
  isBestseller,
  isAdded,
  cartCount,
  onIncrease,
  onDecrease,
  includes,
}) => {
  const priceRaw = String(price ?? "").trim();
  const isPlainNumber = /^\d+(\.\d+)?$/.test(priceRaw);
  return (
  <View
    style={[styles.packageCard, isBestseller && styles.packageCardBestseller]}
  >
    {isBestseller && (
      <View style={styles.bestsellerTag}>
        <Text style={styles.bestsellerTagText}>RECOMMENDED</Text>
      </View>
    )}

    <View style={styles.packageHeader}>
      <View style={styles.packageInfo}>
        <Text style={styles.packageTitle}>{title}</Text>
        <View style={styles.packageMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons
              name="schedule"
              size={14}
              color={theme.onSurfaceVariant}
            />
            <Text style={styles.metaText}>{duration}</Text>
          </View>
        </View>
        {subtitle ? (
          <Text style={styles.packageSubtitle}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={styles.packageActionArea}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            {isPlainNumber ? `₹${priceRaw}` : priceRaw}
          </Text>
          {/* {visitingCharge > 0 ? (
            <Text style={styles.visitingChargeText}>
              + ₹{Math.round(visitingCharge)} visiting (once)
            </Text>
          ) : null} */}
          {originalPrice && (
            <Text style={styles.originalPriceText}>₹{originalPrice}</Text>
          )}
        </View>

        {isAdded && cartCount !== undefined ? (
          <View style={styles.counterControl}>
            <TouchableOpacity style={styles.counterBtn} onPress={onDecrease}>
              <MaterialIcons name="remove" size={18} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{cartCount}</Text>
            <TouchableOpacity style={styles.counterBtn} onPress={onIncrease}>
              <MaterialIcons name="add" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={onIncrease}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>

    {includes && includes.length > 0 && (
      <View style={styles.includesBox}>
        <Text style={styles.includesTitle}>WHAT'S INCLUDED</Text>
        {includes.map((item, index) => (
          <View key={index} style={styles.includeItem}>
            <MaterialIcons
              name="check-circle"
              size={18}
              color={theme.success}
            />
            <Text style={styles.includeItemText}>{item}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonWrap: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 72,
    backgroundColor: "rgba(245, 246, 247, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 227, 228, 0.5)",
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.onSurface,
    flexShrink: 1,
  },
  inlineErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 13,
    color: theme.error,
    fontWeight: "600",
  },
  variationHint: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    marginBottom: 16,
    lineHeight: 18,
  },
  variationCheckbox: {
    paddingLeft: 10,
    paddingRight: 4,
    justifyContent: "center",
  },
  variationList: {
    gap: 12,
    marginBottom: 20,
  },
  variationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(224, 227, 228, 0.8)",
    overflow: "hidden",
    paddingRight: 12,
  },
  variationCardSelected: {
    borderColor: theme.primary,
    backgroundColor: "rgba(165, 53, 0, 0.06)",
  },
  variationMedia: {
    width: 96,
    height: 88,
    backgroundColor: theme.surfaceHigh,
  },
  variationImage: {
    width: "100%",
    height: "100%",
  },
  variationImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  variationBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  variationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.onSurface,
    marginBottom: 4,
  },
  variationPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.primary,
  },
  variationCheck: {
    marginLeft: 4,
  },
  variationQtySection: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.6)",
  },
  variationQtyHeader: {
    marginBottom: 12,
  },
  variationQtyLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.onSurface,
  },
  variationQtySub: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginTop: 4,
  },
  variationCounter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.primary,
    borderRadius: 12,
    overflow: "hidden",
    height: 40,
  },
  variationCounterBtn: {
    width: 40,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  variationCounterValue: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    width: 28,
    textAlign: "center",
  },
  variationSelectedPreview: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.6)",
  },
  variationSelectedLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.onSurfaceVariant,
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  variationSelectedRow: {
    fontSize: 13,
    color: theme.onSurface,
    marginBottom: 4,
    lineHeight: 18,
  },
  variationSelectPrompt: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    fontStyle: "italic",
    marginBottom: 16,
  },
  variationSectionIntro: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  variationIntroBold: {
    fontWeight: "800",
    color: theme.onSurface,
  },
  skuList: {
    gap: 16,
    marginBottom: 8,
  },
  skuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16, // Increased padding for premium feel
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.4)", // Very subtle border
  },
  skuCardRow: {
    flexDirection: "row",
    alignItems: "center", // Vertically centers image, content, and button
    gap: 16, // Better breathing room between elements
  },
  skuThumb: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: theme.surfaceHigh,
  },
  skuThumbPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  skuCardBody: {
    flex: 1,
    justifyContent: "center",
  },
  skuTitle: {
    fontSize: 16,
    fontWeight: "700", // Bold but not overly heavy
    color: theme.onSurface,
    marginBottom: 6,
    lineHeight: 22,
  },
  skuRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  skuRatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.onSurfaceVariant, // Subtle grey for rating text
  },
  skuPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  skuPriceNow: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.onSurface, // Changed to dark text per requirement
  },
  skuPriceWas: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.onSurfaceVariant,
    textDecorationLine: "line-through",
  },
  skuAction: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 80, // Prevents layout jump when switching between Add and Stepper
  },
  skuAddBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: "rgba(165, 53, 0, 0.05)", // Light tint of primary color
  },
  skuAddBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.primary,
  },
  skuStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary,
    borderRadius: 8, // Soft pill shape to match the Add button
    height: 36,
  },
  skuStepBtn: {
    width: 32,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  skuStepVal: {
    minWidth: 24,
    textAlign: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
    maxWidth: 1280,
    alignSelf: "center",
    width: "100%",
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroImageWrap: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  heroImageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: "100%",
    height: 260,
    borderRadius: 32,
    marginBottom: 16,
    overflow: "hidden",
  },
  heroPlaceholder: {
    backgroundColor: theme.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heroPlaceholderTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "800",
    color: theme.onSurfaceVariant,
    textAlign: "center",
  },
  heroPlaceholderMeta: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: theme.primary,
    textAlign: "center",
  },
  heroPlaceholderDesc: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: theme.onSurfaceVariant,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  heroBadge: {
    backgroundColor: "rgba(165, 53, 0, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
  },
  heroPriceRange: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroOptionCount: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
  },
  heroDesc: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "rgba(255,255,255,0.92)",
    maxWidth: "100%",
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  statGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    color: theme.success,
    fontSize: 14,
    fontWeight: "bold",
  },
  reviewText: {
    color: theme.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  bookingText: {
    color: theme.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "500",
  },
  valuePropsContainer: {
    flexDirection: "row",
    backgroundColor: theme.surfaceLowest,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueProp: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  valuePropIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(165, 53, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  valuePropText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.onSurface,
    textAlign: "center",
  },
  valuePropDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.surfaceHigh,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.surfaceHigh,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.onSurface,
    marginBottom: 20,
  },

  // --- New Process Timeline Styles ---
  processSectionWrap: {
    marginTop: 16,
  },
  timelineContainer: {
    paddingTop: 8,
    paddingRight: 4,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timelineLeft: {
    width: 44,
    alignItems: "center",
    position: "relative",
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  timelineNumber: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
  },
  timelineLine: {
    position: "absolute",
    top: 28,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(224, 227, 228, 0.8)",
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 36,
    paddingLeft: 4,
  },
  timelineContentLast: {
    paddingBottom: 8,
  },
  timelineContentTextOnly: {
    paddingBottom: 28,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.onSurface,
    marginBottom: 6,
    lineHeight: 24,
  },
  timelineTitleBelowImage: {
    marginTop: 4,
  },
  timelineDesc: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 8,
  },
  timelineDescTextOnly: {
    marginBottom: 4,
  },
  timelineImageWrap: {
    width: "100%",
    height: 180,
    marginBottom: 14,
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  timelineImage: {
    width: "100%",
    height: "100%",
  },

  // --- Remainder of Styles ---
  brandsScroll: {
    width: "100%",
    gap: 16,
    paddingHorizontal: 0,
  },
  brandPill: {
    width: "100%",
    alignItems: "center",
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.6)",
  },
  brandLogo: {
    width: "100%",
    height: 300,
  },
  brandLogoFallback: {
    width: 64,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(196, 85, 8, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brandInitial: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.primary,
  },
  brandName: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.onSurface,
    textAlign: "center",
    lineHeight: 14,
  },
  faqCard: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.6)",
    overflow: "hidden",
    marginBottom: 8,
  },
  faqRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceHigh,
  },
  faqRowPressed: {
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  faqRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: theme.onSurface,
    lineHeight: 22,
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 14,
    color: theme.onSurfaceVariant,
    lineHeight: 22,
  },
  packageCard: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  packageCardBestseller: {
    borderColor: "rgba(165, 53, 0, 0.3)",
    shadowColor: theme.primary,
    shadowOpacity: 0.05,
  },
  bestsellerTag: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 16,
  },
  bestsellerTagText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
  },
  packageInfo: {
    flex: 1,
    paddingRight: 16,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.onSurface,
    marginBottom: 6,
  },
  packageSubtitle: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 18,
  },
  packageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.onSurfaceVariant,
  },
  packageActionArea: {
    alignItems: "flex-end",
    gap: 12,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.onSurface,
  },
  visitingChargeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.success,
    marginTop: 2,
  },
  originalPriceText: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    textDecorationLine: "line-through",
  },
  addButton: {
    backgroundColor: theme.surfaceLowest,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  addButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  counterControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary,
    borderRadius: 12,
    height: 40,
    overflow: "hidden",
  },
  counterBtn: {
    width: 40,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    width: 20,
    textAlign: "center",
  },
  includesBox: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  includesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.onSurface,
    letterSpacing: 1,
    marginBottom: 12,
  },
  includeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  includeItemText: {
    flex: 1,
    fontSize: 13,
    color: theme.onSurfaceVariant,
    lineHeight: 18,
  },
  desktopCartContainer: {
    flex: 4,
    paddingRight: 20,
    paddingTop: 24,
  },
  desktopCart: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: 4,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.onSurface,
    marginBottom: 24,
  },
  cartItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cartItemTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.onSurface,
  },
  cartItemQty: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginTop: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.onSurface,
  },
  cartTotals: {
    gap: 12,
    marginBottom: 24,
  },
  cartTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cartTotalLabel: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
  },
  cartTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.onSurface,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.onSurface,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.primary,
  },
  checkoutBtnWrapper: {
    width: "100%",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  checkoutBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCartText: {
    color: theme.onSurfaceVariant,
    fontWeight: "500",
    marginTop: 12,
  },
  stickySelectionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: "rgba(224, 227, 228, 0.9)",
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 24,
  },
  stickySelectionInner: {
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stickySelectionTextCol: {
    flex: 1,
  },
  stickySelectionMeta: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stickySelectionTotal: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.primary,
    marginTop: 2,
  },
  stickyDoneTouchable: {
    borderRadius: 14,
    overflow: "hidden",
  },
  stickyDoneGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  stickyDoneLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  mobileCartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.surfaceLowest,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceHigh,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
  },
  mobileCartInfo: {
    flexDirection: "column",
  },
  mobileCartLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mobileCartPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.primary,
  },
  mobileCheckoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  mobileCheckoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
