import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useGuestBrowse } from '../../context/GuestBrowseContext';
import { useCart } from '../../context/CartContext';
import { validateCoupon } from '../../services/couponService';
import { OptimizedImage } from '../../components/OptimizedImage';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';
import {
  getLineDisplayTitle,
  getLineSelectedSummaryText,
} from '../../utils/serviceVariations';

// Extracted Theme Colors
const theme = {
  primary: '#C45508',
  primaryContainer: '#ff7946',
  surface: '#f5f6f7',
  surfaceLowest: '#ffffff',
  surfaceLow: '#eff1f2',
  surfaceHigh: '#e0e3e4',
  surfaceVariant: '#dadddf',
  onSurface: '#2c2f30',
  onSurfaceVariant: '#595c5d',
  outlineVariant: '#abadae',
  error: '#b31b25',
  success: '#16a34a',
  successBg: '#dcfce7',
  successText: '#166534',
};

export function CartScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const navigation = useNavigation();
  const { user } = useAuth();
  const { promptLogin } = useGuestBrowse();

  // Active cart state from context
  const {
    items = [],
    setQuantity,
    totalDuration,
    appliedCoupon,
    setAppliedCoupon,
    servicesSubtotal,
    orderSubtotal,
    discountAmount,
    finalTotal,
    checkoutVisitingChargeTotal,
  } = useCart();
  const [promoCode, setPromoCode] = React.useState('');
  const [promoMessage, setPromoMessage] = React.useState('');
  const [promoError, setPromoError] = React.useState('');
  const [promoLoading, setPromoLoading] = React.useState(false);

  const hasItems = items.length > 0;

  const onApplyPromo = async () => {
    if (!hasItems) return;
    setPromoMessage('');
    setPromoError('');
    setPromoLoading(true);
    try {
      const result = await validateCoupon(promoCode, orderSubtotal, {
        customerId: user?.uid,
        categoryIds: items.map((l) => l.categoryId).filter(Boolean),
        serviceIds: items.map((l) => l.serviceId).filter(Boolean),
      });
      if (!result.valid) {
        setAppliedCoupon(null);
        setPromoError(result.message);
        return;
      }
      setAppliedCoupon(result);
      setPromoMessage(result.message);
    } catch (e) {
      setAppliedCoupon(null);
      setPromoError(e?.message || 'Could not apply promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const onRemovePromo = () => {
    setAppliedCoupon(null);
    setPromoMessage('');
    setPromoError('');
  };

  const handleBrowseServices = () => {
    navigation.navigate('MainTabs', { screen: 'Services' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Back Button Wrapper for Native Stack (Mobile mostly) */}
      {!isLargeScreen && (
        <View style={styles.mobileHeaderBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.heroTitle}>
              Service <Text style={styles.heroTitleHighlight}>Cart</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Review your selected services before booking.
            </Text>
          </View>
          {isLargeScreen && (
            <TouchableOpacity 
              style={styles.addMoreBtnLarge} 
              activeOpacity={0.7}
              onPress={handleBrowseServices}
            >
              <MaterialIcons name="add-circle" size={20} color={theme.primary} />
              <Text style={styles.addMoreBtnTextLarge}>Add more services</Text>
            </TouchableOpacity>
          )}
        </View>

        <SectionPromoBanner section="cart" />

        {/* Main Layout (Row on Desktop, Column on Mobile) */}
        <View style={[styles.mainLayout, isLargeScreen && styles.mainLayoutLarge]}>
          
          {/* Left Side: Cart Items */}
          <View style={[styles.cartItemsContainer, isLargeScreen && { flex: 7 }]}>
            
            {hasItems ? (
              items.map((line) => (
                <CartItemCard
                  key={line.lineId || line.serviceId}
                  imageUrl={line.imageUrl}
                  title={getLineDisplayTitle(line)}
                  subtitle={
                    getLineSelectedSummaryText(line) ||
                    (line.duration
                      ? `Duration: ${line.duration} mins`
                      : 'Standard Service')
                  }
                  price={line.price}
                  quantity={line.quantity}
                  onIncrease={() => setQuantity(line.lineId || line.serviceId, line.quantity + 1)}
                  onDecrease={() => setQuantity(line.lineId || line.serviceId, line.quantity - 1)}
                  onRemove={() => setQuantity(line.lineId || line.serviceId, 0)}
                />
              ))
            ) : (
              <View style={styles.emptyCart}>
                <MaterialIcons name="remove-shopping-cart" size={48} color={theme.surfaceHigh} />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
              </View>
            )}

            {!isLargeScreen && (
              <TouchableOpacity 
                style={styles.addMoreBtnMobile} 
                activeOpacity={0.7}
                onPress={handleBrowseServices}
              >
                <MaterialIcons name="add-circle" size={20} color={theme.onSurfaceVariant} />
                <Text style={styles.addMoreBtnTextMobile}>
                  {hasItems ? 'Add another service' : 'Browse services'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right Side: Payment Summary */}
          <View style={[styles.summaryContainer, isLargeScreen && { flex: 5 }]}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Payment Summary</Text>

              {/* Promo Code Input */}
              <View style={styles.promoRow}>
                <View style={styles.promoInputWrapper}>
                  <MaterialIcons name="local-offer" size={16} color={theme.outlineVariant} style={styles.promoIcon} />
                  <TextInput
                    style={styles.promoInput}
                    placeholder="Promo code"
                    placeholderTextColor={theme.outlineVariant}
                    editable={hasItems}
                    value={promoCode}
                    onChangeText={(v) => {
                      setPromoCode(v);
                      setPromoMessage('');
                      setPromoError('');
                      if (appliedCoupon) setAppliedCoupon(null);
                    }}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.promoApplyBtn,
                    (!hasItems || promoLoading) && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.7}
                  onPress={onApplyPromo}
                  disabled={!hasItems || promoLoading}
                >
                  <Text style={styles.promoApplyBtnText}>
                    {promoLoading ? '…' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
              {appliedCoupon?.valid && appliedCoupon?.code ? (
                <View style={styles.appliedCouponRow}>
                  <MaterialIcons name="check-circle" size={16} color={theme.success} />
                  <Text style={styles.appliedCouponText} numberOfLines={1}>
                    {appliedCoupon.code} applied
                  </Text>
                  <TouchableOpacity onPress={onRemovePromo} hitSlop={12}>
                    <Text style={styles.removeCouponText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {promoMessage && !appliedCoupon ? (
                <Text style={styles.promoOk}>{promoMessage}</Text>
              ) : null}
              {promoError ? <Text style={styles.promoErr}>{promoError}</Text> : null}

              {/* Price Breakdown */}
              <View style={styles.priceBreakdown}>
                <SummaryRow
                  label="Service price"
                  value={`₹${Math.round(servicesSubtotal)}`}
                />
                {checkoutVisitingChargeTotal > 0 ? (
                  <Text style={styles.checkoutNote}>
                    Visiting charges (₹{Math.round(checkoutVisitingChargeTotal)}) are added at
                    checkout.
                  </Text>
                ) : null}
                {totalDuration > 0 ? (
                  <SummaryRow
                    label="Estimated duration"
                    value={`${totalDuration} min`}
                  />
                ) : null}
                <View style={styles.summaryDividerThin} />
                <SummaryRow
                  label="Subtotal"
                  value={`₹${Math.round(orderSubtotal)}`}
                />
                {discountAmount > 0 ? (
                  <SummaryRow
                    label="Discount"
                    value={`-₹${Math.round(discountAmount)}`}
                    valueStyle={styles.discountValue}
                  />
                ) : null}
              </View>

              <View style={styles.summaryDivider} />

              {/* Grand Total */}
              <View style={styles.grandTotalSection}>
                <View>
                  <Text style={styles.grandTotalValue}>
                    ₹{Math.round(finalTotal)}
                  </Text>
                  <Text style={styles.grandTotalLabel}>Total payable</Text>
                </View>
                {discountAmount > 0 ? (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>
                      SAVE ₹{Math.round(discountAmount)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Checkout Button */}
              <TouchableOpacity 
                activeOpacity={0.8} 
                style={[styles.checkoutBtnWrapper, !hasItems && { opacity: 0.5 }]}
                disabled={!hasItems}
                onPress={() => {
                  if (!user) {
                    promptLogin({ name: 'Address' });
                    return;
                  }
                  navigation.navigate('Address');
                }}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryContainer]}
                  style={styles.checkoutBtn}
                >
                  <Text style={styles.checkoutBtnText}>
                  Select Address & Time • ₹{Math.round(finalTotal)}
                </Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Trust Badges */}
              <View style={styles.trustBadgesRow}>
                <View style={styles.trustBadge}>
                  <MaterialIcons name="verified" size={16} color={theme.onSurfaceVariant} style={{ opacity: 0.7 }} />
                  <Text style={styles.trustBadgeText}>Secure</Text>
                </View>
                <View style={styles.trustBadge}>
                  <MaterialIcons name="support-agent" size={16} color={theme.onSurfaceVariant} style={{ opacity: 0.7 }} />
                  <Text style={styles.trustBadgeText}>24/7 Support</Text>
                </View>
              </View>

            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const CartItemCard = ({
  imageUrl,
  title,
  subtitle,
  price,
  quantity,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const lineTotal = Math.round(Number(price) * Number(quantity));
  return (
  <View style={styles.cartItemCard}>
    <View style={styles.itemIconWrapper}>
      {imageUrl ? (
        <OptimizedImage
          uri={imageUrl}
          width={160}
          height={160}
          style={styles.itemImage}
          priority="normal"
        />
      ) : (
         <MaterialIcons name="home-repair-service" size={32} color={theme.primary} />
      )}
    </View>

    <View style={styles.itemContent}>
      <View style={styles.itemHeaderRow}>
        <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={onRemove} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <MaterialIcons name="delete" size={20} color={theme.outlineVariant} />
        </TouchableOpacity>
      </View>
      <Text style={styles.itemSubtitle}>{subtitle}</Text>

      <View style={styles.itemBottomRow}>
        <View style={styles.itemPriceCol}>
          <Text style={styles.itemPrice}>₹{lineTotal}</Text>
          {/* <Text style={styles.itemPriceHint}>
            (₹{Math.round(price)} × {quantity}
            {visitingCharge > 0 ? ` + ₹${Math.round(visitingCharge)} visit` : ''})
          </Text> */}
        </View>

        <View style={styles.qtyController}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease}>
            <MaterialIcons name="remove" size={16} color={theme.onSurface} />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease}>
            <MaterialIcons name="add" size={16} color={theme.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
  );
};

const SummaryRow = ({ label, value, valueStyle }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
  </View>
);

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  mobileHeaderBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: theme.surfaceLowest,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 120, // Tab bar clearance
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },

  /* --- Header --- */
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.onSurface,
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroTitleHighlight: {
    color: theme.primary,
  },
  heroSubtitle: {
    fontSize: 16,
    color: theme.onSurfaceVariant,
  },
  addMoreBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMoreBtnTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
  },

  /* --- Layout --- */
  mainLayout: {
    flexDirection: 'column',
    gap: 24,
  },
  mainLayoutLarge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 40,
  },

  /* --- Cart Items --- */
  cartItemsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  cartItemCard: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLowest,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.03,
    shadowRadius: 30,
    elevation: 3,
    gap: 16,
  },
  itemIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(165, 53, 0, 0.08)', // Primary 8% opacity
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemContent: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.onSurface,
    paddingRight: 12,
  },
  deleteBtn: {
    paddingTop: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    marginBottom: 6,
  },
  checkoutNote: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    lineHeight: 18,
    marginTop: -8,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPriceCol: {
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.primary,
  },
  itemPriceHint: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
  },
  qtyController: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    height: 36,
  },
  qtyBtn: {
    width: 36,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.onSurface,
    width: 24,
    textAlign: 'center',
  },
  emptyCart: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    color: theme.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 12,
  },
  addMoreBtnMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'rgba(171, 173, 174, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 16,
    marginTop: 8,
  },
  addMoreBtnTextMobile: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.onSurfaceVariant,
  },

  /* --- Payment Summary --- */
  summaryContainer: {
    width: '100%',
  },
  summaryCard: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 24,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  promoInputWrapper: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  promoInput: {
    flex: 1,
    height: 48,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingLeft: 36,
    paddingRight: 16,
    fontSize: 14,
    color: theme.onSurface,
  },
  promoApplyBtn: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: theme.surfaceHigh,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.onSurface,
  },
  appliedCouponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.successBg,
    borderRadius: 12,
  },
  appliedCouponText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.successText,
  },
  removeCouponText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primary,
  },
  priceBreakdown: {
    gap: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.onSurface,
  },
  discountValue: {
    color: theme.success,
    fontWeight: '800',
  },
  summaryDividerThin: {
    height: 1,
    backgroundColor: theme.surfaceHigh,
    marginVertical: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.surfaceHigh,
    marginBottom: 20,
  },
  grandTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.primary,
  },
  grandTotalLabel: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginTop: 2,
  },
  savingsBadge: {
    backgroundColor: theme.successBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.successText,
    letterSpacing: 1,
  },
  checkoutBtnWrapper: {
    width: '100%',
    marginBottom: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    opacity: 0.8,
  },
  promoOk: {
    color: theme.success,
    fontSize: 12,
    marginTop: -14,
    marginBottom: 12,
  },
  promoErr: {
    color: theme.error,
    fontSize: 12,
    marginTop: -14,
    marginBottom: 12,
  },
});