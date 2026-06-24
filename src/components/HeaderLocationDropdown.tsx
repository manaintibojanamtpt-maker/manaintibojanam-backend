import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Plus, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDeliveryState } from '../lib/useDeliveryState';
import { useTenant } from '../context/TenantContext';
import AutoLocationForm, { getDeliveryFee } from './AutoLocationForm';
import toast from 'react-hot-toast';
import { getDb } from '../lib/firebase-db';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

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

const HeaderLocationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { currentUser, userProfile } = useAuth();
  const [deliveryState, setDeliveryState] = useDeliveryState();
  const { tenantInfo } = useTenant();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisplayAddress = () => {
    if (deliveryState.selectedAddress) {
      return deliveryState.selectedAddress.address || deliveryState.selectedAddress.label || 'Selected Location';
    }
    if (userProfile?.savedAddresses?.length) {
      const defaultAddr = userProfile.savedAddresses.find(a => a.isDefault) || userProfile.savedAddresses[0];
      return defaultAddr.address || defaultAddr.label || 'Saved Location';
    }
    return 'Select Location';
  };

  const handleSelectSavedAddress = (address: any) => {
    // Validate Serviceability Immediately
    const tenantLat = tenantInfo?.location?.lat;
    const tenantLng = tenantInfo?.location?.lng;
    
    let distanceKm = 0;
    let deliveryFee = 0;

    if (tenantLat && tenantLng && address.lat && address.lng) {
      distanceKm = calculateDistance(tenantLat, tenantLng, address.lat, address.lng);
      deliveryFee = getDeliveryFee(distanceKm, tenantInfo as any);

      if (deliveryFee === -1) {
        toast.error('Sorry, this kitchen currently does not deliver to your location.', { duration: 4000 });
        setIsOpen(false);
        return; // Reject selection
      }
    }

    setDeliveryState({
      ...deliveryState,
      selectedAddress: {
        id: address.id,
        label: address.label || 'Home',
        address: address.address,
        addressText: address.addressText || address.address,
        fullAddress: address.fullAddress || address.address,
        houseNumber: address.houseNumber,
        buildingName: address.buildingName,
        landmark: address.landmark,
        city: address.city,
        pincode: address.pincode,
        lat: address.lat || 0,
        lng: address.lng || 0,
        distanceKm,
        deliveryFee,
        isDefault: address.isDefault
      }
    });
    setIsOpen(false);
    toast.success('Delivery location updated');
  };

  const handleLocationSelect = async (locationData: any) => {
    const newAddr = {
      id: `loc-${Date.now()}`,
      label: 'Selected Location',
      address: locationData.addressText || locationData.fullAddress,
      addressText: locationData.addressText,
      fullAddress: locationData.fullAddress,
      houseNumber: locationData.houseNumber,
      buildingName: locationData.buildingName,
      landmark: locationData.landmark,
      city: locationData.city,
      pincode: locationData.pincode,
      lat: locationData.lat,
      lng: locationData.lng,
      distanceKm: locationData.distanceKm,
      deliveryFee: locationData.deliveryFee,
      isDefault: !userProfile?.savedAddresses?.length
    };

    if (currentUser?.uid) {
      try {
        await setDoc(doc(getDb(), 'users', currentUser.uid), {
          savedAddresses: arrayUnion(newAddr)
        }, { merge: true });
      } catch (e) {
        console.error('Failed to save address to profile', e);
      }
    }

    setDeliveryState({
      ...deliveryState,
      selectedAddress: newAddr as any
    });
    setIsOpen(false);
    toast.success('Delivery location updated');
  };

  const handleDetectLocation = () => {
    setIsOpen(false);
    setIsLocationModalOpen(true);
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-500/30 transition-colors cursor-pointer"
      >
        <MapPin size={18} className="text-orange-500 shrink-0" />
        <div className="flex flex-col max-w-[150px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Delivering to</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {getDisplayAddress()}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden z-50 py-2">
          
          {/* Saved Addresses */}
          {currentUser && userProfile?.savedAddresses?.length > 0 && (
            <div className="px-4 py-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saved Addresses</span>
              <div className="mt-2 space-y-1">
                {userProfile.savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-start gap-3 group"
                  >
                    <MapPin size={16} className="text-gray-400 group-hover:text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{addr.label || 'Address'}</span>
                      <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{addr.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(currentUser && userProfile?.savedAddresses?.length > 0) && (
            <div className="h-px bg-gray-100 dark:bg-white/5 my-2 w-full"></div>
          )}

          {/* Actions */}
          <div className="px-2 space-y-1">
            <button 
              onClick={handleDetectLocation}
              className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 transition-colors flex items-center gap-3 font-semibold text-sm"
            >
              <Navigation size={16} />
              <span>Detect Current Location</span>
            </button>
            <button 
              onClick={() => { setIsOpen(false); setIsLocationModalOpen(true); }}
              className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3 font-semibold text-sm text-gray-900 dark:text-white"
            >
              <Plus size={16} className="text-gray-400" />
              <span>Add New Address</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Location Modal. In full production, this might be lifted higher, but this works fine */}
      <AutoLocationForm
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        tenant={tenantInfo ? { ...tenantInfo, slug: '', status: 'active', theme: {} } as any : null}
        title="Set Delivery Location"
      />
    </div>
  );
};

export default HeaderLocationDropdown;
