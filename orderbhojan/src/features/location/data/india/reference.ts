import states from './states.json';

export interface IndiaReferenceOption {
  readonly code: string;
  readonly name: string;
}

const DISTRICTS: Record<string, IndiaReferenceOption[]> = {
  MH: [{ code: 'MH-PUN', name: 'Pune' }, { code: 'MH-MUM', name: 'Mumbai' }],
  TS: [{ code: 'TS-HYD', name: 'Hyderabad' }],
  KA: [{ code: 'KA-BLR', name: 'Bengaluru' }],
  DL: [{ code: 'DL-ND', name: 'New Delhi' }],
};

const CITIES: Record<string, IndiaReferenceOption[]> = {
  'MH-PUN': [{ code: 'pune', name: 'Pune' }],
  'MH-MUM': [{ code: 'mumbai', name: 'Mumbai' }],
  'TS-HYD': [{ code: 'hyderabad', name: 'Hyderabad' }],
  'TG-HYD': [{ code: 'hyderabad', name: 'Hyderabad' }],
  'KA-BLR': [{ code: 'bengaluru', name: 'Bengaluru' }],
  'DL-ND': [{ code: 'new-delhi', name: 'New Delhi' }],
};

const AREAS: Record<string, IndiaReferenceOption[]> = {
  pune: [
    { code: 'koregaon-park', name: 'Koregaon Park' },
    { code: 'baner', name: 'Baner' },
    { code: 'vimannagar', name: 'Viman Nagar' },
  ],
  hyderabad: [
    { code: 'madhapur', name: 'Madhapur' },
    { code: 'gachibowli', name: 'Gachibowli' },
    { code: 'hitech-city', name: 'HITEC City' },
  ],
  bengaluru: [
    { code: 'indiranagar', name: 'Indiranagar' },
    { code: 'koramangala', name: 'Koramangala' },
  ],
  mumbai: [{ code: 'andheri', name: 'Andheri West' }],
  'new-delhi': [{ code: 'connaught', name: 'Connaught Place' }],
};

const PINCODES: Record<string, string[]> = {
  'koregaon-park': ['411001', '411036'],
  madhapur: ['500081'],
  gachibowli: ['500032'],
  baner: ['411045'],
  vimannagar: ['411014'],
  'hitech-city': ['500081'],
  indiranagar: ['560038'],
  koramangala: ['560034'],
  andheri: ['400053'],
  connaught: ['110001'],
};

export interface AddressCascadeSelection {
  readonly stateCode: string;
  readonly districtCode: string;
  readonly cityCode: string;
  readonly areaCode: string;
  readonly pincode: string;
}

export const DEFAULT_ADDRESS_CASCADE: AddressCascadeSelection = {
  stateCode: 'MH',
  districtCode: 'MH-PUN',
  cityCode: 'pune',
  areaCode: 'koregaon-park',
  pincode: '411001',
};

function findDistrictForCity(cityCode: string): string | null {
  for (const [districtCode, cities] of Object.entries(CITIES)) {
    if (cities.some((city) => city.code === cityCode)) return districtCode;
  }
  return null;
}

function findStateForDistrict(districtCode: string): string | null {
  for (const [stateCode, districts] of Object.entries(DISTRICTS)) {
    if (districts.some((district) => district.code === districtCode)) return stateCode;
  }
  return null;
}

export function getDefaultPincodeForArea(areaCode: string): string {
  return PINCODES[areaCode]?.[0] ?? '';
}

export function cascadeFromState(stateCode: string): AddressCascadeSelection {
  const district = listDistricts(stateCode)[0];
  if (!district) {
    return { ...DEFAULT_ADDRESS_CASCADE, stateCode };
  }
  return cascadeFromDistrict(stateCode, district.code);
}

export function cascadeFromDistrict(stateCode: string, districtCode: string): AddressCascadeSelection {
  const city = listCities(districtCode)[0];
  if (!city) {
    return { ...DEFAULT_ADDRESS_CASCADE, stateCode, districtCode };
  }
  return cascadeFromCity(stateCode, districtCode, city.code);
}

export function cascadeFromCity(
  stateCode: string,
  districtCode: string,
  cityCode: string,
): AddressCascadeSelection {
  const area = listAreas(cityCode)[0];
  if (!area) {
    return { ...DEFAULT_ADDRESS_CASCADE, stateCode, districtCode, cityCode, areaCode: '', pincode: '' };
  }
  return cascadeFromArea(stateCode, districtCode, cityCode, area.code);
}

export function cascadeFromArea(
  stateCode: string,
  districtCode: string,
  cityCode: string,
  areaCode: string,
): AddressCascadeSelection {
  return {
    stateCode,
    districtCode,
    cityCode,
    areaCode,
    pincode: getDefaultPincodeForArea(areaCode),
  };
}

/** Match display labels like "Koregaon Park, Pune" to reference hierarchy. */
export function inferCascadeFromDisplayLabel(label: string): AddressCascadeSelection | null {
  const normalized = label.toLowerCase();
  for (const [cityCode, areas] of Object.entries(AREAS)) {
    const matchedArea = areas.find((area) => normalized.includes(area.name.toLowerCase()));
    if (!matchedArea) continue;
    const districtCode = findDistrictForCity(cityCode);
    if (!districtCode) continue;
    const stateCode = findStateForDistrict(districtCode);
    if (!stateCode) continue;
    return cascadeFromArea(stateCode, districtCode, cityCode, matchedArea.code);
  }

  for (const [districtCode, cities] of Object.entries(CITIES)) {
    const matchedCity = cities.find((city) => normalized.includes(city.name.toLowerCase()));
    if (!matchedCity) continue;
    const stateCode = findStateForDistrict(districtCode);
    if (!stateCode) continue;
    return cascadeFromCity(stateCode, districtCode, matchedCity.code);
  }

  return null;
}

export function ensureValidCascade(selection: AddressCascadeSelection): AddressCascadeSelection {
  const states = listStates();
  const stateCode = states.some((state) => state.code === selection.stateCode)
    ? selection.stateCode
    : DEFAULT_ADDRESS_CASCADE.stateCode;

  const districts = listDistricts(stateCode);
  const districtCode = districts.some((district) => district.code === selection.districtCode)
    ? selection.districtCode
    : districts[0]?.code ?? DEFAULT_ADDRESS_CASCADE.districtCode;

  const cities = listCities(districtCode);
  const cityCode = cities.some((city) => city.code === selection.cityCode)
    ? selection.cityCode
    : cities[0]?.code ?? DEFAULT_ADDRESS_CASCADE.cityCode;

  const areas = listAreas(cityCode);
  const areaCode = areas.some((area) => area.code === selection.areaCode)
    ? selection.areaCode
    : areas[0]?.code ?? DEFAULT_ADDRESS_CASCADE.areaCode;

  return cascadeFromArea(stateCode, districtCode, cityCode, areaCode);
}

export function listStates(): IndiaReferenceOption[] {
  return states as IndiaReferenceOption[];
}

export function listDistricts(stateCode: string): IndiaReferenceOption[] {
  return DISTRICTS[stateCode] ?? [];
}

export function listCities(districtCode: string): IndiaReferenceOption[] {
  return CITIES[districtCode] ?? [];
}

export function listAreas(cityCode: string): IndiaReferenceOption[] {
  return AREAS[cityCode] ?? [];
}

export function validatePincodeForArea(areaCode: string, pincode: string): boolean {
  const allowed = PINCODES[areaCode];
  if (!allowed) return /^[1-9][0-9]{5}$/.test(pincode);
  return allowed.includes(pincode);
}
