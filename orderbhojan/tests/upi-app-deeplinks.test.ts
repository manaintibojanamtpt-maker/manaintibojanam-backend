import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAndroidUpiIntent,
  buildUpiAppDeepLink,
  buildUpiAppDeepLinkCandidates,
  buildUpiCopyText,
  buildUpiQueryString,
  extractUpiMobileNumber,
  extractUpiPayeeAddress,
  parseUpiPayUrl,
  resolveUpiSecurityPayOptions,
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

  it('detects mobile-registered UPI for the security-decline manual fallback', () => {
    const options = resolveUpiSecurityPayOptions(
      'upi://pay?pa=9876543210%40ybl&pn=Kitchen&am=10.00&cu=INR',
    );
    assert.ok(options);
    assert.equal(options.upiId, '9876543210@ybl');
    assert.equal(options.mobileNumber, '9876543210');
  });

  it('does not offer a mobile number for non-mobile UPI IDs', () => {
    const options = resolveUpiSecurityPayOptions(SAMPLE_UPI_URL);
    assert.ok(options);
    assert.equal(options.upiId, 'kitchen@paytm');
    assert.equal(options.mobileNumber, undefined);
  });

  it('extracts the mobile-registered payee number from a UPI URL', () => {
    const url = 'upi://pay?pa=919812345678%40axisb&am=50.00&cu=INR';
    assert.equal(extractUpiMobileNumber(url), '919812345678');
    assert.equal(extractUpiMobileNumber(SAMPLE_UPI_URL), undefined);
  });

  it('returns null security-pay options when no payee is in the URL', () => {
    assert.equal(resolveUpiSecurityPayOptions('upi://pay?am=10&cu=INR'), null);
  });
});

function extractQueryParams(link: string): Record<string, string> {
  const trimmed = link.trim();
  const fragment = trimmed.indexOf('#Intent');
  const withoutFragment = fragment === -1 ? trimmed : trimmed.slice(0, fragment);
  const queryAt = withoutFragment.indexOf('?');
  if (queryAt === -1) return {};
  const query = withoutFragment.slice(queryAt + 1);
  const params: Record<string, string> = {};
  new URL(`https://payload.invalid/?${query}`).searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

describe('UPI deep link candidate ordering on Android (platform-explicit)', () => {
  const ANDROID = 'android' as const;
  const pinnedPackages: ReadonlyArray<readonly [string, string]> = [
    ['gpay', 'com.google.android.apps.nbu.paisa.user'],
    ['phonepe', 'com.phonepe.app'],
    ['paytm', 'net.one97.paytm'],
  ];

  for (const [appId, pkg] of pinnedPackages) {
    it(`${appId}: candidate[0] is a package-pinned Android intent`, () => {
      const candidates = buildUpiAppDeepLinkCandidates(appId, SAMPLE_UPI_URL, undefined, ANDROID);
      assert.ok(candidates.length > 0, `missing ${appId} candidates on Android`);
      assert.match(candidates[0]!, /^intent:\/\/pay\?/);
      assert.ok(candidates[0]!.includes(';scheme=upi;'));
      assert.ok(candidates[0]!.includes(`;package=${pkg};`));

      const single = buildUpiAppDeepLink(appId, SAMPLE_UPI_URL, undefined, ANDROID);
      assert.ok(single);
      assert.match(single!, /^intent:\/\/pay\?/);
    });
  }

  it('other: candidate[0] remains canonical upi:// on Android', () => {
    const candidates = buildUpiAppDeepLinkCandidates('other', SAMPLE_UPI_URL, undefined, ANDROID);
    assert.ok(candidates.length > 0);
    assert.match(candidates[0]!, /^upi:\/\/pay\?/);
  });

  it('every Android candidate keeps the identical underlying UPI payload fields', () => {
    const original = extractQueryParams(SAMPLE_UPI_URL);
    const fields = ['pa', 'pn', 'am', 'tr', 'tn', 'cu'] as const;
    for (const appId of ['gpay', 'phonepe', 'paytm', 'other'] as const) {
      const candidates = buildUpiAppDeepLinkCandidates(appId, SAMPLE_UPI_URL, undefined, ANDROID);
      assert.ok(candidates.length > 0, `missing ${appId} candidates on Android`);
      for (const candidate of candidates) {
        const params = extractQueryParams(candidate);
        for (const field of fields) {
          assert.equal(params[field], original[field], `${appId} [${candidate}] changed ${field}`);
        }
      }
    }
  });
});
