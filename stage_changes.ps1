# PowerShell script to stage intentional changes
Set-Location "F:\Manaintibojanam_final2\manaintibojanam-backend"

# Source code changes
git add orderbhojan/src/features/cart/store/cartStore.ts
git add orderbhojan/src/features/checkout/domain/deliveryTimeSlots.ts
git add orderbhojan/src/features/checkout/domain/resolveVoiceScheduleSlot.ts
git add orderbhojan/src/features/checkout/hooks/useCheckoutFlow.ts
git add orderbhojan/src/features/restaurant/store/restaurantContextStore.ts
git add orderbhojan/src/lib/sanitizeLiveRestaurantContext.ts
git add orderbhojan/src/presentation/checkout/OrderBhojanCheckoutPage.tsx
git add orderbhojan/src/features/assistant/application/ensureRestaurantContextForCartPlan.ts
git add orderbhojan/src/features/assistant/ui/index.ts
git add orderbhojan/src/features/discovery/hooks/useDiscoveryHome.ts
git add orderbhojan/src/features/experience/domain/experience.types.ts
git add orderbhojan/src/features/experience/ui/home/HomeSearchBar.tsx
git add orderbhojan/src/features/experience/utils/experienceCart.ts
git add orderbhojan/src/features/food/engine/foodExperienceLayer.ts
git add orderbhojan/src/features/food/engine/foodSessionCache.ts
git add orderbhojan/src/features/restaurant/engine/restaurantExperienceLayer.ts
git add orderbhojan/src/features/restaurant/hooks/useRestaurantExperience.ts
git add orderbhojan/src/features/tracking/hooks/useReorderFromTracking.ts
git add orderbhojan/src/types/marketplace-restaurant.ts

# New domain files
git add orderbhojan/src/features/checkout/domain/deliveryFeeEstimator.ts
git add orderbhojan/src/features/restaurant/domain/restaurantContextPersistence.ts

# New test files
git add orderbhojan/tests/cart-hydration-guard.test.ts
git add orderbhojan/tests/cart-hydration-race.test.ts
git add orderbhojan/tests/checkout-local-delivery-fee.test.ts
git add orderbhojan/tests/delivery-slot-timezone.test.ts
git add orderbhojan/tests/delivery-slot-validation.test.ts
git add orderbhojan/tests/discovery-bootstrap-regression.test.ts
git add orderbhojan/tests/restaurant-skeleton-fix.test.ts

# Modified test files
git add orderbhojan/tests/assistant-consumer-ui.test.ts
git add orderbhojan/tests/checkout-schedule.test.ts

# Android package migration (com.bhojanos.orderbhojan -> com.bhojanos.customer)
git add orderbhojan/android/app/build.gradle
git add orderbhojan/android/app/google-services.json
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/MainActivity.java
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/OrderBhojanNativeChromePlugin.java
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/OrderBhojanNativeSttPlugin.java
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/OrderBhojanNativeTrackPlugin.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/OrderBhojanNativeUpiPlugin.java
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/nativehost/NativeFeatureFlags.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/nativehost/NativeRouteDispatcher.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/nativehost/NativeSessionManager.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/nativehost/NativeTrackCohort.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/track/TrackActivity.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/track/TrackApiClient.kt
git add orderbhojan/android/app/src/main/java/com/bhojanos/customer/track/TrackModels.kt
git add orderbhojan/android/app/src/main/res/values/strings.xml
git add orderbhojan/android/app/src/test/java/com/bhojanos/customer/nativehost/NativeRouteDispatcherTest.java

# Capacitor config
git add orderbhojan/capacitor.config.ts
git add orderbhojan/package.json