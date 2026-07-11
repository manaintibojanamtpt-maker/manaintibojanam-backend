import { LocateFixed, MapPin } from 'lucide-react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import type { GeoCoordinates } from '../domain/location.types';
import { useLocationActions } from '../hooks/useLocationActions';

interface MapPinPickerProps {
  readonly coordinates: GeoCoordinates;
  readonly onChange: (coords: GeoCoordinates) => void;
}

export function MapPinPicker({ coordinates, onChange }: MapPinPickerProps) {
  const { requestCurrentLocation } = useLocationActions();

  const nudge = (deltaLat: number, deltaLng: number) => {
    onChange({
      ...coordinates,
      lat: Math.round((coordinates.lat + deltaLat) * 10000) / 10000,
      lng: Math.round((coordinates.lng + deltaLng) * 10000) / 10000,
      source: 'map_pin',
      capturedAt: new Date().toISOString(),
    });
  };

  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label="Map pin location">
      <p className="text-base font-bold text-white">Confirm map pin</p>
      <p className="text-xs text-white/60">Adjust pin to your exact delivery spot</p>
      <div
        className="relative mt-4 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,122,0,0.08),rgba(255,255,255,0.02))]"
        role="img"
        aria-label="Map pin preview"
      >
        <MapPin className="h-8 w-8 text-[#FF7A00]" aria-hidden />
      </div>
      <p className="mt-3 text-sm text-white/80">
        {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <SoftButton type="button" tone="secondary" size="compact" onClick={() => nudge(0.001, 0)} aria-label="Move pin north">N</SoftButton>
        <SoftButton type="button" tone="secondary" size="compact" onClick={() => nudge(-0.001, 0)} aria-label="Move pin south">S</SoftButton>
        <SoftButton type="button" tone="secondary" size="compact" onClick={() => nudge(0, -0.001)} aria-label="Move pin west">W</SoftButton>
        <SoftButton type="button" tone="secondary" size="compact" onClick={() => nudge(0, 0.001)} aria-label="Move pin east">E</SoftButton>
      </div>
      <SoftButton type="button" tone="ghost" fullWidth className="mt-3" onClick={() => void requestCurrentLocation()}>
        <LocateFixed className="h-4 w-4" aria-hidden />
        Use GPS for pin
      </SoftButton>
    </GlassCard>
  );
}
