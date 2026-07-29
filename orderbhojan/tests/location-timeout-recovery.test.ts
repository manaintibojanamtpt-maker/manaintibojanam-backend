import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const repoRoot = resolve(root, '..');

describe('location timeout recovery', () => {
  it('uses a longer GPS timeout and maps TIMEOUT distinctly', () => {
    const coreGeo = readFileSync(join(repoRoot, 'packages/location-core/src/geolocation.ts'), 'utf8');
    const flow = readFileSync(join(root, 'src/features/location/application/obLocationFlowService.ts'), 'utf8');
    const selector = readFileSync(join(root, 'src/features/location/ui/LocationSelectorSheet.tsx'), 'utf8');
    const actions = readFileSync(join(root, 'src/features/location/hooks/useLocationActions.ts'), 'utf8');

    assert.match(coreGeo, /timeout:\s*15_000/);
    assert.match(flow, /LOCATION_ERROR_CODES\.TIMEOUT/);
    assert.match(flow, /Enter your address manually/);
    assert.match(selector, /Enter address manually/);
    assert.match(selector, /openManualAddressForm/);
    assert.match(actions, /Keep the selector open while GPS runs/);
    assert.doesNotMatch(actions, /activeStore\.setSelectorOpen\(false\);\s*activeStore\.setPermissionState\('prompting'\)/);
  });

  it('location chip keeps partial area labels instead of blank placeholder only', () => {
    const chip = readFileSync(join(root, 'src/features/location/ui/LocationChip.tsx'), 'utf8');
    assert.match(chip, /Add flat ·/);
    assert.match(chip, /resolveActiveDeliveryLocation/);
    assert.match(chip, /openSelector\(\)/);
  });
});
