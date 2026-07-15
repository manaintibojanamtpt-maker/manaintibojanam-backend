import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { clearReverseGeocodeCache } from '../cache.js';
import { reverseGeocode, reverseGeocodeWithNominatim } from '../reverseGeocode.js';

const mockResponse = {
  place_id: 123,
  osm_type: 'way',
  osm_id: 456,
  name: 'Test Building',
  display_name: 'Test Building, Koregaon Park, Pune, Maharashtra, 411001, India',
  address: {
    building: 'Test Building',
    road: 'North Avenue',
    suburb: 'Koregaon Park',
    city: 'Pune',
    state: 'Maharashtra',
    postcode: '411001',
    country: 'India',
  },
};

describe('reverseGeocode', () => {
  beforeEach(() => {
    clearReverseGeocodeCache();
  });

  it('normalizes mocked Nominatim response', async () => {
    const fetchPort = async () =>
      new Response(JSON.stringify(mockResponse), { status: 200 });

    const raw = await reverseGeocodeWithNominatim({ lat: 18.53, lng: 73.89 }, fetchPort);
    assert.equal(raw.address?.city, 'Pune');

    const result = await reverseGeocode({ lat: 18.53, lng: 73.89 }, fetchPort);
    assert.equal(result.displayLabel, 'Koregaon Park, Pune');
    assert.equal(result.text.building, 'Test Building');
    assert.equal(result.meta.provider, 'nominatim');
  });

  it('serves cached reverse geocode on repeat calls', async () => {
    let calls = 0;
    const fetchPort = async () => {
      calls += 1;
      return new Response(JSON.stringify(mockResponse), { status: 200 });
    };

    await reverseGeocode({ lat: 18.5312301, lng: 73.8912301 }, fetchPort);
    await reverseGeocode({ lat: 18.5312308, lng: 73.8912308 }, fetchPort);
    assert.equal(calls, 1);
  });

  it('rejects invalid coordinates', async () => {
    await assert.rejects(() => reverseGeocode({ lat: Number.NaN, lng: 1 }));
  });
});
