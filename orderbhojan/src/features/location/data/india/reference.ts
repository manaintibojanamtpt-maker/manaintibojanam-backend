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
};

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
