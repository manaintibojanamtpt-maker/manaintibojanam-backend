import { useEffect, useMemo, useState } from 'react';
import {
  BottomSheet,
  Button,
  Input,
  Text,
} from '@bhojan/design-system';
import type { IndiaAddress } from '../domain/location.types';
import { savedAddressInputSchema, type SavedAddressInput } from '../domain/location.schema';
import {
  DEFAULT_ADDRESS_CASCADE,
  cascadeFromArea,
  cascadeFromCity,
  cascadeFromDistrict,
  cascadeFromState,
  ensureValidCascade,
  inferCascadeFromDisplayLabel,
  listAreas,
  listCities,
  listDistricts,
  listStates,
  type AddressCascadeSelection,
  validatePincodeForArea,
} from '../data/india/reference';
import { useLocationActions } from '../hooks/useLocationActions';
import { useActiveLocation } from '../hooks/useActiveLocation';
import { MapPinPicker } from './MapPinPicker';

interface AddressFormSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const PUNE_COORDS = { lat: 18.5362, lng: 73.8958, source: 'map_pin' as const, capturedAt: new Date().toISOString() };

function resolveInitialCascade(displayLabel?: string): AddressCascadeSelection {
  if (displayLabel) {
    const inferred = inferCascadeFromDisplayLabel(displayLabel);
    if (inferred) return ensureValidCascade(inferred);
  }
  return DEFAULT_ADDRESS_CASCADE;
}

export function AddressFormSheet({ open, onClose }: AddressFormSheetProps) {
  const { saveNewAddress } = useLocationActions();
  const active = useActiveLocation();
  const [label, setLabel] = useState<SavedAddressInput['label']>('home');
  const [customLabel, setCustomLabel] = useState('');
  const [selection, setSelection] = useState<AddressCascadeSelection>(() =>
    resolveInitialCascade(active?.displayLabel),
  );
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [coordinates, setCoordinates] = useState(() => active?.coordinates ?? PUNE_COORDS);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { stateCode, districtCode, cityCode, areaCode, pincode } = selection;

  useEffect(() => {
    if (!open) return;
    const next = resolveInitialCascade(active?.displayLabel);
    setSelection(next);
    setStreet('');
    setLandmark('');
    setError(null);
    if (active?.coordinates) {
      setCoordinates(active.coordinates);
    }
  }, [open, active?.displayLabel, active?.coordinates]);

  const states = useMemo(() => listStates(), []);
  const districts = useMemo(() => listDistricts(stateCode), [stateCode]);
  const cities = useMemo(() => listCities(districtCode), [districtCode]);
  const areas = useMemo(() => listAreas(cityCode), [cityCode]);

  const buildAddress = (): IndiaAddress => {
    const state = states.find((s) => s.code === stateCode)!;
    const district = districts.find((d) => d.code === districtCode)!;
    const city = cities.find((c) => c.code === cityCode)!;
    const area = areas.find((a) => a.code === areaCode)!;
    const formattedAddress = `${street}, ${area.name}, ${city.name}, ${state.name} ${pincode}`;
    return {
      country: 'IN',
      stateCode,
      stateName: state.name,
      districtCode,
      districtName: district.name,
      cityCode,
      cityName: city.name,
      areaCode,
      areaName: area.name,
      pincode,
      street,
      landmark: landmark || undefined,
      coordinates,
      formattedAddress,
    };
  };

  const handleSave = async () => {
    setError(null);
    if (!street.trim()) {
      setError('Street / house is required');
      return;
    }
    if (!validatePincodeForArea(areaCode, pincode)) {
      setError('Pincode does not match selected area');
      return;
    }
    const input: SavedAddressInput = {
      label,
      customLabel: label === 'other' ? customLabel : undefined,
      isDefault: false,
      address: buildAddress(),
    };
    const parsed = savedAddressInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid address');
      return;
    }
    setSaving(true);
    try {
      await saveNewAddress(parsed.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add address">
      <div className="ob-address-form">
        <div className="ob-address-form__labels" role="group" aria-label="Address label">
          {(['home', 'work', 'other'] as const).map((value) => (
            <Button
              key={value}
              variant={label === value ? 'primary' : 'secondary'}
              size="compact"
              onClick={() => setLabel(value)}
            >
              {value}
            </Button>
          ))}
        </div>

        {label === 'other' ? (
          <Input label="Custom label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
        ) : null}

        <label className="ob-address-form__field">
          <Text variant="caption" className="ob-address-form__label">State</Text>
          <select
            className="ob-address-form__select"
            value={stateCode}
            onChange={(e) => setSelection(cascadeFromState(e.target.value))}
            aria-label="State"
          >
            {states.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="ob-address-form__field">
          <Text variant="caption" className="ob-address-form__label">District</Text>
          <select
            className="ob-address-form__select"
            value={districtCode}
            onChange={(e) => setSelection(cascadeFromDistrict(stateCode, e.target.value))}
            aria-label="District"
          >
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className="ob-address-form__field">
          <Text variant="caption" className="ob-address-form__label">City</Text>
          <select
            className="ob-address-form__select"
            value={cityCode}
            onChange={(e) => setSelection(cascadeFromCity(stateCode, districtCode, e.target.value))}
            aria-label="City"
          >
            {cities.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="ob-address-form__field">
          <Text variant="caption" className="ob-address-form__label">Area</Text>
          <select
            className="ob-address-form__select"
            value={areaCode}
            onChange={(e) => setSelection(cascadeFromArea(stateCode, districtCode, cityCode, e.target.value))}
            aria-label="Area"
          >
            {areas.map((a) => (
              <option key={a.code} value={a.code}>{a.name}</option>
            ))}
          </select>
        </label>

        <Input label="Pincode" inputMode="numeric" value={pincode} onChange={(e) => setSelection((prev) => ({ ...prev, pincode: e.target.value }))} />
        <Input label="Street / House" value={street} onChange={(e) => setStreet(e.target.value)} />
        <Input label="Landmark (optional)" value={landmark} onChange={(e) => setLandmark(e.target.value)} />

        <MapPinPicker coordinates={coordinates} onChange={setCoordinates} />

        {error ? (
          <Text variant="caption" role="alert" style={{ color: 'var(--bds-color-error)' }}>{error}</Text>
        ) : null}

        <Button variant="primary" fullWidth onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save address'}
        </Button>
      </div>
    </BottomSheet>
  );
}
