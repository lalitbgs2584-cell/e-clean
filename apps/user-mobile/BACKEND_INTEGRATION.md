# E-Clean Citizen App — Backend Integration & Optimization Guide

> **Scope:** All 18 screens + `citizen-store.ts` in `apps/user-mobile/src/`
> **Current state:** 100% hardcoded mock data in `citizen-store.ts`. No real API calls anywhere.
> **Goal of this doc:** Map every function → API endpoint, flag every mock, and list optimizations per file.

---

## Table of Contents
1. [Store (`citizen-store.ts`)](#1-store--citizen-storets-)
2. [Splash (`index.tsx`)](#2-splash--indextsx-)
3. [Onboarding (`onboarding.tsx`)](#3-onboarding--onboardingtsx-)
4. [Location Permission (`location-permission.tsx`)](#4-location-permission--location-permissiontsx-)
5. [Login (`login.tsx`)](#5-login--logintsx-)
6. [OTP (`otp.tsx`)](#6-otp--otptsx-)
7. [Home (`(tabs)/home.tsx`)](#7-home--tabshometsx-)
8. [Camera (`(tabs)/camera.tsx`)](#8-camera--tabscameratsx-)
9. [Report Details (`report-details.tsx`)](#9-report-details--report-detailstsx-)
10. [Report Submitted (`report-submitted.tsx`)](#10-report-submitted--report-submittedtsx-)
11. [My Reports (`(tabs)/my-reports.tsx`)](#11-my-reports--tabsmy-reportstsx-)
12. [Report Tracking (`report-tracking/[id].tsx`)](#12-report-tracking--report-trackingidtsx-)
13. [Map View (`map-view.tsx`)](#13-map-view--map-viewtsx-)
14. [Alerts (`(tabs)/alerts.tsx`)](#14-alerts--tabsalertstsx-)
15. [Feedback (`feedback/[id].tsx`)](#15-feedback--feedbackidtsx-)
16. [Profile (`(tabs)/profile.tsx`)](#16-profile--tabsprofiletsx-)
17. [Settings (`settings.tsx`)](#17-settings--settingstsx-)
18. [Help (`help.tsx`)](#18-help--helptsx-)
19. [Global Architecture & Optimization](#19-global-architecture--optimization)

---

## 1. Store — `citizen-store.ts`

### What it is
A hand-rolled global store using `useSyncExternalStore`. All state is module-level — it resets on app reload. **Everything is mocked.**

### Functions

| Function | What it does now (mock) | What it should do (backend) |
|---|---|---|
| `useCitizenStore()` | Reads module-level `state` object | Subscribe to server state, hydrate from secure storage on mount |
| `updateDraftReport(draft)` | Patches in-memory `draftReport` | Keep as local-only (draft is transient, no API needed) |
| `createNewReport(data)` | Generates a random ID locally, prepends to `reports[]` | `POST /api/reports` — upload photos first, then submit report |
| `getReportById(id)` | Finds by id in local array | Could stay local if reports are already fetched; otherwise `GET /api/reports/:id` |
| `markAllNotificationsRead()` | Sets all `isRead: true` in memory | `PATCH /api/notifications/read-all` |
| `submitFeedback(reportId, rating, text)` | Patches local report object | `POST /api/reports/:id/feedback` |

### Mock data to replace
- `profile` → fetched on login from `GET /api/user/me`
- `reports[]` → fetched from `GET /api/reports?citizenId=...`
- `notifications[]` → fetched from `GET /api/notifications`
- `draftReport` initial values → should start empty `{}`

### How to connect

```ts
// Suggested: replace the store internals with an API-aware version
// Keep the same useCitizenStore() API surface — screens don't change

async function loadInitialState(token: string) {
  const [user, reports, notifications] = await Promise.all([
    fetch('/api/user/me',        { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch('/api/reports',        { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch('/api/notifications',  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  ]);
  setState(() => ({ profile: user, reports, notifications, draftReport: {} }));
}
```

### Optimizations
- Replace module-level store with **Zustand** (simpler, supports persistence) or **TanStack Query** (for server state + caching)
- Persist `draftReport` to `AsyncStorage` so a mid-report app crash doesn't lose the user's work
- Add `ecoPoints` field to `CitizenState` — currently computed on the fly in `home.tsx` as `resolvedCount * 50`

---

## 2. Splash — `index.tsx`

### Functions

| Function | Purpose |
|---|---|
| `useEffect` (timer) | Redirects to `/onboarding` after 2 seconds |
| `Animated.parallel` | Fades + slides the logo in on mount |
| `Animated.loop` | Pulses the loading dots |

### Backend connection
This screen needs **auth token check** before redirecting:

```ts
useEffect(() => {
  const checkAuth = async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      const valid = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.ok);
      router.replace(valid ? '/(tabs)/home' : '/onboarding');
    } else {
      setTimeout(() => router.replace('/onboarding'), 2000);
    }
  };
  checkAuth();
}, []);
```

### Optimizations
- Use `expo-splash-screen` (`SplashScreen.preventAutoHideAsync()`) instead of a custom screen — renders before JS bundle loads
- Pre-fetch fonts here using `expo-font` `useFonts()` hook

---

## 3. Onboarding — `onboarding.tsx`

### Functions

| Function | Purpose |
|---|---|
| `goToNext()` | Scrolls FlatList to next slide, or pushes to `/location-permission` on last slide |
| `handleSkip()` | Immediately pushes to `/location-permission` |

### Backend connection
- **No API calls needed.** Slides are static content.
- Optionally: `PATCH /api/user/me { onboardingComplete: true }` after the last slide so splash knows to skip onboarding for returning users.

### Optimizations
- Pre-load all 3 slide images using `Image.prefetch()` before rendering
- Track slide completion in `AsyncStorage` — skip onboarding entirely on subsequent launches

---

## 4. Location Permission — `location-permission.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleAllowLocation()` | Calls `expo-location` `requestForegroundPermissionsAsync()`, then navigates to `/login` regardless of result |

### Backend connection
After permission is granted, send initial coordinates:

```ts
const { status } = await Location.requestForegroundPermissionsAsync();
if (status === 'granted') {
  const { coords } = await Location.getCurrentPositionAsync({});
  await fetch('/api/user/location', {
    method: 'PATCH',
    body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
  });
}
```

### Optimizations
- Store permission result in `SecureStore` — skip this screen if already granted
- Handle the denied case with a second prompt explaining why it's needed

---

## 5. Login — `login.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleSubmit()` | Currently just navigates to `/otp` — no real auth |

### Backend connection

```ts
const handleSubmit = async () => {
  setLoading(true);
  try {
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    router.push({ pathname: '/otp', params: { phone } });
  } catch {
    Alert.alert('Error', 'Failed to send OTP. Try again.');
  } finally {
    setLoading(false);
  }
};
```

### Optimizations
- Validate phone format client-side before sending (regex)
- Add loading state / disable button while API call is in-flight (currently missing)
- Use `expo-haptics` on button press for tactile feedback

---

## 6. OTP — `otp.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleKeyPress(num)` | Fills or deletes a digit in the 6-box OTP array |
| `handleVerify()` | Navigates to `/(tabs)/home` — no real verification |
| `useEffect` timer | Counts down the resend timer from 25 |

### Backend connection

```ts
const handleVerify = async () => {
  const code = otp.join('');
  try {
    const { token } = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp: code }),
    }).then(r => r.json());

    await SecureStore.setItemAsync('auth_token', token);
    await loadInitialState(token); // hydrate citizen store
    router.replace('/(tabs)/home');
  } catch {
    Alert.alert('Invalid OTP', 'The code you entered is incorrect.');
    setOtp(['', '', '', '', '', '']);
  }
};
```

### Optimizations
- **Auto-submit** when all 6 digits are filled (no manual tap needed)
- Add shake animation on wrong OTP using `react-native-reanimated` (already installed)
- `findLastIndex` used in keypress handler — add polyfill for older Android JS engines

---

## 7. Home — `(tabs)/home.tsx`

### Functions

| Function | Purpose |
|---|---|
| `resolvedCount`, `inProgressCount`, `totalCount` | Computed from local `reports[]` — no API |
| `resolvedCount * 50` | Eco-points formula — **hardcoded**, should come from backend |
| `reports.slice(0, 3).map(...)` | Shows 3 most recent reports |

### Backend connection
- Load profile + reports + notifications from store on login (see Store section)
- Eco-points → `GET /api/user/me → { ecoPoints: 150 }`
- Optionally: `GET /api/reports/summary → { total, inProgress, resolved }` for cached stats

### Optimizations
- Add **pull-to-refresh** (`<ScrollView refreshControl={...}>`)
- **Skeleton loading** while reports are fetching
- Notification dot on avatar should reflect real `notifications.filter(n => !n.isRead).length`

---

## 8. Camera — `(tabs)/camera.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleCapture()` | Sets `captured = true`, saves a hardcoded Unsplash URL to draft |
| `handleNext()` | Navigates to `/report-details` |

### Backend connection
Replace with real `expo-camera` + upload:

```ts
const handleCapture = async () => {
  const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
  if (photo) {
    const formData = new FormData();
    formData.append('file', { uri: photo.uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    const { url } = await fetch('/api/uploads', {
      method: 'POST', body: formData,
    }).then(r => r.json());

    updateDraftReport({ photos: [url], location: detectedAddress });
    setCaptured(true);
  }
};
```

### Optimizations
- Switch from `<Image>` mockup to real `<CameraView>` from `expo-camera` (installed)
- Compress image before upload (`expo-image-manipulator`, resize max 1200px)
- Allow multi-photo: up to 5 photos per report

---

## 9. Report Details — `report-details.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleSubmit()` | Calls `createNewReport()` from store (local), navigates to `/report-submitted` |

### Backend connection

```ts
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    const report = await fetch('/api/reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wasteType,
        description,
        photos,
        location: draftReport.location,
        isOwnArea: isYourArea,
      }),
    }).then(r => r.json());

    // Optimistic store update
    setState(prev => ({ ...prev, reports: [report, ...prev.reports], draftReport: {} }));
    router.push(`/report-submitted?id=${encodeURIComponent(report.id)}`);
  } catch {
    Alert.alert('Submission Failed', 'Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Optimizations
- Real-time AI classification preview (`POST /api/ai/classify` with photo URL) as user fills details
- Validate: require ≥ 1 photo and non-empty description before enabling Submit
- Auto-select waste type chip from AI response

---

## 10. Report Submitted — `report-submitted.tsx`

### Functions

| Function | Purpose |
|---|---|
| `useLocalSearchParams` | Reads `id` from URL query string |

### Backend connection
- No API calls needed — data comes from navigation param
- Optional: `POST /api/reports/:id/subscribe` to auto-enroll for push notifications

### Optimizations
- Confetti animation on success using `react-native-reanimated`
- Deep-link "View Report" button with a shareable URL

---

## 11. My Reports — `(tabs)/my-reports.tsx`

### Functions

| Function | Purpose |
|---|---|
| `reports.filter(...)` | Client-side filters by status |
| `setFilter` | Updates filter pill state |

### Backend connection
Option A — client filter (current, fine for small datasets):
- Reports already in store from login fetch

Option B — server filter (better at scale):
```ts
useEffect(() => {
  const url = filter !== 'All' ? `/api/reports?status=${filter}` : '/api/reports';
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => setState(prev => ({ ...prev, reports: data })));
}, [filter]);
```

### Optimizations
- **Pagination / infinite scroll** with `FlatList` + `onEndReached`
- Pull-to-refresh
- Swipe-to-delete on resolved reports

---

## 12. Report Tracking — `report-tracking/[id].tsx`

### Functions

| Function | Purpose |
|---|---|
| `getReportById(id)` | Looks up report from local store by decoded URL id |
| `setNotifyEnabled` | Toggles local notification preference |

### Backend connection

```ts
// Fetch latest on mount
useEffect(() => {
  fetch(`/api/reports/${reportId}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => setState(prev => ({
      ...prev,
      reports: prev.reports.map(r => r.id === reportId ? data : r),
    })));
}, [reportId]);

// Real-time updates via SSE
const es = new EventSource(`/api/reports/${reportId}/stream`);
es.onmessage = (e) => { /* update store */ };

// Notification toggle
const handleToggle = async (enabled: boolean) => {
  setNotifyEnabled(enabled);
  await fetch(`/api/reports/${reportId}/subscribe`, {
    method: enabled ? 'POST' : 'DELETE',
  });
};
```

### Optimizations
- Poll every 30s as fallback if SSE/WebSocket isn't set up
- Show "Last updated X minutes ago" timestamp
- Add map thumbnail showing the report pin location

---

## 13. Map View — `map-view.tsx`

### Functions

| Function | Purpose |
|---|---|
| `setSelectedCluster(val)` | Highlights a hardcoded mock cluster pin |

### Backend connection

```ts
const fetchHotspots = async () => {
  const { coords } = await Location.getCurrentPositionAsync({});
  const data = await fetch(
    `/api/hotspots?lat=${coords.latitude}&lng=${coords.longitude}&radius=5km`
  ).then(r => r.json());
  setHotspots(data); // [{ lat, lng, count, severity }]
};
```

Replace mock grid with real `react-native-maps` / `expo-maps`.

### Optimizations
- Cluster pins for performance with many markers
- Color-code by severity: green < 5, amber 5–15, red > 15
- Cache hotspot data for 5 minutes

---

## 14. Alerts — `(tabs)/alerts.tsx`

### Functions

| Function | Purpose |
|---|---|
| `notifications.filter(...)` | Client-side All/Unread filter |
| `markAllNotificationsRead()` | Sets all `isRead: true` in local store |

### Backend connection

```ts
// On mount
useEffect(() => {
  fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => setState(prev => ({ ...prev, notifications: data })));
}, []);

// Mark all read
const handleMarkAll = async () => {
  markAllNotificationsRead(); // optimistic
  await fetch('/api/notifications/read-all', { method: 'PATCH' });
};
```

Push notification token registration:
```ts
const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
await fetch('/api/user/push-token', { method: 'POST', body: JSON.stringify({ token: pushToken }) });
```

### Optimizations
- Badge count on tab icon reflects real `notifications.filter(n => !n.isRead).length`
- Swipe-to-dismiss individual notifications
- Group by day: Today / Yesterday / Older

---

## 15. Feedback — `feedback/[id].tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleSubmit()` | Calls `submitFeedback()` from store (local), navigates back after 1.2s |

### Backend connection

```ts
const handleSubmit = async () => {
  submitFeedback(reportId, rating, text); // optimistic local update
  setSubmitted(true);
  try {
    await fetch(`/api/reports/${reportId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment: text }),
    });
  } catch {
    // Silently retry — feedback is non-critical
  }
  setTimeout(() => router.replace('/(tabs)/my-reports'), 1200);
};
```

### Optimizations
- Pre-fill the form if `report.feedback` already exists (user re-visiting)
- Disable form and show "Already submitted" if feedback exists
- Add emoji reaction row above stars for quicker UX

---

## 16. Profile — `(tabs)/profile.tsx`

### Functions

| Function | Purpose |
|---|---|
| `profile` destructuring | Reads name, phone, sector, avatarUrl from store |
| `menuItems.map(...)` | Renders nav links list |

### Backend connection
- Profile data handled by store hydration on login
- Edit profile: `PATCH /api/user/me { name, sector }`
- Avatar upload: `POST /api/uploads` → `PATCH /api/user/me { avatarUrl }`

### Optimizations
- Show real report count badge next to "My Reports"
- Show eco-points in the header card
- Add "Edit Profile" button on the header card

---

## 17. Settings — `settings.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleClearCache()` | Sets a local string state — **no real cache clearing** |
| `handleLogout()` | Navigates to `/login` — **no token invalidation** |
| `darkMode` toggle | Local `useState` — **not persisted** |

### Backend connection

```ts
// Real logout
const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  await SecureStore.deleteItemAsync('auth_token');
  setState(() => initialState); // reset store
  router.replace('/login');
};

// Real cache clear
const handleClearCache = async () => {
  await FileSystem.deleteAsync(FileSystem.cacheDirectory!, { idempotent: true });
  setCacheSize('0.0 MB');
};

// Persist dark mode
const handleDarkModeToggle = async (val: boolean) => {
  setDarkMode(val);
  await AsyncStorage.setItem('darkMode', String(val));
};
```

### Optimizations
- Read actual cache size from `expo-file-system` `FileSystem.getInfoAsync()`
- Apply dark mode globally via a `ThemeContext`
- Show app version from `expo-constants` `Constants.expoConfig.version`

---

## 18. Help — `help.tsx`

### Functions

| Function | Purpose |
|---|---|
| `handleCallEmergency()` | Opens `tel:18001234567` via `Linking.openURL` |

### Backend connection
- FAQ items from `GET /api/help/faqs`
- "Report a Problem": `POST /api/support/ticket { message, userId }`
- Helpline number from `GET /api/config` — **don't hardcode it**

### Optimizations
- Expandable FAQ accordion instead of plain nav rows
- In-app chat widget for "Contact Support"
- Cache help content offline with `expo-file-system`

---

## 19. Global Architecture & Optimization

### State Management — Recommended Migration

```
Current:  Hand-rolled useSyncExternalStore (resets on reload, no persistence)
Upgrade:  Zustand + TanStack Query

- Zustand:        local/transient state (draftReport, UI flags, auth token)
- TanStack Query: server state (reports, notifications, profile)
                  → automatic caching, background refresh, stale-while-revalidate
```

### API Layer — Create `src/lib/api.ts`

```ts
const BASE = process.env.EXPO_PUBLIC_API_URL;

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  auth: {
    sendOtp:   (phone: string)              => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone: string, otp: string) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
    logout:    ()                           => request('/auth/logout', { method: 'POST' }),
  },
  user: {
    me:     ()    => request('/user/me'),
    update: (d)   => request('/user/me', { method: 'PATCH', body: JSON.stringify(d) }),
  },
  reports: {
    list:     ()              => request('/reports'),
    get:      (id: string)    => request(`/reports/${id}`),
    create:   (data: any)     => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
    feedback: (id: string, d) => request(`/reports/${id}/feedback`, { method: 'POST', body: JSON.stringify(d) }),
  },
  notifications: {
    list:    () => request('/notifications'),
    readAll: () => request('/notifications/read-all', { method: 'PATCH' }),
  },
};
```

### Complete API Endpoint Map

| Screen | Method | Endpoint | Auth Required |
|---|---|---|---|
| Splash | `GET` | `/api/auth/verify` | Token |
| Login | `POST` | `/api/auth/send-otp` | None |
| OTP | `POST` | `/api/auth/verify-otp` | None |
| Location | `PATCH` | `/api/user/location` | Token |
| App load | `GET` | `/api/user/me` | Token |
| App load | `GET` | `/api/reports` | Token |
| App load | `GET` | `/api/notifications` | Token |
| Camera | `POST` | `/api/uploads` | Token |
| Report Details | `POST` | `/api/reports` | Token |
| Report Tracking | `GET` | `/api/reports/:id` | Token |
| Report Tracking | `POST/DELETE` | `/api/reports/:id/subscribe` | Token |
| Alerts | `PATCH` | `/api/notifications/read-all` | Token |
| Alerts | `POST` | `/api/user/push-token` | Token |
| Feedback | `POST` | `/api/reports/:id/feedback` | Token |
| Profile | `PATCH` | `/api/user/me` | Token |
| Map | `GET` | `/api/hotspots` | Token |
| Settings | `POST` | `/api/auth/logout` | Token |
| Help | `GET` | `/api/help/faqs` | None |
| Help | `POST` | `/api/support/ticket` | Token |

### Performance Optimizations (Global)

| Area | Current State | Fix |
|---|---|---|
| Images | RN core `<Image>` | Switch to `expo-image` (faster decode, blurhash placeholders, disk cache) |
| Lists | `Array.map` in `ScrollView` | Use `FlatList` with `keyExtractor` + `getItemLayout` for virtualization |
| Fonts | `fontFamily: 'Sora'` strings with no loader | Load with `useFonts()` in `_layout.tsx` — fonts are **not loaded** right now |
| Auth token | Not stored anywhere | `expo-secure-store` for JWT |
| Offline | App crashes with no internet | `expo-network` check + offline banner component |
| Error handling | None in any screen | Wrap all API calls in try/catch, show user-facing `Alert` |
| Loading states | None anywhere | `ActivityIndicator` or skeleton screens while data loads |
| Store re-renders | Single object — any update re-renders all subscribers | Split into slices: profile / reports / notifications |
