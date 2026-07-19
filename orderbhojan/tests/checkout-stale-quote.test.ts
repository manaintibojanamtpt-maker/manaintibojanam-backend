import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('checkout stale quote recovery', () => {
  it('clears cached prepare session when prepare fails', () => {
    const session = readFileSync(
      join(root, 'src/features/checkout/infrastructure/checkoutQuoteSession.ts'),
      'utf8',
    );
    assert.match(session, /clearCheckoutPrepareSessionForCart/);
  });

  it('does not keep stale session quote visible after prepare errors', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );
    assert.match(checkoutFlow, /clearCheckoutPrepareSessionForCart/);
    assert.match(checkoutFlow, /hasFreshPrepare/);
    assert.doesNotMatch(checkoutFlow, /prepareQuery\.data \?\? sessionPrepare/);
  });

  it('validates cart before checkout prepare runs', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );
    assert.match(checkoutFlow, /useCartValidation/);
    assert.match(checkoutFlow, /cartValidationReady/);
    assert.match(checkoutFlow, /cartIsValid/);
  });

  it('shows cart sync messages on checkout page', () => {
    const checkoutPage = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );
    assert.match(checkoutPage, /cartSyncMessages/);
  });
});
