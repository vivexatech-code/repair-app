import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { subscribeCustomerBookings } from '../services/bookingService';
import { notifyBookingCompleted } from '../services/notificationService';
import { BOOKING_STATUS } from '../constants';
import { useAuth } from './AuthContext';

const BookingsContext = createContext(null);

export function BookingsProvider({ children }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevStatusRef = useRef({});

  useEffect(() => {
    if (!user?.uid) {
      setBookings([]);
      setLoading(false);
      prevStatusRef.current = {};
      return undefined;
    }
    setLoading(true);
    const unsub = subscribeCustomerBookings(
      user.uid,
      (rows) => {
        setBookings(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Failed to load bookings');
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = { ...prev };
    bookings.forEach((b) => {
      const id = b.id;
      const was = prev[id];
      const now = b.status;
      if (
        was !== undefined &&
        was !== BOOKING_STATUS.COMPLETED &&
        now === BOOKING_STATUS.COMPLETED
      ) {
        notifyBookingCompleted(b.bookingCode || id).catch(() => {});
      }
      next[id] = now;
    });
    prevStatusRef.current = next;
  }, [bookings]);

  const value = useMemo(
    () => ({ bookings, loading, error }),
    [bookings, loading, error],
  );

  return (
    <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within BookingsProvider');
  return ctx;
}
