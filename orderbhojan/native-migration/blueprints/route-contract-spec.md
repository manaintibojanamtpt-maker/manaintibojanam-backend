# Route Contract Specification: Native Order Tracking

## 1. Overview
This specification defines the data contract between the OrderBhojan React Web Shell and the Native OS (Android/iOS) for the **Order Tracking** slice.

## 2. Invocation Trigger
When a user navigates to `/orders/:orderId/track` (and `VITE_FF_NATIVE_TRACK` is enabled), the web application will invoke the `NativeTrack` Capacitor plugin instead of rendering the React component.

## 3. Capacitor Plugin Interface

```typescript
export interface NativeTrackPlugin {
  /**
   * Opens the native order tracking screen.
   */
  openTracking(options: TrackScreenOptions): Promise<void>;
}

export interface TrackScreenOptions {
  // Primary identifier to fetch tracking data from backend
  orderId: string;
}
```

## 4. Platform Handling

### 4.1 Android
* **Receiver:** `NativeTrackPlugin.java`
* **Action:** Constructs an `Intent` to launch `TrackActivity.kt`.
* **Extras:** Maps `TrackScreenOptions` to Intent string extras (`EXTRA_ORDER_ID`).

### 4.2 iOS
* **Receiver:** `NativeTrackPlugin.swift`
* **Action:** Initializes `TrackView` (SwiftUI) inside a `UIHostingController`.
* **Props:** Passes `TrackScreenOptions` into the ViewModel's initializer.
* **Presentation:** Presents the controller modally or pushes to navigation controller.

## 5. Security & Constraints
* **Auth Token:** The native track screen must obtain its session and authentication tokens directly from the approved secure session source (e.g., Firebase Auth native SDK), preserving existing Bearer token behavior without receiving tokens via plugin parameters.
* **Fallback:** If the native plugin fails to invoke or throws an error, the web router must catch the exception and immediately fallback to the React `/orders/:orderId/track` view.
