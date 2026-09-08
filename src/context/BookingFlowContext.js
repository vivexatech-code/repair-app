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
  /** Slot identity for allocation + busySlots (from technician dailyAvailability / calendar). */
  const [scheduledSlotMeta, setScheduledSlotMeta] = useState(null);
  /** When set, checkout creates a free revisit for the same technician. */
  const [revisitParent, setRevisitParent] = useState(null);
  /** When set, ScheduleScreen updates an existing New/Assigned booking. */
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const resetFlow = useCallback(() => {
    setAddress(initialAddress);
    setScheduledAt(null);
    setScheduledSlotMeta(null);
    setRevisitParent(null);
    setRescheduleTarget(null);
  }, []);

  const value = useMemo(
    () => ({
      address,
      setAddress,
      scheduledAt,
      setScheduledAt,
      scheduledSlotMeta,
      setScheduledSlotMeta,
      revisitParent,
      setRevisitParent,
      rescheduleTarget,
      setRescheduleTarget,
      resetFlow,
    }),
    [
      address,
      scheduledAt,
      scheduledSlotMeta,
      revisitParent,
      rescheduleTarget,
      resetFlow,
    ],
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
