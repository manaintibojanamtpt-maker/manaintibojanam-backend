import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner settings API migration', () => {
  it('loads and saves storefront settings via owner API', () => {
    const settingsSource = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerSettings.tsx'),
      'utf8',
    );
    assert.match(settingsSource, /fetchOwnerStorefront/);
    assert.match(settingsSource, /updateOwnerStorefront/);
    assert.match(settingsSource, /OwnerFestivalOffersPanel/);
    assert.doesNotMatch(settingsSource, /updateDoc\(tenantRef/);

    const gallerySource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/owner/OwnerGalleryThemePanel.tsx'),
      'utf8',
    );
    assert.match(gallerySource, /updateOwnerStorefront/);
    assert.match(gallerySource, /marketplace:/);
  });
});
