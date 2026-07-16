import { useEffect, useState } from 'react';
import type { DeliveryAddressV2 } from '@bhojan/location-core';

type AddressConfirmationSheetProps = {
  open: boolean;
  address: DeliveryAddressV2 | null;
  onClose: () => void;
  onConfirm: (input: { flat?: string; building?: string; landmark?: string }) => void;
  title?: string;
};

export function AddressConfirmationSheet({
  open,
  address,
  onClose,
  onConfirm,
  title = 'Confirm delivery address',
}: AddressConfirmationSheetProps) {
  const [flat, setFlat] = useState('');
  const [building, setBuilding] = useState(address?.text.building || '');
  const [landmark, setLandmark] = useState(address?.text.landmark || '');

  useEffect(() => {
    setFlat('');
    setBuilding(address?.text.building || '');
    setLandmark(address?.text.landmark || '');
  }, [address?.coordinates.lat, address?.coordinates.lng, address?.text.building, address?.text.landmark]);

  if (!open || !address) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-xs text-white/60 hover:text-white">
            Close
          </button>
        </div>

        <p className="mb-3 text-xs text-white/70">{address.text.formatted}</p>

        <div className="space-y-2">
          <input
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            placeholder="Flat / House no. (required)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base"
          />
          <input
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="Building / Society"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base"
          />
          <input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Landmark"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base"
          />
        </div>

        <button
          type="button"
          disabled={!flat.trim()}
          onClick={() => onConfirm({ flat: flat.trim(), building: building.trim(), landmark: landmark.trim() })}
          className="mt-4 w-full rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Confirm address
        </button>
      </div>
    </div>
  );
}

export default AddressConfirmationSheet;
