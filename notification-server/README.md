# Repair Series Push Notify (Vercel · free)

Sends **background / killed-app** push to customers + technicians when booking status changes.

Uses:
1. **Expo Push API** (free) when `expoPushToken` is saved on the user/technician doc
2. **FCM** (free) via Firebase Admin when native device tokens exist and a service account is set

## Deploy

```bash
cd notification-server
npm install
npx vercel
```

### Vercel env vars

| Variable | Required | Notes |
|----------|----------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | Full Firebase service account JSON (or base64 of it) |
| `NOTIFY_SECRET` | Yes | Shared secret — set the same value in admin / apps |
| `CRON_SECRET` | Optional | Extra cron protection |

Cron runs `/api/process-outbox` every minute (Hobby plan: once/day limit may apply — prefer calling `/api/notify` immediately from admin).

## Wire clients

Set in admin panel `.env`:
```
VITE_NOTIFY_API_URL=https://YOUR_DEPLOY.vercel.app
VITE_NOTIFY_SECRET=same-as-NOTIFY_SECRET
```

User / technician apps:
```
EXPO_PUBLIC_NOTIFY_API_URL=https://YOUR_DEPLOY.vercel.app
EXPO_PUBLIC_NOTIFY_SECRET=same-as-NOTIFY_SECRET
```

Website:
```
NEXT_PUBLIC_NOTIFY_API_URL=...
NEXT_PUBLIC_NOTIFY_SECRET=...
```

## Endpoints

- `POST /api/notify` — immediate push
- `GET|POST /api/process-outbox` — drain `bookingNotificationOutbox`
