# Component Coverage Report

## UI Surfaces

| Surface | BDS Components |
|---------|------------------|
| HomePage | Button, Card, Text, Loader |
| FoundationPage | Card, Text, Skeleton, RestaurantCard, ErrorState, Loader |
| FeaturePlaceholderPage | EmptyState |
| AuthShellPage | Card, Input, PhoneInput, Text |
| MarketplaceLayout | TopBar, BottomNavigation, Button, Icon |
| AuthLayout | BDS tokens only |
| FullScreenLayout | BDS tokens only |
| ErrorBoundary | Card, Button |

## Coverage

- **Component Adoption:** 100% of UI pages import from `@bhojan/design-system`
- **Legacy components:** 0 remaining in `shared/components/`

## Not Yet Used (Available for M1+)

Dialog, BottomSheet, Modal, FoodCard, BillSummary, Timeline, CartBar, Tabs, SegmentedControl, SearchBar, OTPInput.

These remain available without additional dependency work.
