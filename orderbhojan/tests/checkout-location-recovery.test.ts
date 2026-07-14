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
    assert.match(checkout, /Set delivery location/);
    assert.match(checkout, /Add your delivery address to complete checkout/);
    assert.match(checkout, /Session expired/);
    assert.match(checkout, /openSelector/);
    assert.doesNotMatch(checkout, /openWizard/);
  });

  it('location selector manual entry opens AddressFormSheet', () => {
    const selector = readFileSync(
      join(root, 'src/features/location/ui/LocationSelectorSheet.tsx'),
      'utf8',
    );

    assert.match(selector, /setShowAddressForm\(true\)/);
    assert.match(selector, /Enter address manually/);
    assert.match(selector, /Add new address/);
    assert.doesNotMatch(selector, /openWizard/);
  });

  it('address form supports guest session via setManualSession', () => {
    const form = readFileSync(
      join(root, 'src/features/location/ui/AddressFormSheet.tsx'),
      'utf8',
    );

    assert.match(form, /setManualSession/);
    assert.match(form, /House \/ Flat No\./);
    assert.match(form, /Building \/ Apartment/);
    assert.match(form, /Landmark \(optional\)/);
    assert.match(form, /isAuthenticated/);
  });
});
