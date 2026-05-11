import React from 'react';
import { X } from 'lucide-react';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  trackingData: { deliveryPartner: string, trackingLink: string, riderName?: string, riderPhone?: string };
  setTrackingData: (data: { deliveryPartner: string, trackingLink: string, riderName?: string, riderPhone?: string }) => void;
}

const TrackingModal: React.FC<TrackingModalProps> = ({ isOpen, onClose, onSave, trackingData, setTrackingData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Delivery Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Delivery Partner Name</label>
            <input 
              type="text"
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-medium"
              value={trackingData.deliveryPartner}
              onChange={(e) => setTrackingData({...trackingData, deliveryPartner: e.target.value})}
              placeholder="Enter delivery partner name (e.g., Rapido, Porter)"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Rider Name</label>
            <input 
              type="text"
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-medium"
              value={trackingData.riderName || ''}
              onChange={(e) => setTrackingData({...trackingData, riderName: e.target.value})}
              placeholder="Enter rider name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Rider Phone</label>
            <input 
              type="text"
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-medium"
              value={trackingData.riderPhone || ''}
              onChange={(e) => setTrackingData({...trackingData, riderPhone: e.target.value})}
              placeholder="Enter rider phone number"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Tracking Link</label>
            <input 
              type="text"
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-medium"
              value={trackingData.trackingLink}
              onChange={(e) => setTrackingData({...trackingData, trackingLink: e.target.value})}
              placeholder="Enter tracking link"
            />
          </div>
        </div>
        <button 
          onClick={onSave}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-red-700"
        >
          Save & Hand Over
        </button>
      </div>
    </div>
  );
};

export default TrackingModal;
