import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const BookingFlowContext = createContext(null);

const initialAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};

export function BookingFlowProvider({ children }) {
  const [address, setAddress] = useState(initialAddress);
  const [scheduledAt, setScheduledAt] = useState(null);

  const resetFlow = useCallback(() => {
    setAddress(initialAddress);
    setScheduledAt(null);
  }, []);

  const value = useMemo(
    () => ({
      address,
      setAddress,
      scheduledAt,
      setScheduledAt,
      resetFlow,
    }),
    [address, scheduledAt, resetFlow],
  );

  return (
    <BookingFlowContext.Provider value={value}>
      {children}
    </BookingFlowContext.Provider>
  );
}

export function useBookingFlow() {
  const ctx = useContext(BookingFlowContext);
  if (!ctx) {
    throw new Error('useBookingFlow must be used within BookingFlowProvider');
  }
  return ctx;
}
