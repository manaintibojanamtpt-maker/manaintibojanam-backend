import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AddressSearchResult } from '../../sdk/location/dto/address';
import type { CanonicalLocation, OwnerAddressDraft, ReferenceSelectOption } from '../../lib/ownerLocation/types';
import { EMPTY_OWNER_ADDRESS_DRAFT } from '../../lib/ownerLocation/types';
import {
  listOwnerRegistrationCities,
  listOwnerRegistrationDistricts,
  listOwnerRegistrationLocalities,
  listOwnerRegistrationPincodes,
  listOwnerRegistrationStates,
  resolveOwnerCanonicalLocation,
  searchOwnerRegistrationAddresses,
} from '../../lib/ownerLocationReads';
import type { DistrictId, CityId, LocalityId, StateId } from '../../sdk/reference/types/branded';
import { isSdkSuccess } from '../../sdk/core/resultHelpers';

interface StructuredOwnerAddressFormProps {
  readonly draft: OwnerAddressDraft;
  readonly onDraftChange: (draft: OwnerAddressDraft) => void;
  readonly onResolvedChange: (location: CanonicalLocation | null) => void;
  readonly disabled?: boolean;
}

const selectClassName =
  'w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 disabled:opacity-60';

const inputClassName =
  'w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 disabled:opacity-60';

const StructuredOwnerAddressForm: React.FC<StructuredOwnerAddressFormProps> = ({
  draft,
  onDraftChange,
  onResolvedChange,
  disabled = false,
}) => {
  const [states, setStates] = useState<ReferenceSelectOption[]>([]);
  const [districts, setDistricts] = useState<ReferenceSelectOption[]>([]);
  const [cities, setCities] = useState<ReferenceSelectOption[]>([]);
  const [localities, setLocalities] = useState<ReferenceSelectOption[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedPreview, setResolvedPreview] = useState<CanonicalLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingStates(true);
    void listOwnerRegistrationStates().then((result) => {
      if (cancelled) return;
      setLoadingStates(false);
      if (!isSdkSuccess(result)) {
        toast.error(result.error.message || 'Could not load states');
        return;
      }
      setStates(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const patchDraft = useCallback(
    (patch: Partial<OwnerAddressDraft>, resetResolved = true) => {
      if (resetResolved) {
        setResolvedPreview(null);
        onResolvedChange(null);
      }
      onDraftChange({ ...draft, ...patch });
    },
    [draft, onDraftChange, onResolvedChange]
  );

  useEffect(() => {
    if (!draft.stateId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingChildren(true);
    void listOwnerRegistrationDistricts(draft.stateId as StateId).then((result) => {
      if (cancelled) return;
      setLoadingChildren(false);
      if (!isSdkSuccess(result)) {
        toast.error(result.error.message || 'Could not load districts');
        return;
      }
      setDistricts(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.stateId]);

  useEffect(() => {
    if (!draft.districtId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingChildren(true);
    void listOwnerRegistrationCities(draft.districtId as DistrictId).then((result) => {
      if (cancelled) return;
      setLoadingChildren(false);
      if (!isSdkSuccess(result)) {
        toast.error(result.error.message || 'Could not load cities');
        return;
      }
      setCities(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.districtId]);

  useEffect(() => {
    if (!draft.cityId) {
      setLocalities([]);
      return;
    }
    let cancelled = false;
    setLoadingChildren(true);
    void listOwnerRegistrationLocalities(draft.cityId as CityId).then((result) => {
      if (cancelled) return;
      setLoadingChildren(false);
      if (!isSdkSuccess(result)) {
        toast.error(result.error.message || 'Could not load localities');
        return;
      }
      setLocalities(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.cityId]);

  useEffect(() => {
    if (!draft.localityId) {
      setPincodes([]);
      return;
    }
    let cancelled = false;
    void listOwnerRegistrationPincodes(draft.localityId as LocalityId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPincodes(result.value);
        if (result.value.length === 1 && !draft.pincode) {
          patchDraft({ pincode: result.value[0] ?? '' }, true);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.localityId, draft.pincode, patchDraft]);

  const handleStateChange = (stateId: string) => {
    const selected = states.find((entry) => entry.id === stateId);
    onDraftChange({
      ...EMPTY_OWNER_ADDRESS_DRAFT,
      street: draft.street,
      landmark: draft.landmark,
      searchQuery: draft.searchQuery,
      stateId,
      stateCode: selected?.code ?? '',
      stateName: selected?.name ?? '',
    });
    setResolvedPreview(null);
    onResolvedChange(null);
  };

  const handleDistrictChange = (districtId: string) => {
    const selected = districts.find((entry) => entry.id === districtId);
    patchDraft({
      districtId,
      districtCode: selected?.code ?? '',
      districtName: selected?.name ?? '',
      cityId: '',
      cityCode: '',
      cityName: '',
      localityId: '',
      localityCode: '',
      localityName: '',
      pincode: '',
    });
  };

  const handleCityChange = (cityId: string) => {
    const selected = cities.find((entry) => entry.id === cityId);
    patchDraft({
      cityId,
      cityCode: selected?.code ?? '',
      cityName: selected?.name ?? '',
      localityId: '',
      localityCode: '',
      localityName: '',
      pincode: '',
    });
  };

  const handleLocalityChange = (localityId: string) => {
    const selected = localities.find((entry) => entry.id === localityId);
    patchDraft({
      localityId,
      localityCode: selected?.code ?? '',
      localityName: selected?.name ?? '',
      pincode: '',
    });
  };

  const runSearch = async () => {
    const query = draft.searchQuery.trim();
    if (query.length < 3) {
      toast.error('Enter at least 3 characters to search');
      return;
    }
    setSearching(true);
    const result = await searchOwnerRegistrationAddresses(query);
    setSearching(false);
    if (!isSdkSuccess(result)) {
      toast.error(result.error.message || 'Address search failed');
      return;
    }
    setSearchResults(result.value);
    if (result.value.length === 0) {
      toast.error('No address matches found');
    }
  };

  const applySearchResult = (entry: AddressSearchResult) => {
    patchDraft({ street: entry.displayName.split(',')[0]?.trim() || entry.displayName }, false);
    setSearchResults([]);
  };

  const resolveCoordinates = async () => {
    setResolving(true);
    const result = await resolveOwnerCanonicalLocation(draft);
    setResolving(false);
    if (!isSdkSuccess(result)) {
      setResolvedPreview(null);
      onResolvedChange(null);
      toast.error(result.error.message || 'Could not resolve coordinates');
      return;
    }
    setResolvedPreview(result.value);
    onResolvedChange(result.value);
    toast.success('Coordinates and geohash resolved');
  };

  const pincodeOptions = useMemo(() => {
    if (pincodes.length > 0) {
      return pincodes;
    }
    return draft.pincode ? [draft.pincode] : [];
  }, [pincodes, draft.pincode]);

  return (
    <div className="space-y-4">
      <input type="hidden" name="country" value="IN" readOnly />

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
        <select
          value={draft.stateId}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={disabled || loadingStates}
          className={selectClassName}
        >
          <option value="">Select state</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">District</label>
          <select
            value={draft.districtId}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={disabled || !draft.stateId || loadingChildren}
            className={selectClassName}
          >
            <option value="">Select district</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
          <select
            value={draft.cityId}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={disabled || !draft.districtId || loadingChildren}
            className={selectClassName}
          >
            <option value="">Select city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Locality</label>
          <select
            value={draft.localityId}
            onChange={(e) => handleLocalityChange(e.target.value)}
            disabled={disabled || !draft.cityId || loadingChildren}
            className={selectClassName}
          >
            <option value="">Select locality</option>
            {localities.map((locality) => (
              <option key={locality.id} value={locality.id}>
                {locality.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Pincode</label>
          <select
            value={draft.pincode}
            onChange={(e) => patchDraft({ pincode: e.target.value })}
            disabled={disabled || !draft.localityId}
            className={selectClassName}
          >
            <option value="">Select pincode</option>
            {pincodeOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Street / Building</label>
        <input
          type="text"
          value={draft.street}
          onChange={(e) => patchDraft({ street: e.target.value })}
          placeholder="House no., street, building name"
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Landmark <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="text"
          value={draft.landmark}
          onChange={(e) => patchDraft({ landmark: e.target.value })}
          placeholder="Near metro, mall, or landmark"
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Search address</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft.searchQuery}
            onChange={(e) => patchDraft({ searchQuery: e.target.value }, false)}
            placeholder="Search to assist street entry"
            disabled={disabled}
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={disabled || searching}
            className="shrink-0 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
        {searchResults.length > 0 && (
          <ul className="mt-2 rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
            {searchResults.map((entry) => (
              <li key={`${entry.displayName}-${entry.point.lat}-${entry.point.lng}`}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/5"
                  onClick={() => applySearchResult(entry)}
                >
                  {entry.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void resolveCoordinates()}
        disabled={disabled || resolving}
        className="w-full px-4 py-3 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-200 hover:bg-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
      >
        {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        Resolve coordinates & geohash
      </button>

      {resolvedPreview && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 space-y-1">
          <p className="font-semibold text-emerald-300">Canonical location ready</p>
          <p>Lat: {resolvedPreview.lat.toFixed(6)} · Lng: {resolvedPreview.lng.toFixed(6)}</p>
          <p>Geohash: {resolvedPreview.geohash}</p>
          <p className="text-emerald-200/80">{resolvedPreview.formattedAddress}</p>
        </div>
      )}
    </div>
  );
};

export default StructuredOwnerAddressForm;
