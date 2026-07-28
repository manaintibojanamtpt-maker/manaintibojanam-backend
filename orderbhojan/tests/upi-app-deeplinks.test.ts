import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAndroidUpiIntent,
  buildUpiAppDeepLink,
  buildUpiAppDeepLinkCandidates,
  buildUpiCopyText,
  buildUpiQueryString,
  extractUpiPayeeAddress,
  parseUpiPayUrl,
} from '../src/features/checkout/infrastructure/upiCheckout.ts';

const SAMPLE_UPI_URL =
  'upi://pay?pa=kitchen%40paytm&pn=Test%20Kitchen&am=299.00&tr=ord_123&tn=Order%20ob_123&cu=INR';

describe('UPI app deep links', () => {
  it('parses standard upi://pay URLs', () => {
    const params = parseUpiPayUrl(SAMPLE_UPI_URL);
    assert.ok(params);
    assert.equal(params.pa, 'kitchen@paytm');
    assert.equal(params.pn, 'Test Kitchen');
    assert.equal(params.am, '299.00');
    assert.equal(params.tr, 'ord_123');
    assert.equal(params.cu, 'INR');
  });

  it('builds Google Pay deep link with same payment params', () => {
    const url = buildUpiAppDeepLink('gpay', SAMPLE_UPI_URL);
    assert.ok(url);
    assert.match(url, /^tez:\/\/upi\/pay\?/);
    assert.match(url, /pa=kitchen%40paytm/);
    assert.match(url, /am=299\.00/);
    assert.match(url, /tr=ord_123/);
    assert.match(url, /cu=INR/);
  });

  it('includes gpay:// fallback candidate for Google Pay', () => {
    const candidates = buildUpiAppDeepLinkCandidates('gpay', SAMPLE_UPI_URL);
    assert.ok(candidates.some((url) => url.startsWith('tez://upi/pay?')));
    assert.ok(candidates.some((url) => url.startsWith('gpay://upi/pay?')));
  });

  it('builds PhonePe deep link', () => {
    const url = buildUpiAppDeepLink('phonepe', SAMPLE_UPI_URL);
    assert.ok(url);
    assert.match(url, /^phonepe:\/\/pay\?/);
    assert.match(url, /pn=Test%20Kitchen/);
  });

  it('builds Paytm deep link', () => {
    const url = buildUpiAppDeepLink('paytm', SAMPLE_UPI_URL);
    assert.ok(url);
    assert.match(url, /^paytmmp:\/\/pay\?/);
    assert.match(url, /tn=Order%20ob_123/);
  });

  it('builds generic upi:// link for other on non-Android', () => {
    const url = buildUpiAppDeepLink('other', SAMPLE_UPI_URL);
    assert.ok(url);
    assert.match(url, /^upi:\/\/pay\?/);
  });

  it('builds Android intent URL with VIEW action', () => {
    const params = parseUpiPayUrl(SAMPLE_UPI_URL);
    assert.ok(params);
    const intent = buildAndroidUpiIntent(params);
    assert.match(intent, /^intent:\/\/pay\?/);
    assert.match(intent, /scheme=upi/);
    assert.match(intent, /action=android\.intent\.action\.VIEW/);
    assert.match(intent, /;end$/);
    assert.match(intent, /pa=kitchen%40paytm/);
  });

  it('preserves query param order for NPCI fields', () => {
    const query = buildUpiQueryString({
      cu: 'INR',
      pa: 'kitchen@paytm',
      am: '10.00',
      pn: 'Kitchen',
    });
    assert.equal(query.indexOf('pa=') < query.indexOf('pn='), true);
    assert.equal(query.indexOf('pn=') < query.indexOf('am='), true);
    assert.equal(query.indexOf('am=') < query.indexOf('cu='), true);
  });

  it('extracts payee address for copy fallback', () => {
    assert.equal(extractUpiPayeeAddress(SAMPLE_UPI_URL), 'kitchen@paytm');
  });

  it('builds human-readable copy text', () => {
    const text = buildUpiCopyText({
      upiUrl: SAMPLE_UPI_URL,
      amount: 299,
      orderNumber: '100031',
    });
    assert.match(text, /299\.00 INR/);
    assert.match(text, /kitchen@paytm/);
    assert.match(text, /#100031/);
  });
});
