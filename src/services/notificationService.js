import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

let notificationsModule = null;
let handlerConfigured = false;

function canUseNotifications() {
  return Constants.appOwnership !== 'expo';
}

async function getNotificationsModule() {
  if (!canUseNotifications()) return null;
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

export async function registerForPushNotificationsAsync() {
  if (Constants.appOwnership === 'expo') {
    return null;
  }
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  await configureNotificationHandler();

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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token?.data ?? null;
  } catch {
    return null;
  }
}

export async function notifyBookingCreated(bookingCode) {
  if (Constants.appOwnership === 'expo') return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  if (Constants.appOwnership !== 'expo') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking created',
        body: `Your booking ${bookingCode} has been received.`,
      },
      trigger: null,
    });
  }
}

export async function notifyTechnicianAssigned(bookingCode) {
  if (Constants.appOwnership === 'expo') return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  if (Constants.appOwnership !== 'expo') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Technician assigned',
        body: `A technician has been assigned to booking ${bookingCode}.`,
      },
      trigger: null,
    });
  }
}

export async function notifyBookingCompleted(bookingCode) {
  if (Constants.appOwnership === 'expo') return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await configureNotificationHandler();
  if (Constants.appOwnership !== 'expo') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking completed',
        body: `Booking ${bookingCode} is marked complete. Thank you!`,
      },
      trigger: null,
    });
  }
}
