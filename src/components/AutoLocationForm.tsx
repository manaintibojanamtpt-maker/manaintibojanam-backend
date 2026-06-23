import React, { useState, useEffect } from 'react';
import { MapPin, X, Check, Loader2, Navigation, AlertCircle, Search } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Tenant } from '../types';

interface LocationData {
  lat: number;
  lng: number;
  addressText: string;
  fullAddress: string;
  houseNumber?: string;
  buildingName?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  distanceKm: number;
  deliveryFee: number;
  isServiceable?: boolean;
}

interface AutoLocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (locationData: LocationData) => void;
  tenant?: Tenant | null;
  title?: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; 
  return distance * 1.2; 
};

export const getDeliveryFee = (distanceKm: number, tenant?: Tenant | null) => {
  if (!tenant?.deliveryConfig) {
    if (distanceKm <= 2) return 30;
    if (distanceKm <= 5) return 50;
    if (distanceKm <= 8) return 80;
    return 100 + Math.ceil((distanceKm - 8) * 12);
  }
  
  const config = tenant.deliveryConfig;
  if (distanceKm <= config.freeRadius) return 0;
  if (distanceKm <= config.paidRadius) return config.baseFee;
  if (distanceKm > config.maxRadius) return -1; // Unserviceable
  
  const extraDistance = distanceKm - config.paidRadius;
  return config.baseFee + Math.ceil(extraDistance * config.perKmCharge);
};

const AutoLocationForm: React.FC<AutoLocationFormProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  tenant,
  title = "Confirm Delivery Location"
}) => {
  const [step, setStep] = useState<'detect' | 'manual' | 'form' | 'out_of_bounds'>('detect');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{distance: number, fee: number} | null>(null);
  
  // Manual Search State
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Final Form State
  const [formDetails, setFormDetails] = useState({
    house: '',
    building: '',
    landmark: '',
    instructions: '',
    phone: ''
  });

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('detect');
      setDetectedAddress('');
      setCoordinates(null);
      setDistanceInfo(null);
      setFormDetails({ house: '', building: '', landmark: '', instructions: '', phone: '' });
      setManualSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const processCoordinates = async (lat: number, lng: number) => {
    try {
      // Calculate Distance and Fee
      const dist = tenant?.location?.lat 
        ? calculateDistance(tenant.location.lat, tenant.location.lng, lat, lng)
        : 0;
      
      const fee = getDeliveryFee(dist, tenant);
      
      setCoordinates({ lat, lng });
      setDistanceInfo({ distance: dist, fee });

      if (fee === -1) {
        setStep('out_of_bounds');
        setIsDetecting(false);
        return;
      }

      // Reverse Geocode
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      
      if (data && data.display_name) {
        // Simplify the address to avoid overwhelming the user
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        // Usually, we want the first 3-4 parts for a good summary
        const summary = parts.slice(0, Math.min(4, parts.length)).join(', ');
        setDetectedAddress(summary || data.display_name);
      } else {
        setDetectedAddress('Location Selected');
      }

      setStep('form');
    } catch (error) {
      console.error('Error processing location:', error);
      toast.error('Failed to process location details. Please try manual entry.');
      setStep('manual');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setStep('manual');
      return;
    }

    setIsDetecting(true);

    const successCallback = (position: GeolocationPosition) => {
      processCoordinates(position.coords.latitude, position.coords.longitude);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.warn('Geolocation failed:', error);
      toast.error('Could not auto-detect location. Please search manually.');
      setIsDetecting(false);
      setStep('manual');
    };

    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Append city context from tenant if available to improve results
      const cityContext = tenant?.location?.address ? tenant.location.address.split(',').pop()?.trim() : 'India';
      const formattedQuery = manualSearchQuery.toLowerCase().includes(cityContext?.toLowerCase() || '') 
        ? manualSearchQuery 
        : `${manualSearchQuery}, ${cityContext}`;

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedQuery)}&limit=5&countrycodes=in`);
      const data = await response.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast.error('No results found. Please try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    setIsDetecting(true);
    setSearchResults([]);
    processCoordinates(parseFloat(result.lat), parseFloat(result.lon));
  };

  const handleSaveAddress = () => {
    if (!coordinates || !distanceInfo) return;
    
    const house = formDetails.house.trim();
    const building = formDetails.building.trim();
    const landmark = formDetails.landmark.trim();
    const instructions = formDetails.instructions.trim();
    const phone = formDetails.phone.trim();
    
    const addressParts = [
      house,
      building,
      landmark ? `Near ${landmark}` : '',
      detectedAddress
    ].filter(Boolean);

    const fullAddress = addressParts.join(', ');

    // Store instructions and phone in localStorage or pass them up if needed
    // We will just append them to the fullAddress for simplicity if instructions exist, 
    // but usually they go into separate fields. The Checkout component currently expects a string fullAddress.
    
    onLocationSelect({
      lat: coordinates.lat,
      lng: coordinates.lng,
      addressText: detectedAddress,
      fullAddress: fullAddress + (instructions ? ` | Note: ${instructions}` : '') + (phone ? ` | Ph: ${phone}` : ''),
      houseNumber: house,
      buildingName: building,
      landmark: landmark,
      distanceKm: distanceInfo.distance,
      deliveryFee: distanceInfo.fee,
      isServiceable: distanceInfo.fee !== -1
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
        >
          <m.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-full">
                  <MapPin className="text-red-600 dark:text-red-500" size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto max-h-[75vh]">
              
              {/* STEP: DETECT */}
              {step === 'detect' && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Navigation className="text-red-600 dark:text-red-500 w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Find Your Location</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8 px-4">
                    Allow location access to instantly check delivery availability and exact fees.
                  </p>
                  
                  <button
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-[15px] hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-70"
                  >
                    {isDetecting ? (
                      <><Loader2 size={18} className="animate-spin" /> Detecting Location...</>
                    ) : (
                      <><Navigation size={18} /> Auto Detect My Location</>
                    )}
                  </button>
                  
                  <div className="mt-6 flex items-center w-full gap-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">OR</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                  </div>
                  
                  <button
                    onClick={() => setStep('manual')}
                    className="mt-6 text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 transition-colors"
                  >
                    Enter Address Manually
                  </button>
                </div>
              )}

              {/* STEP: MANUAL SEARCH */}
              {step === 'manual' && (
                <div className="py-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Search your area or street</p>
                  <form onSubmit={handleManualSearch} className="relative mb-6">
                    <input
                      type="text"
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                      placeholder="e.g. MG Road, Pune"
                      className="w-full pl-4 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={isSearching}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                  </form>

                  <div className="space-y-2">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-red-200 hover:bg-red-50 dark:hover:bg-gray-800 transition-colors flex gap-3 items-start"
                      >
                        <MapPin className="text-gray-400 mt-0.5 shrink-0" size={18} />
                        <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setStep('detect')}
                    className="mt-6 flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <Navigation size={16} /> Try Auto Detect Again
                  </button>
                </div>
              )}

              {/* STEP: OUT OF BOUNDS */}
              {step === 'out_of_bounds' && (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Location Not Serviceable</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Sorry, this kitchen currently does not deliver to your selected location. You are outside the delivery radius.
                  </p>
                  <button
                    onClick={() => setStep('manual')}
                    className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Try Another Location
                  </button>
                </div>
              )}

              {/* STEP: ADDRESS DETAILS FORM */}
              {step === 'form' && distanceInfo && (
                <div className="space-y-5">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 dark:bg-red-500/10 rounded-bl-full pointer-events-none"></div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full shrink-0">
                        <Check size={14} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Delivering To</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{detectedAddress}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700 mt-1">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{distanceInfo.distance.toFixed(1)} km</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Delivery Fee</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {distanceInfo.fee === 0 ? <span className="text-green-600">Free</span> : `₹${distanceInfo.fee}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <input
                        type="text"
                        placeholder="House / Flat No. *"
                        value={formDetails.house}
                        onChange={(e) => setFormDetails({ ...formDetails, house: e.target.value })}
                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Building / Apartment Name"
                        value={formDetails.building}
                        onChange={(e) => setFormDetails({ ...formDetails, building: e.target.value })}
                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Landmark *"
                        value={formDetails.landmark}
                        onChange={(e) => setFormDetails({ ...formDetails, landmark: e.target.value })}
                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="tel"
                        placeholder="Phone No (Optional)"
                        value={formDetails.phone}
                        onChange={(e) => setFormDetails({ ...formDetails, phone: e.target.value })}
                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Instructions (Optional)"
                        value={formDetails.instructions}
                        onChange={(e) => setFormDetails({ ...formDetails, instructions: e.target.value })}
                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAddress}
                    disabled={!formDetails.house.trim() || !formDetails.landmark.trim()}
                    className="w-full mt-4 py-4 bg-red-600 text-white rounded-xl font-bold text-[15px] hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    Confirm & Proceed
                  </button>
                  <button
                    onClick={() => setStep('detect')}
                    className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Change Location
                  </button>
                </div>
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default AutoLocationForm;
