import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

let notificationsModule = null;
let handlerConfigured = false;
let responseListenerAttached = false;
let receivedListenerAttached = false;

const ANDROID_CHANNEL_ID = 'booking-updates';

/**
 * Expo Go does not support full push / device token flows; skip to avoid runtime issues.
 * See: https://docs.expo.dev/develop/development-builds/introduction/
 */
export function isExpoGoEnvironment() {
  if (Platform.OS === 'web') return false;
  try {
    return (
      Constants.executionEnvironment === 'storeClient' ||
      Constants.appOwnership === 'expo'
    );
  } catch {
    return false;
  }
}

async function getNotificationsModule() {
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    return null;
  }
}

async function configureNotificationHandler() {
  if (handlerConfigured) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Booking updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('booking-assignments', {
      name: 'Booking assignments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  } catch {
    /* Channel API can fail on some OEM / Android 10 builds */
  }
}

/**
 * Registers for push: prefers native device token (FCM on Android) for server-side FCM.
 * Returns { token, platform, type } or null (simulator / denied / web).
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }
  if (isExpoGoEnvironment()) {
    return null;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  await configureNotificationHandler();
  await ensureAndroidChannel();

  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  let expoToken = null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const expoTok = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    expoToken = expoTok?.data || null;
  } catch {
    expoToken = null;
  }

  try {
    const device = await Notifications.getDevicePushTokenAsync();
    const token = device?.data;
    if (!token && !expoToken) return null;
    return {
      token: expoToken || token,
      deviceToken: token || null,
      expoPushToken: expoToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      type: expoToken ? 'expo' : device?.type === 'ios' ? 'apns' : 'fcm',
    };
  } catch {
    if (!expoToken) return null;
    return {
      token: expoToken,
      expoPushToken: expoToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      type: 'expo',
    };
  }
}

/** Extract bookingId from Expo / FCM notification response payloads. */
export function getBookingIdFromNotificationResponse(response) {
  try {
    const content = response?.notification?.request?.content || {};
    const data = content?.data || {};
    const nested = data?.data && typeof data.data === 'object' ? data.data : {};
    const raw =
      data.bookingId ||
      data.booking_id ||
      nested.bookingId ||
      nested.booking_id ||
      content?.bookingId ||
      '';
    const id = String(raw || '').trim();
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Foreground: show incoming FCM/remote notifications; background/killed handled by OS + channel.
 */
export async function initializeNotifications(onResponse) {
  if (Platform.OS === 'web') {
    return null;
  }
  if (isExpoGoEnvironment()) {
    return null;
  }
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return null;
    await configureNotificationHandler();
    await ensureAndroidChannel();

    if (!responseListenerAttached) {
      responseListenerAttached = true;
      Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          onResponse?.(response);
        } catch {
          // ignore
        }
      });
    }

    if (!receivedListenerAttached) {
      receivedListenerAttached = true;
      Notifications.addNotificationReceivedListener(() => {
        /* OS + handler already present alerts; hook for analytics if needed */
      });
    }

    try {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        onResponse?.(last);
      }
    } catch {
      /* ignore cold-start lookup failures */
    }
  } catch {
    /* Older devices / missing Play services — avoid startup crash */
  }

  return null;
}

async function persistInbox(title, body, data) {
  try {
    const { auth } = await import('./firebase');
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    const { writeLocalInboxNotification } = await import('./notificationInboxService');
    await writeLocalInboxNotification(uid, { title, body, data });
  } catch {
    /* inbox write is best-effort */
  }
}

export async function notifyBookingCreated(bookingCode) {
  if (Platform.OS === 'web' || isExpoGoEnvironment()) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  await ensureAndroidChannel();
  const title = 'Booking Update';
  const body = `Your booking ${bookingCode} has been received.`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { bookingCode },
      ...(Platform.OS === 'android' ? { android: { channelId: ANDROID_CHANNEL_ID } } : {}),
    },
    trigger: null,
  });
  await persistInbox(title, body, { bookingCode });
}

export async function notifyTechnicianAssigned(bookingCode) {
  if (Platform.OS === 'web' || isExpoGoEnvironment()) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  await ensureAndroidChannel();
  const title = 'Booking Update';
  const body = 'Partner assigned';
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { bookingCode },
      ...(Platform.OS === 'android' ? { android: { channelId: ANDROID_CHANNEL_ID } } : {}),
    },
    trigger: null,
  });
  await persistInbox(title, body, { bookingCode });
}

export async function notifyBookingCompleted(bookingCode) {
  if (Platform.OS === 'web' || isExpoGoEnvironment()) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  await ensureAndroidChannel();
  const title = 'Booking Update';
  const body = 'Service completed';
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { bookingCode },
      ...(Platform.OS === 'android' ? { android: { channelId: ANDROID_CHANNEL_ID } } : {}),
    },
    trigger: null,
  });
  await persistInbox(title, body, { bookingCode });
}

/** Local fallback; prefer FCM from admin with same title/body. */
export async function notifyBookingStatusChanged(bookingCode, status) {
  if (Platform.OS === 'web' || isExpoGoEnvironment()) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  await ensureAndroidChannel();

  const normalizedStatus = String(status || '').trim();
  const bodyByStatus = {
    New: `Your booking ${bookingCode} is confirmed.`,
    Assigned: 'Partner assigned',
    Completed: 'Service completed',
    Cancelled: `Booking ${bookingCode} has been cancelled.`,
  };

  let body = bodyByStatus[normalizedStatus];
  if (normalizedStatus.toLowerCase().includes('start')) {
    body = 'Service started';
  }
  if (!body) {
    body = `Booking ${bookingCode} status: ${normalizedStatus || 'Updated'}.`;
  }

  const title = 'Booking Update';
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { bookingCode, status: normalizedStatus },
      ...(Platform.OS === 'android' ? { android: { channelId: ANDROID_CHANNEL_ID } } : {}),
    },
    trigger: null,
  });
  await persistInbox(title, body, { bookingCode, status: normalizedStatus });
}
