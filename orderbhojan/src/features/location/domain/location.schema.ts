import { z } from 'zod';

export const geoCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().positive().optional(),
  source: z.enum(['gps', 'map_pin', 'geocode', 'manual']),
  capturedAt: z.string().min(1),
}).refine((v) => !(v.lat === 0 && v.lng === 0), { message: 'Invalid coordinates' });

export const indiaAddressSchema = z.object({
  country: z.literal('IN'),
  stateCode: z.string().min(1),
  stateName: z.string().min(1),
  districtCode: z.string().min(1),
  districtName: z.string().min(1),
  cityCode: z.string().min(1),
  cityName: z.string().min(1),
  areaCode: z.string().min(1),
  areaName: z.string().min(1),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid pincode'),
  street: z.string().min(3),
  landmark: z.string().optional(),
  coordinates: geoCoordinatesSchema,
  geohash: z.string().optional(),
  formattedAddress: z.string().optional(),
});

export const savedAddressInputSchema = z.object({
  label: z.enum(['home', 'work', 'other']),
  customLabel: z.string().optional(),
  isDefault: z.boolean(),
  address: indiaAddressSchema,
});

export type SavedAddressInput = z.infer<typeof savedAddressInputSchema>;
