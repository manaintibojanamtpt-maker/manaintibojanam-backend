import subprocess
import sys

# Stage all the files
files_to_stage = [
    'orderbhojan/android/app/build.gradle',
    'orderbhojan/android/app/google-services.json',
    'orderbhojan/android/app/src/main/java/com/bhojanos/customer/',
    'orderbhojan/android/app/src/main/res/values/strings.xml',
    'orderbhojan/android/app/src/test/java/com/bhojanos/customer/',
    'orderbhojan/capacitor.config.ts',
    'orderbhojan/package.json',
    'orderbhojan/src/features/assistant/application/ensureRestaurantContextForCartPlan.ts',
    'orderbhojan/src/features/assistant/ui/index.ts',
    'orderbhojan/src/features/cart/store/cartStore.ts',
    'orderbhojan/src/features/checkout/domain/deliveryTimeSlots.ts',
    'orderbhojan/src/features/checkout/domain/deliveryFeeEstimator.ts',
    'orderbhojan/src/features/checkout/domain/resolveVoiceScheduleSlot.ts',
    'orderbhojan/src/features/checkout/hooks/useCheckoutFlow.ts',
    'orderbhojan/src/features/discovery/hooks/useDiscoveryHome.ts',
    'orderbhojan/src/features/experience/domain/experience.types.ts',
    'orderbhojan/src/features/experience/ui/home/HomeSearchBar.tsx',
    'orderbhojan/src/features/experience/utils/experienceCart.ts',
    'orderbhojan/src/features/food/engine/foodExperienceLayer.ts',
    'orderbhojan/src/features/food/engine/foodSessionCache.ts',
    'orderbhojan/src/features/restaurant/engine/restaurantExperienceLayer.ts',
    'orderbhojan/src/features/restaurant/hooks/useRestaurantExperience.ts',
    'orderbhojan/src/features/restaurant/store/restaurantContextStore.ts',
    'orderbhojan/src/features/restaurant/domain/restaurantContextPersistence.ts',
    'orderbhojan/src/features/tracking/hooks/useReorderFromTracking.ts',
    'orderbhojan/src/lib/sanitizeLiveRestaurantContext.ts',
    'orderbhojan/src/presentation/checkout/OrderBhojanCheckoutPage.tsx',
    'orderbhojan/src/presentation/discovery/OrderBhojanHomeHero.tsx',
    'orderbhojan/src/types/marketplace-restaurant.ts',
    'orderbhojan/tests/assistant-consumer-ui.test.ts',
    'orderbhojan/tests/checkout-schedule.test.ts',
    'orderbhojan/tests/cart-hydration-guard.test.ts',
    'orderbhojan/tests/cart-hydration-race.test.ts',
    'orderbhojan/tests/checkout-local-delivery-fee.test.ts',
    'orderbhojan/tests/delivery-slot-timezone.test.ts',
    'orderbhojan/tests/delivery-slot-validation.test.ts',
    'orderbhojan/tests/discovery-bootstrap-regression.test.ts',
    'orderbhojan/tests/restaurant-skeleton-fix.test.ts',
]

for f in files_to_stage:
    result = subprocess.run(['git', 'add', f], capture_output=True, text=True)
    if result.returncode != 0:
        print(f'ERROR adding {f}: {result.stderr}')
    else:
        print(f'OK: {f}')

# Check staged
result = subprocess.run(['git', 'diff', '--cached', '--name-status'], capture_output=True, text=True)
print('\n=== STAGED FILES ===')
print(result.stdout)

result = subprocess.run(['git', 'diff', '--cached', '--stat'], capture_output=True, text=True)
print('\n=== STAT ===')
print(result.stdout)

result = subprocess.run(['git', 'status', '--short'], capture_output=True, text=True)
print('\n=== STATUS ===')
print(result.stdout)