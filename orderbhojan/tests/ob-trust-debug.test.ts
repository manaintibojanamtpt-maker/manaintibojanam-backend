import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('ob trust debug instrumentation', () => {
  it('obDebug requires explicit opt-in flags', () => {
    const source = readFileSync(join(root, 'src/lib/obDebug.ts'), 'utf8');
    assert.match(source, /OB_DEBUG_STORAGE_KEY = 'ob_debug'/);
    assert.match(source, /OB_DEBUG_QUERY_PARAM = 'debug'/);
    assert.match(source, /bootstrapObDebugFromUrl/);
    assert.match(source, /obDebugTrustEvent/);
    assert.doesNotMatch(source, /import\.meta\.env\.DEV\) return true/);
  });

  it('instruments trust-path validation hooks', () => {
    const activeLocation = readFileSync(
      join(root, 'src/features/location/domain/activeDeliveryLocation.ts'),
      'utf8',
    );
    assert.match(activeLocation, /obDebugTrustEvent\(\s*'location'/);

    const discoveryHome = readFileSync(
      join(root, 'src/features/discovery/hooks/useDiscoveryHome.ts'),
      'utf8',
    );
    assert.match(discoveryHome, /obDebugTrustEvent\(\s*'discovery'/);

    const checkout = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );
    assert.match(checkout, /placeRazorpayOrder before Razorpay/);

    const razorpay = readFileSync(
      join(root, 'src/features/checkout/infrastructure/razorpayCheckout.ts'),
      'utf8',
    );
    assert.match(razorpay, /before create-razorpay-order/);

    const authReturn = readFileSync(
      join(root, 'src/features/auth/domain/authReturnTo.ts'),
      'utf8',
    );
    assert.match(authReturn, /persistAuthReturnTo/);
    assert.match(authReturn, /obDebugTrustEvent\(\s*'auth'/);

    const debugStrip = readFileSync(
      join(root, 'src/presentation/debug/ObTrustDebugStrip.tsx'),
      'utf8',
    );
    assert.match(debugStrip, /ObTrustDebugStrip/);
    assert.match(debugStrip, /isObDebugEnabled/);
  });

  it('documents manual trust validation scenarios', () => {
    const doc = readFileSync(join(root, 'docs/MANUAL-TRUST-VALIDATION.md'), 'utf8');
    assert.match(doc, /Scenarios 2–7/);
    assert.match(doc, /localStorage\.ob_debug/);
    assert.match(doc, /\?debug=1/);
  });
});
