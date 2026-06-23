import React, { useEffect, useState, useRef } from 'react';
import { MapPin, X, Check, Loader2, Search, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

import { Tenant } from '../types';

interface LocationData {
  lat: number;
  lng: number;
  addressText: string;
  fullAddress: string;
  distanceKm: number;
  deliveryFee: number;
  isServiceable?: boolean;
}

interface LocationPickerProps {
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

const LocationPicker: React.FC<LocationPickerProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  tenant,
  title = "Confirm Delivery Location"
}) => {
  const initialLat = tenant?.location?.lat || 18.5204;
  const initialLng = tenant?.location?.lng || 73.8567;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; addressText?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<{ distance: number; fee: number } | null>(null);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [step, setStep] = useState<'map' | 'details'>('map');
  const [addressDetails, setAddressDetails] = useState({ house: '', building: '', landmark: '' });
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Record<string, string>>({});

  const reverseGeocode = async (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (cacheRef.current[key]) return cacheRef.current[key];
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      cacheRef.current[key] = data.display_name;
      return data.display_name;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return undefined;
    }
  };

  const updateLocationDetails = React.useCallback((lat: number, lng: number) => {
    setIsFetchingAddress(true);
    
    // Check if tenant has location
    if (!tenant?.location?.lat) {
      setDistanceInfo({ distance: 0, fee: 30 }); // Dummy info, UI will block it anyway
    } else {
      const dist = calculateDistance(tenant.location.lat, tenant.location.lng, lat, lng);
      setDistanceInfo({ distance: dist, fee: getDeliveryFee(dist, tenant) });
    }
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(async () => {
      const address = await reverseGeocode(lat, lng);
      setSelectedLocation({ lat, lng, addressText: address });
      setIsFetchingAddress(false);
    }, 500);
  }, []);

  const fetchSearchResults = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Append Pune if not present to ensure local relevance
      const formattedQuery = query.toLowerCase().includes('pune') ? query : `${query} Pune`;
      
      // Viewbox for Pune region: left, top, right, bottom
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedQuery)}&limit=5&countrycodes=in&viewbox=73.65,18.70,74.05,18.40&addressdetails=1`;
      
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchSearchResults(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (val.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchResults(val);
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  // Helper to format address nicely like Google Maps
  const formatAddress = (result: any) => {
    const addr = result.address || {};
    // Primary text: Name of the place or specific road/building
    const primary = result.name || addr.road || addr.neighbourhood || addr.suburb || 'Location';
    
    // Secondary text: The rest of the address
    const secondaryParts = [];
    if (addr.suburb && primary !== addr.suburb) secondaryParts.push(addr.suburb);
    if (addr.city_district && primary !== addr.city_district) secondaryParts.push(addr.city_district);
    if (addr.city && primary !== addr.city) secondaryParts.push(addr.city);
    
    const secondary = secondaryParts.length > 0 ? secondaryParts.join(', ') : result.display_name.split(',').slice(1).join(',').trim();
    
    return { primary, secondary: secondary || 'Pune, Maharashtra' };
  };

  const handleResultClick = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
      setSelectedLocation({ lat, lng, addressText: result.display_name });
      setHasInteracted(true);
    }
    
    setSearchResults([]);
    setSearchQuery('');
  };

  useEffect(() => {
    if (isOpen) {
      setStep('map');
      setAddressDetails({ house: '', building: '', landmark: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapRef.current || step !== 'map') return;

    const loadLeaflet = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import('leaflet');

        // Fix for default markers in React
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Initialize map
        const map = L.map(mapRef.current!, { zoomControl: false }).setView([initialLat, initialLng], 17);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Robust resize observation
        const resizeObserver = new ResizeObserver(() => {
          if (mapRef.current && map) {
            map.invalidateSize();
          }
        });
        resizeObserver.observe(mapRef.current!);

        setTimeout(() => {
          if (mapRef.current && map) {
            map.invalidateSize();
          }
        }, 100);

        map.on('movestart', () => {
          setHasInteracted(true);
          setIsMoving(true);
        });

        map.on('moveend', () => {
          setIsMoving(false);
          const center = map.getCenter();
          updateLocationDetails(center.lat, center.lng);
        });

        updateLocationDetails(initialLat, initialLng);

        mapInstanceRef.current = map;
        setIsLoading(false);

        // Cleanup function
        return () => {
          resizeObserver.disconnect();
          map.remove();
        };
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setIsLoading(false);
      }
    };

    loadLeaflet();
  }, [isOpen, initialLat, initialLng]);

  const handleConfirmMap = () => {
    if (selectedLocation?.addressText && distanceInfo) {
      setStep('details');
    }
  };

  const handleSaveFullAddress = () => {
    if (!selectedLocation || !distanceInfo) return;
    
    const house = addressDetails.house.trim();
    const building = addressDetails.building.trim();
    const landmark = addressDetails.landmark.trim();
    
    const fullAddress = `${house}, ${building}${landmark ? ', ' + landmark : ''}, ${selectedLocation.addressText}`;

    onLocationSelect({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      addressText: selectedLocation.addressText,
      fullAddress,
      distanceKm: distanceInfo.distance,
      deliveryFee: distanceInfo.fee,
      isServiceable: distanceInfo.fee !== -1
    });
    onClose();
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 1.2 });
            setHasInteracted(true);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Could show a toast here
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <MapPin className="text-red-600" size={24} />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 relative z-50 shrink-0">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search for your area or landmark..."
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
                />
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </form>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-4 right-4 top-full mt-2 bg-white dark:bg-gray-900 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto overflow-x-hidden"
                  >
                    {searchResults.map((result, idx) => {
                      const { primary, secondary } = formatAddress(result);
                      return (
                        <button
                          key={result.place_id || idx}
                          onClick={() => handleResultClick(result)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors flex items-start gap-3"
                        >
                          <div className="mt-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full shrink-0">
                            <MapPin size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{primary}</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{secondary}</span>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Map Container */}
            <div className="relative flex-1 min-h-[200px] sm:min-h-[300px] z-10 bg-gray-100 dark:bg-gray-800">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-20">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
                  </div>
                </div>
              )}
              <div
                ref={mapRef}
                className="absolute inset-0 z-0"
              />
              <style dangerouslySetInnerHTML={{ __html: `
                .pin-moving {
                  transform: translate(-50%, -120%) scale(1.1);
                  transition: transform 0.2s ease;
                }
                .pin-idle {
                  transform: translate(-50%, -100%);
                  transition: transform 0.2s ease;
                }
              ` }} />
              <div className={`absolute top-1/2 left-1/2 z-[1000] pointer-events-none ${isMoving ? 'pin-moving' : 'pin-idle'}`}>
                <MapPin className="w-10 h-10 text-red-600 drop-shadow-lg fill-white" />
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3 font-medium tracking-wide">
                Drag map to adjust pin location
              </p>
              
              <div className="mb-4 min-h-[84px]">
                {isFetchingAddress ? (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 animate-pulse flex flex-col gap-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                ) : selectedLocation?.addressText ? (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 mt-0.5 text-red-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                          {selectedLocation.addressText}
                        </p>
                        {distanceInfo && (
                          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <span className="bg-white dark:bg-gray-600 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-500">
                              {distanceInfo.distance.toFixed(1)} km
                            </span>
                            <span>•</span>
                            <span className="text-green-600 dark:text-green-400">
                              ₹{distanceInfo.fee} delivery
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCurrentLocation}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors active:scale-[0.98]"
                >
                  <MapPin size={16} />
                  Use Current Location
                </button>

                {distanceInfo?.fee === -1 ? (
                  <div className="w-full py-3 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2">
                    <AlertCircle size={16} />
                    Location Out of Bounds
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmMap}
                    disabled={!selectedLocation?.addressText || isFetchingAddress}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-red-600/20"
                  >
                    <Check size={16} />
                    Enter Address Details
                  </button>
                )}
              </div>
            </div>

            {/* Map Step Footer */}
            {step === 'map' && (
              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                {distanceInfo?.fee === -1 ? (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Currently unavailable at your location</h4>
                      <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">This location is outside the kitchen's maximum delivery radius.</p>
                    </div>
                  </div>
                ) : distanceInfo && (
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Delivery Distance: </span>
                      <span className="font-bold text-gray-900 dark:text-white">{distanceInfo.distance.toFixed(1)} km</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Delivery Fee: </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {distanceInfo.fee === 0 ? <span className="text-green-500">Free</span> : `₹${distanceInfo.fee}`}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleConfirmMap}
                  disabled={!selectedLocation || isFetchingAddress || distanceInfo?.fee === -1}
                  className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:bg-red-700 hover:shadow-[0_4px_16px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isFetchingAddress ? 'Getting Address Details...' : distanceInfo?.fee === -1 ? 'Location Out of Bounds' : 'Confirm Location'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {isOpen && step === 'details' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Enter Complete Address</h2>
              <button onClick={() => setStep('map')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Map Location</p>
                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">{selectedLocation?.addressText}</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="House No / Flat *"
                  value={addressDetails.house}
                  onChange={(e) => setAddressDetails({ ...addressDetails, house: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                />
                <input
                  type="text"
                  placeholder="Building / Society Name *"
                  value={addressDetails.building}
                  onChange={(e) => setAddressDetails({ ...addressDetails, building: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                />
                <input
                  type="text"
                  placeholder="Landmark (Optional)"
                  value={addressDetails.landmark}
                  onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleSaveFullAddress}
                disabled={!addressDetails.house.trim() || !addressDetails.building.trim()}
                className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Save Address
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPicker;