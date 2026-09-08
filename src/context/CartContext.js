import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getOrderPricing } from '../utils/orderPricing';
import {
  buildCartLineIdFromSelections,
  dedupeCartVariations,
  listNormalizedVariations,
  normalizeServiceVariation,
  toCartVariationRow,
} from '../utils/serviceVariations';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const addItem = useCallback((service, quantity = 1, extra = {}) => {
    if (!service?.id) {
      throw new Error('Invalid service');
    }
    const hasVar = service.hasVariations === true;
    const variations = listNormalizedVariations(service);
    const hasCatalogVariations = hasVar && variations.length > 0;

    let selections = [];
    if (Array.isArray(extra.selectedVariations) && extra.selectedVariations.length) {
      selections = dedupeCartVariations(extra.selectedVariations);
    } else if (extra.selectedVariation) {
      const v = normalizeServiceVariation(extra.selectedVariation, 0);
      if (v) {
        selections = dedupeCartVariations([
          toCartVariationRow({
            variationId: v.id,
            title: v.title,
            price: v.price,
            imageUrl: v.imageUrl,
          }),
        ]);
      }
    }

    if (hasCatalogVariations && selections.length === 0) {
      throw new Error('Please select at least one service option.');
    }

    if (hasCatalogVariations && selections.length > 0) {
      const allowed = new Set(variations.map((v) => v.id));
      selections = selections.filter((s) => allowed.has(s.variationId));
      if (selections.length === 0) {
        throw new Error('Invalid option selection.');
      }
    }

    selections = selections.filter((s) => (Number(s.quantity) || 0) > 0);

    if (hasCatalogVariations && selections.length === 0) {
      throw new Error('Please select at least one service option.');
    }

    const effectivePrice = hasCatalogVariations
      ? selections.reduce(
          (sum, s) =>
            sum +
            (Number(s.price) || 0) * Math.round(Number(s.quantity) || 1),
          0,
        )
      : Number(service.price) || 0;

    if (hasCatalogVariations && effectivePrice <= 0) {
      throw new Error('Selected options have no valid price.');
    }

    const lineId = buildCartLineIdFromSelections(service.id, selections);
    const visitingCharge = 0;
    const incomingCategoryId = String(extra.categoryId ?? service.categoryId ?? '').trim();
    const incomingCategoryName = String(
      extra.categoryName ?? service.categoryName ?? service.category ?? '',
    ).trim();

    const thumbFromSelection =
      selections.find((s) => s.imageUrl)?.imageUrl || '';

    setItems((prev) => {
      const idx = prev.findIndex((p) => p.lineId === lineId);
      if (idx >= 0) {
        const next = [...prev];
        const prevCatId = String(next[idx].categoryId ?? '').trim();
        const prevCatName = String(next[idx].categoryName ?? '').trim();
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + quantity,
          price: effectivePrice,
          visitingCharge,
          selectedVariations: selections,
          categoryId: incomingCategoryId || prevCatId,
          categoryName: incomingCategoryName || prevCatName,
          imageUrl:
            thumbFromSelection ||
            next[idx].imageUrl ||
            service.imageUrl ||
            '',
        };
        return next;
      }
      return [
        ...prev,
        {
          lineId,
          serviceId: service.id,
          name: service.name,
          price: effectivePrice,
          visitingCharge,
          duration: Number(service.duration) || 0,
          imageUrl: thumbFromSelection || service.imageUrl || '',
          quantity,
          selectedVariations: selections,
          categoryId: incomingCategoryId,
          categoryName: incomingCategoryName,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((lineId, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((p) => p.lineId !== lineId);
      }
      return prev.map((p) =>
        p.lineId === lineId ? { ...p, quantity } : p,
      );
    });
  }, []);

  const removeItem = useCallback((lineId) => {
    setItems((prev) => prev.filter((p) => p.lineId !== lineId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const totalDuration = useMemo(
    () => items.reduce((sum, i) => sum + i.duration * i.quantity, 0),
    [items],
  );

  const cartPricing = useMemo(
    () => getOrderPricing(items, appliedCoupon, { includeVisiting: false }),
    [items, appliedCoupon],
  );

  const checkoutPricing = useMemo(
    () => getOrderPricing(items, appliedCoupon, { includeVisiting: true }),
    [items, appliedCoupon],
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      subtotal,
      totalDuration,
      appliedCoupon,
      setAppliedCoupon,
      servicesSubtotal: cartPricing.servicesSubtotal,
      visitingChargeTotal: cartPricing.visitingChargeTotal,
      orderSubtotal: cartPricing.orderSubtotal,
      discountAmount: cartPricing.discountAmount,
      finalTotal: cartPricing.finalTotal,
      checkoutVisitingChargeTotal: checkoutPricing.visitingChargeTotal,
      checkoutOrderSubtotal: checkoutPricing.orderSubtotal,
      checkoutDiscountAmount: checkoutPricing.discountAmount,
      checkoutFinalTotal: checkoutPricing.finalTotal,
    }),
    [
      items,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      subtotal,
      totalDuration,
      appliedCoupon,
      cartPricing.servicesSubtotal,
      cartPricing.visitingChargeTotal,
      cartPricing.orderSubtotal,
      cartPricing.discountAmount,
      cartPricing.finalTotal,
      checkoutPricing.visitingChargeTotal,
      checkoutPricing.orderSubtotal,
      checkoutPricing.discountAmount,
      checkoutPricing.finalTotal,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
