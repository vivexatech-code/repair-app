import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((service, quantity = 1) => {
    setItems((prev) => {
      const key = service.id;
      const idx = prev.findIndex((p) => p.serviceId === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + quantity,
        };
        return next;
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          name: service.name,
          price: Number(service.price) || 0,
          duration: Number(service.duration) || 0,
          imageUrl: service.imageUrl || '',
          quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((serviceId, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((p) => p.serviceId !== serviceId);
      }
      return prev.map((p) =>
        p.serviceId === serviceId ? { ...p, quantity } : p,
      );
    });
  }, []);

  const removeItem = useCallback((serviceId) => {
    setItems((prev) => prev.filter((p) => p.serviceId !== serviceId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const totalDuration = useMemo(
    () => items.reduce((sum, i) => sum + i.duration * i.quantity, 0),
    [items],
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
    }),
    [items, addItem, setQuantity, removeItem, clearCart, subtotal, totalDuration],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
