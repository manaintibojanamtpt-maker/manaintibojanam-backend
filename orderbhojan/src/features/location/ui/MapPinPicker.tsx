import { Button, Card, Text } from '@bhojan/design-system';
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
    <Card className="ob-map-pin-picker" aria-label="Map pin location">
      <Text variant="subtitle">Confirm map pin</Text>
      <Text variant="caption">Adjust pin to your exact delivery spot</Text>
      <div className="ob-map-pin-picker__preview" role="img" aria-label="Map pin preview">
        <span className="ob-map-pin-picker__pin" aria-hidden />
      </div>
      <Text variant="bodySm">
        {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
      </Text>
      <div className="ob-map-pin-picker__controls">
        <Button variant="secondary" size="compact" onClick={() => nudge(0.001, 0)} aria-label="Move pin north">N</Button>
        <Button variant="secondary" size="compact" onClick={() => nudge(-0.001, 0)} aria-label="Move pin south">S</Button>
        <Button variant="secondary" size="compact" onClick={() => nudge(0, -0.001)} aria-label="Move pin west">W</Button>
        <Button variant="secondary" size="compact" onClick={() => nudge(0, 0.001)} aria-label="Move pin east">E</Button>
      </div>
      <Button variant="ghost" fullWidth onClick={() => void requestCurrentLocation()}>
        Use GPS for pin
      </Button>
    </Card>
  );
}
