import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, firebaseConfig } from '../services/firebase';
import { mapPhoneAuthError } from '../utils/phoneAuthErrors';

/**
 * Firebase JS v11+ tries reCAPTCHA Enterprise first, then v2.
 * On Expo/React Native that Enterprise init fails (no browser).
 * Native: send OTP inside a WebView using Firebase 9 (v2 only).
 * Web: use a visible v2 widget on this page.
 */
function recaptchaSendHtml(config, e164) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
  <style>
    html,body{margin:0;padding:16px;background:#fff;font-family:-apple-system,sans-serif;}
    #status{color:#64748b;font-size:14px;text-align:center;margin-bottom:12px;}
    #recaptcha-container{display:flex;justify-content:center;min-height:78px;}
  </style>
</head>
<body>
  <p id="status">Complete the security check to receive your OTP.</p>
  <div id="recaptcha-container"></div>
  <script>
    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }
    try {
      firebase.initializeApp(${JSON.stringify(config)});
      var phone = ${JSON.stringify(e164)};
      var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'normal',
        callback: function() { sendOtp(); },
        'expired-callback': function() {
          post({ type: 'error', message: 'Verification expired. Try again.' });
        }
      });
      function sendOtp() {
        document.getElementById('status').textContent = 'Sending OTP…';
        firebase.auth().signInWithPhoneNumber(phone, verifier)
          .then(function(result) {
            post({ type: 'verificationId', verificationId: result.verificationId });
          })
          .catch(function(err) {
            try { verifier.clear(); } catch (e) {}
            post({
              type: 'error',
              message: (err && err.message) || 'Unable to send OTP.',
              code: err && err.code
            });
          });
      }
      verifier.render().catch(function(err) {
        post({ type: 'error', message: (err && err.message) || 'Security check failed.' });
      });
    } catch (e) {
      post({ type: 'error', message: (e && e.message) || 'Security check failed.' });
    }
  </script>
</body>
</html>`;
}

let webVerifier = null;

async function sendOtpOnWeb(e164) {
  if (typeof document === 'undefined') {
    throw new Error('Phone verification is only available in the app or browser.');
  }
  if (!e164.startsWith('+')) {
    throw new Error('Invalid phone number.');
  }
  let host = document.getElementById('rs-phone-recaptcha');
  if (!host) {
    host = document.createElement('div');
    host.id = 'rs-phone-recaptcha';
    host.style.minHeight = '1px';
    document.body.appendChild(host);
  }
  if (!webVerifier) {
    webVerifier = new RecaptchaVerifier(auth, 'rs-phone-recaptcha', { size: 'invisible' });
    await webVerifier.render();
  }
  const confirmation = await signInWithPhoneNumber(auth, e164, webVerifier);
  return { confirmation };
}

export const PhoneRecaptchaVerifier = forwardRef(function PhoneRecaptchaVerifier(_, ref) {
  const [visible, setVisible] = useState(false);
  const [e164, setE164] = useState('');
  const pendingRef = useRef(null);
  const WebViewRef = useRef(null);

  if (!WebViewRef.current && Platform.OS !== 'web') {
    try {
      WebViewRef.current = require('react-native-webview').WebView;
    } catch {
      WebViewRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    async sendOtp(phoneE164) {
      if (Platform.OS === 'web') {
        try {
          return await sendOtpOnWeb(phoneE164);
        } catch (error) {
          throw new Error(mapPhoneAuthError(error));
        }
      }
      const WebView = WebViewRef.current;
      if (!WebView) {
        throw new Error('Phone verification is unavailable. Rebuild the app after installing WebView.');
      }
      return new Promise((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        setE164(phoneE164);
        setVisible(true);
      });
    },
    cancel() {
      if (pendingRef.current) {
        pendingRef.current.reject(new Error('Verification cancelled.'));
        pendingRef.current = null;
      }
      setVisible(false);
    },
  }));

  const finish = (payload) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setVisible(false);
    if (!pending) return;
    if (payload?.type === 'verificationId' && payload.verificationId) {
      pending.resolve({ verificationId: payload.verificationId });
      return;
    }
    pending.reject(new Error(payload?.message || mapPhoneAuthError(payload)));
  };

  const WebView = WebViewRef.current;
  if (Platform.OS === 'web' || !WebView) return null;

  const authDomain = firebaseConfig.authDomain || 'repair-series.firebaseapp.com';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => finish({ type: 'error', message: 'Verification cancelled.' })}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Security check</Text>
          <Text style={styles.sub}>Tick the box so we can send your OTP.</Text>
          <ActivityIndicator style={styles.spinner} />
          {visible && e164 ? (
            <WebView
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              automaticallyAdjustContentInsets
              mixedContentMode="always"
              source={{
                html: recaptchaSendHtml(firebaseConfig, e164),
                baseUrl: `https://${authDomain}`,
              }}
              onMessage={(event) => {
                try {
                  finish(JSON.parse(event.nativeEvent.data));
                } catch {
                  finish({ type: 'error', message: 'Verification failed.' });
                }
              }}
              style={styles.web}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 320,
    overflow: 'hidden',
    paddingTop: 16,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
    color: '#0a0f1c',
  },
  sub: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  spinner: { marginVertical: 8 },
  web: { height: 240, backgroundColor: '#fff' },
});
