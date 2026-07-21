import { useMemo, useState } from 'react';
import BottomSheet from '@bhojan/storefront-design-system/layout/BottomSheet';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { TextFieldView } from '@bhojan/storefront-design-system/primitives/TextFieldView';
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
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLocationActions } from '../hooks/useLocationActions';
import { useActiveLocation } from '../hooks/useActiveLocation';
import { MapPinPicker } from './MapPinPicker';

interface AddressFormSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const FIELD_CLASS = 'flex w-full flex-col gap-1.5';
const SELECT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF7A00]/50';

function resolveInitialCascade(displayLabel?: string): AddressCascadeSelection {
  if (displayLabel) {
    const inferred = inferCascadeFromDisplayLabel(displayLabel);
    if (inferred) return ensureValidCascade(inferred);
  }
  return DEFAULT_ADDRESS_CASCADE;
}

function AddressFormSheetContent({ onClose }: { readonly onClose: () => void }) {
  const { saveNewAddress, setManualSession, requestCurrentLocation } = useLocationActions();
  const { isAuthenticated } = useAuth();
  const active = useActiveLocation();
  const [label, setLabel] = useState<SavedAddressInput['label']>('home');
  const [customLabel, setCustomLabel] = useState('');
  const [selection, setSelection] = useState<AddressCascadeSelection>(() =>
    resolveInitialCascade(active?.displayLabel),
  );
  const [house, setHouse] = useState('');
  const [building, setBuilding] = useState('');
  const [landmark, setLandmark] = useState('');
  const [coordinates, setCoordinates] = useState<IndiaAddress['coordinates'] | null>(
    () => active?.coordinates ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { stateCode, districtCode, cityCode, areaCode, pincode } = selection;

  const states = useMemo(() => listStates(), []);
  const districts = useMemo(() => listDistricts(stateCode), [stateCode]);
  const cities = useMemo(() => listCities(districtCode), [districtCode]);
  const areas = useMemo(() => listAreas(cityCode), [cityCode]);

  const buildAddress = (): IndiaAddress => {
    if (!coordinates) {
      throw new Error('Map pin is required');
    }
    const state = states.find((s) => s.code === stateCode)!;
    const district = districts.find((d) => d.code === districtCode)!;
    const city = cities.find((c) => c.code === cityCode)!;
    const area = areas.find((a) => a.code === areaCode)!;
    const street = [house.trim(), building.trim()].filter(Boolean).join(', ');
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
    if (!house.trim()) {
      setError('House / flat number is required');
      return;
    }
    if (!coordinates) {
      setError('Set a map pin or use current location before saving');
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
      if (isAuthenticated) {
        await saveNewAddress(parsed.data);
      } else {
        const address = buildAddress();
        const sessionLabel = address.formattedAddress ?? address.street;
        await setManualSession(address.coordinates, sessionLabel);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen onClose={onClose} title="Add address" panelClassName="bg-[#120e0c] text-white">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Address label">
          {(['home', 'work', 'other'] as const).map((value) => (
            <SoftButton
              key={value}
              type="button"
              tone={label === value ? 'primary' : 'secondary'}
              size="compact"
              onClick={() => setLabel(value)}
            >
              {value}
            </SoftButton>
          ))}
        </div>

        {label === 'other' ? (
          <TextFieldView label="Custom label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
        ) : null}

        <label className={FIELD_CLASS}>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">State</span>
          <select
            className={SELECT_CLASS}
            value={stateCode}
            onChange={(e) => setSelection(cascadeFromState(e.target.value))}
            aria-label="State"
          >
            {states.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className={FIELD_CLASS}>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">District</span>
          <select
            className={SELECT_CLASS}
            value={districtCode}
            onChange={(e) => setSelection(cascadeFromDistrict(stateCode, e.target.value))}
            aria-label="District"
          >
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className={FIELD_CLASS}>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">City</span>
          <select
            className={SELECT_CLASS}
            value={cityCode}
            onChange={(e) => setSelection(cascadeFromCity(stateCode, districtCode, e.target.value))}
            aria-label="City"
          >
            {cities.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className={FIELD_CLASS}>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Area</span>
          <select
            className={SELECT_CLASS}
            value={areaCode}
            onChange={(e) => setSelection(cascadeFromArea(stateCode, districtCode, cityCode, e.target.value))}
            aria-label="Area"
          >
            {areas.map((a) => (
              <option key={a.code} value={a.code}>{a.name}</option>
            ))}
          </select>
        </label>

        <TextFieldView label="Pincode" inputMode="numeric" value={pincode} onChange={(e) => setSelection((prev) => ({ ...prev, pincode: e.target.value }))} />
        <TextFieldView label="House / Flat No." value={house} onChange={(e) => setHouse(e.target.value)} />
        <TextFieldView label="Building / Apartment" value={building} onChange={(e) => setBuilding(e.target.value)} />
        <TextFieldView label="Landmark (optional)" value={landmark} onChange={(e) => setLandmark(e.target.value)} />

        <MapPinPicker
          coordinates={
            coordinates ?? {
              lat: 0,
              lng: 0,
              source: 'manual',
              capturedAt: new Date().toISOString(),
            }
          }
          onChange={setCoordinates}
        />

        {!coordinates ? (
          <SoftButton type="button" tone="secondary" fullWidth onClick={() => void requestCurrentLocation()}>
            Use current location for map pin
          </SoftButton>
        ) : null}

        {error ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : null}

        <SoftButton type="button" fullWidth onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save address'}
        </SoftButton>
      </div>
    </BottomSheet>
  );
}

export function AddressFormSheet({ open, onClose }: AddressFormSheetProps) {
  if (!open) return null;
  return <AddressFormSheetContent onClose={onClose} />;
}
