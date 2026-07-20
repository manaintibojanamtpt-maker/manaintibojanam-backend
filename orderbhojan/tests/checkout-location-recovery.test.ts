import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('checkout location recovery (batch 2)', () => {
  it('checkout splits missing location from session-expired recovery', () => {
    const checkout = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );

    assert.match(checkout, /hasActiveDeliveryLocation/);
    assert.match(checkout, /needsFlatConfirmation/);
    assert.match(checkout, /openConfirmation/);
    assert.match(checkout, /Set your delivery area/);
    assert.match(checkout, /Confirm delivery address/);
    assert.match(checkout, /Add your flat or house number/);
    assert.match(checkout, /Session expired/);
    assert.match(checkout, /openSelector/);
    assert.doesNotMatch(checkout, /openWizard/);
  });

  it('location selector add address uses unified GPS + confirmation flow', () => {
    const selector = readFileSync(
      join(root, 'src/features/location/ui/LocationSelectorSheet.tsx'),
      'utf8',
    );

    assert.match(selector, /startAddSavedAddress/);
    assert.match(selector, /requestCurrentLocation/);
    assert.match(selector, /Enter address manually/);
    assert.match(selector, /AddressFormSheet/);
    assert.match(selector, /Add new address/);
    assert.doesNotMatch(selector, /openWizard/);
  });

  it('confirm address can persist saved addresses from DeliveryAddressV2', () => {
    const actions = readFileSync(
      join(root, 'src/features/location/hooks/useLocationActions.ts'),
      'utf8',
    );

    assert.match(actions, /persistConfirmedAddressForUser/);
    assert.match(actions, /updatingSavedAddressId/);
    assert.match(actions, /v2ToSavedAddressInput/);
    assert.match(actions, /startAddSavedAddress/);
  });

  it('location selector sign-in navigates to auth with returnTo', () => {
    const selector = readFileSync(
      join(root, 'src/features/location/ui/LocationSelectorSheet.tsx'),
      'utf8',
    );

    assert.match(selector, /handleSignIn/);
    assert.match(selector, /signInPath/);
    assert.match(selector, /navigate\(signInPath\)/);
    assert.doesNotMatch(selector, /<Link to="\/auth"/);
  });
});
