import { Alert, Platform, ToastAndroid } from 'react-native';

export function showAppToast(message) {
  if (Platform.OS === 'android' && ToastAndroid?.show) {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('', message);
}
