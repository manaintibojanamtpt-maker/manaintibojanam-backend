/**
 * Android checklist for device-push status (#8/#9).
 * Usage: node scripts/android-cdp-verify-push.mjs <wsUrl>
 */
import WebSocket from 'ws';

const wsUrl = process.argv[2];
if (!wsUrl) {
  console.error('Missing wsUrl');
  process.exit(2);
}

function createClient(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const ready = new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  return { ws, send, ready };
}

async function evaluate(send, expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}

function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function readSettingsPushValue(send) {
  await evaluate(send, `location.assign('/settings')`, true);
  await new Promise((r) => setTimeout(r, 1500));
  // Profile/settings may live under /profile — try both
  let body = await evaluate(send, `document.body.innerText.replace(/\\s+/g,' ')`);
  if (!/Push notifications/i.test(body || '')) {
    await evaluate(send, `location.assign('/profile')`, true);
    await new Promise((r) => setTimeout(r, 1500));
    body = await evaluate(send, `document.body.innerText.replace(/\\s+/g,' ')`);
  }
  const match = (body || '').match(/Push notifications\s+(On this device|Needs setup|Blocked|Off|…|On)/i);
  return {
    bodySnippet: (body || '').slice(0, 400),
    value: match?.[1] ?? null,
  };
}

async function readNotificationsState(send) {
  await evaluate(send, `location.assign('/notifications')`, true);
  await new Promise((r) => setTimeout(r, 1800));
  return evaluate(
    send,
    `(() => {
      const body = document.body.innerText.replace(/\\s+/g, ' ');
      const buttons = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean);
      return {
        guest: /Sign in for notifications/i.test(body),
        hasEnable: buttons.some((b) => /Enable push notifications/i.test(b)),
        hasRegister: buttons.some((b) => /Register this device/i.test(b)),
        hasReregister: buttons.some((b) => /Re-register this device/i.test(b)),
        hasEnabledBanner: /Notifications enabled on this device/i.test(body),
        hasAllowedCopy: /allowed on this device|Tap Register/i.test(body),
        hasBlockedCopy: /blocked for this app|not granted/i.test(body),
        buttons,
        snippet: body.slice(0, 450),
        storage: localStorage.getItem('ob-device-push-registration-v1'),
      };
    })()`,
  );
}

async function main() {
  const phase = process.argv[3] || 'check';
  const { ws, send, ready } = createClient(wsUrl);
  await ready;
  await send('Runtime.enable');

  const results = [];
  if (phase === 'fresh') {
    const settings = await readSettingsPushValue(send);
    results.push(
      report(
        'fresh install Settings not false On',
        settings.value != null && settings.value !== 'On',
        `value=${settings.value}`,
      ),
    );
    const notif = await readNotificationsState(send);
    if (notif.guest) {
      results.push(report('fresh notifications guest gate', true, 'sign-in required'));
    } else {
      results.push(
        report(
          'fresh allowed-unregistered OR off CTA',
          Boolean(notif.hasRegister || notif.hasEnable) && !notif.hasEnabledBanner,
          JSON.stringify(notif),
        ),
      );
    }
  } else if (phase === 'allowed-unregistered') {
    const notif = await readNotificationsState(send);
    results.push(
      report(
        'allowed but unregistered shows Register',
        Boolean(notif.hasRegister) && !notif.hasEnable && !notif.hasEnabledBanner,
        JSON.stringify(notif),
      ),
    );
    const settings = await readSettingsPushValue(send);
    results.push(
      report(
        'Settings Needs setup when allowed unregistered',
        settings.value === 'Needs setup' || settings.value === 'Off',
        `value=${settings.value}`,
      ),
    );
  } else if (phase === 'after-register') {
    // Attempt register click if button present
    await evaluate(send, `location.assign('/notifications')`, true);
    await new Promise((r) => setTimeout(r, 1200));
    await evaluate(
      send,
      `(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => /Register this device|Enable push|Re-register/i.test(b.textContent || ''));
        btn?.click();
        return Boolean(btn);
      })()`,
    );
    await new Promise((r) => setTimeout(r, 6000));
    const notif = await readNotificationsState(send);
    results.push(
      report(
        'register success enabled banner',
        Boolean(notif.hasEnabledBanner || notif.hasReregister || notif.storage),
        JSON.stringify(notif),
      ),
    );
  } else if (phase === 'hydration') {
    await evaluate(send, `location.assign('/')`, true);
    await new Promise((r) => setTimeout(r, 800));
    const notif = await readNotificationsState(send);
    results.push(
      report(
        'leave/reopen hydration keeps enabled',
        Boolean(notif.hasEnabledBanner || (notif.storage && notif.hasReregister)),
        JSON.stringify(notif),
      ),
    );
    const settings = await readSettingsPushValue(send);
    results.push(
      report('Settings On this device', settings.value === 'On this device', `value=${settings.value}`),
    );
  } else if (phase === 'blocked') {
    const settings = await readSettingsPushValue(send);
    results.push(report('Settings Blocked', settings.value === 'Blocked', `value=${settings.value}`));
    const notif = await readNotificationsState(send);
    results.push(
      report(
        'Notifications blocked copy',
        Boolean(notif.hasBlockedCopy || notif.hasEnable),
        JSON.stringify(notif),
      ),
    );
  } else if (phase === 'reallow') {
    const settings = await readSettingsPushValue(send);
    const notif = await readNotificationsState(send);
    const ok =
      settings.value === 'On this device' ||
      settings.value === 'Needs setup' ||
      notif.hasEnabledBanner ||
      notif.hasRegister;
    results.push(
      report(
        're-allow resumes correct state',
        Boolean(ok) && settings.value !== 'Blocked',
        `settings=${settings.value} notif=${JSON.stringify(notif)}`,
      ),
    );
  } else {
    const settings = await readSettingsPushValue(send);
    const notif = await readNotificationsState(send);
    console.log(JSON.stringify({ settings, notif }, null, 2));
  }

  const failed = results.filter((ok) => !ok).length;
  console.log(`SUMMARY ${phase}: ${results.length - failed}/${results.length} passed`);
  ws.close();
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('VERIFY_ERROR', err);
  process.exit(2);
});
