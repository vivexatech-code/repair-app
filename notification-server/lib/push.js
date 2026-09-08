/**
 * Free path: Expo Push API (works when apps are closed).
 * Optional: FCM via firebase-admin when native device tokens are stored.
 */

async function sendExpoPush(messages) {
  if (!messages.length) return { sent: 0, tickets: [] };
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Expo push failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return { sent: messages.length, tickets: json.data || json };
}

function isExpoToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken');
}

function collectTokensFromDoc(data = {}) {
  const out = [];
  const push = (t, type) => {
    const token = String(t || '').trim();
    if (!token || token.length < 20) return;
    out.push({ token, type: type || (isExpoToken(token) ? 'expo' : 'fcm') });
  };

  push(data.expoPushToken, 'expo');
  if (Array.isArray(data.fcmTokens)) {
    for (const t of data.fcmTokens) push(t, isExpoToken(t) ? 'expo' : 'fcm');
  }
  push(data.pushToken, data.devicePushType || data.pushPlatform === 'ios' ? data.devicePushType : undefined);
  push(data.devicePushToken, data.devicePushType);

  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.token)) return false;
    seen.add(x.token);
    return true;
  });
}

async function sendFcm(messaging, tokens, { title, body, data }) {
  if (!tokens.length) return { sent: 0 };
  const stringData = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v == null) continue;
    stringData[String(k)] = String(v);
  }

  let sent = 0;
  for (const token of tokens) {
    try {
      await messaging.send({
        token,
        notification: { title, body },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            channelId: stringData.type === 'booking_assigned' ? 'booking-assignments' : 'booking-updates',
            sound: 'default',
          },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
      sent += 1;
    } catch {
      /* invalid / expired token — skip */
    }
  }
  return { sent };
}

/**
 * @param {import('firebase-admin/messaging').Messaging | null} messaging
 */
async function deliverToTokens(messaging, tokenEntries, payload) {
  const { title, body, data } = payload;
  const expoMsgs = [];
  const fcmTokens = [];

  for (const entry of tokenEntries) {
    if (entry.type === 'expo' || isExpoToken(entry.token)) {
      expoMsgs.push({
        to: entry.token,
        sound: 'default',
        title,
        body,
        data: data || {},
        channelId:
          data?.type === 'booking_assigned' ? 'booking-assignments' : 'booking-updates',
        priority: 'high',
      });
    } else {
      fcmTokens.push(entry.token);
    }
  }

  const expoResult = await sendExpoPush(expoMsgs);
  let fcmSent = 0;
  if (fcmTokens.length && messaging) {
    const r = await sendFcm(messaging, fcmTokens, { title, body, data });
    fcmSent = r.sent;
  }

  return {
    expo: expoResult.sent,
    fcm: fcmSent,
    total: expoResult.sent + fcmSent,
  };
}

const CUSTOMER_COPY = {
  created: (s) => `Your booking for ${s} is confirmed. We'll notify you when a technician is assigned.`,
  assigned: (s) => `A technician has been assigned to your ${s} booking.`,
  started: (s) => `Your ${s} service has started.`,
  completed: (s) => `Your ${s} booking is complete. Thank you!`,
  cancelled: (s) => `Your ${s} booking has been cancelled.`,
  add_on_approval_needed: (s) =>
    `Your technician added extra items to ${s}. Open the app to review and approve.`,
  add_on_approved: (s) => `Add-on services for ${s} were approved.`,
  add_on_rejected: (s) => `Add-on services for ${s} were not approved.`,
  payment_request: (s) => `Payment requested for your ${s} booking. Open the app to pay.`,
};

const TECH_COPY = {
  booking_assigned: (s, code) =>
    `Nayi booking: ${s}${code ? ` (${code})` : ''}. Open app to accept & navigate.`,
  booking_cancelled: (s) => `Booking cancelled: ${s}`,
  add_on_approved: (s) => `Customer approved extras for ${s}`,
  add_on_rejected: (s) => `Customer rejected extras for ${s}`,
};

function customerBody(eventType, serviceName) {
  const s = (serviceName || 'your service').trim() || 'your service';
  const fn = CUSTOMER_COPY[eventType];
  return fn ? fn(s) : 'Your booking has been updated.';
}

function techBody(eventType, serviceName, bookingCode) {
  const s = (serviceName || 'Service').trim() || 'Service';
  const fn = TECH_COPY[eventType];
  return fn ? fn(s, bookingCode) : `Booking update: ${s}`;
}

module.exports = {
  collectTokensFromDoc,
  deliverToTokens,
  customerBody,
  techBody,
  isExpoToken,
};
