import React, { useEffect, useState } from 'react';
import { getDb } from '../../lib/firebase-db';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { app } from '../../firebase';
import { Store, Phone, FileText, Image as ImageIcon, Save, Upload, Loader2, MapPin, Map, Truck, Navigation, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../../assets/bhojan-os-logo.png';

const OwnerSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'location'>('general');
  const [fetchingCoords, setFetchingCoords] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    deliveryNotes: '',
    logoUrl: '',
    subscriptionEnabled: false,
    address: '',
    city: '',
    state: '',
    pincode: '',
    lat: '',
    lng: '',
    freeRadius: 3,
    paidRadius: 5,
    maxRadius: 10,
    baseFee: 30,
    perKmCharge: 15,
    prepTime: 20
  });

  const tenantId = userProfile?.ownedTenantIds?.[0];

  useEffect(() => {
    const fetchSettings = async () => {
      if (!tenantId) return;
      
      try {
        const db = getDb();
        const tenantRef = doc(db, 'tenants', tenantId);
        const tenantDoc = await getDoc(tenantRef);
        
        if (tenantDoc.exists()) {
          const data = tenantDoc.data();
          setFormData({
            name: data.name || '',
            whatsapp: data.contact?.whatsapp || '',
            deliveryNotes: data.deliveryNotes || '',
            logoUrl: data.branding?.logoUrl || '',
            subscriptionEnabled: data.features?.subscriptionEnabled || false,
            address: data.location?.address || '',
            city: data.location?.city || '',
            state: data.location?.state || '',
            pincode: data.location?.pincode || '',
            lat: data.location?.lat ? String(data.location.lat) : '',
            lng: data.location?.lng ? String(data.location.lng) : '',
            freeRadius: data.deliveryConfig?.freeRadius || 3,
            paidRadius: data.deliveryConfig?.paidRadius || 5,
            maxRadius: data.deliveryConfig?.maxRadius || 10,
            baseFee: data.deliveryConfig?.baseFee || 30,
            perKmCharge: data.deliveryConfig?.perKmCharge || 15,
            prepTime: data.deliveryConfig?.prepTime || 20
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    try {
      const db = getDb();
      const tenantRef = doc(db, 'tenants', tenantId);
      
      await updateDoc(tenantRef, {
        name: formData.name,
        'contact.whatsapp': formData.whatsapp,
        deliveryNotes: formData.deliveryNotes,
        'branding.logoUrl': formData.logoUrl,
        'features.subscriptionEnabled': formData.subscriptionEnabled,
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          lat: Number(formData.lat) || 0,
          lng: Number(formData.lng) || 0
        },
        deliveryConfig: {
          freeRadius: Number(formData.freeRadius),
          paidRadius: Number(formData.paidRadius),
          maxRadius: Number(formData.maxRadius),
          baseFee: Number(formData.baseFee),
          perKmCharge: Number(formData.perKmCharge),
          prepTime: Number(formData.prepTime)
        }
      });
      
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 quality to keep size small
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    const toastId = toast.loading('Processing logo...');
    
    try {
      const base64Image = await compressImage(file);
      setFormData(prev => ({ ...prev, logoUrl: base64Image }));
      toast.success('Logo attached! Click Save Changes below to update.', { id: toastId });
    } catch (error: any) {
      console.error('Process failed:', error);
      toast.error('Failed to process logo', { id: toastId });
    } finally {
      setUploadingLogo(false);
    }
  };

  const autoFetchCoordinates = async () => {
    if (!navigator.geolocation) {
      toast.error("GPS Geolocation is not supported by your browser");
      return;
    }
    
    setFetchingCoords(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString()
        }));
        toast.success("Coordinates detected from your GPS!");
        setFetchingCoords(false);
      },
      (error) => {
        console.error("GPS Error:", error);
        toast.error("Failed to get GPS location. Please allow location permissions or enter manually.");
        setFetchingCoords(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 text-white">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center space-x-4">
          <img src={logo} alt="BhojanOS" className="h-12 w-12 rounded-xl shadow-sm border border-white/10" />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Kitchen Settings</h1>
            <p className="text-white/50 mt-1">Manage your storefront presence and logistics</p>
          </div>
        </header>

        <div className="flex space-x-4 mb-6 border-b border-white/10 pb-0">
          <button onClick={() => setActiveTab('general')} className={`flex items-center space-x-2 pb-3 border-b-2 px-2 transition-colors ${activeTab === 'general' ? 'border-[#FF6B00] text-[#FF6B00]' : 'border-transparent text-white/50 hover:text-white/80'}`}>
            <Settings size={18} />
            <span className="font-bold tracking-widest text-xs uppercase">General</span>
          </button>
          <button onClick={() => setActiveTab('location')} className={`flex items-center space-x-2 pb-3 border-b-2 px-2 transition-colors ${activeTab === 'location' ? 'border-[#FF6B00] text-[#FF6B00]' : 'border-transparent text-white/50 hover:text-white/80'}`}>
            <MapPin size={18} />
            <span className="font-bold tracking-widest text-xs uppercase">Location & Delivery</span>
          </button>
        </div>

        <div className="bg-[#0f0f11] rounded-xl shadow-sm border border-white/10">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            {activeTab === 'general' && (
              <>
                {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Business Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-10 px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder-white/20"
                  placeholder="e.g. Spice Kitchen"
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Support WhatsApp Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="block w-full pl-10 px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder-white/20"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Delivery Notes (Shown to customers)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
                  <FileText className="h-5 w-5 text-white/40" />
                </div>
                <textarea
                  rows={3}
                  value={formData.deliveryNotes}
                  onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                  className="block w-full pl-10 px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder-white/20"
                  placeholder="e.g. Orders placed before 10 PM are delivered next day."
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Store Logo
              </label>
              
              <div className="mt-1 flex items-center space-x-6">
                <div className="flex-shrink-0 h-20 w-20 bg-[#0a0a0a] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-white/30" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center">
                    <label className="relative cursor-pointer bg-[#151515] hover:bg-[#1a1a1a] py-2 px-4 border border-white/10 rounded-md shadow-sm text-sm font-medium text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[#0a0a0a] focus-within:ring-red-500 transition-colors">
                      <span className="flex items-center">
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingLogo ? 'Uploading...' : 'Upload Image'}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    JPG, PNG or WEBP up to 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Features Settings */}
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Features</h3>
              
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-white/10 rounded-xl">
                <div>
                  <h4 className="text-white font-medium">Monthly Meal Subscription</h4>
                  <p className="text-sm text-white/60">Allow customers to subscribe to daily meals.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.subscriptionEnabled}
                    onChange={(e) => setFormData({ ...formData, subscriptionEnabled: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 transition-colors"></div>
                </label>
              </div>
            </div>
            </>
            )}

            {activeTab === 'location' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* KITCHEN PROFILE */}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><MapPin size={20} className="text-[#FF6B00]" /> Kitchen Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-white/80 mb-2 uppercase tracking-widest text-xs">Full Address</label>
                      <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all" placeholder="123 Food Street, Shop 4" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2 uppercase tracking-widest text-xs">City</label>
                      <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FF6B00]" placeholder="Pune" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2 uppercase tracking-widest text-xs">State</label>
                      <input type="text" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FF6B00]" placeholder="Maharashtra" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2 uppercase tracking-widest text-xs">Pincode</label>
                      <input type="text" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FF6B00]" placeholder="411001" />
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold tracking-tight">Geographic Coordinates</h4>
                      <button type="button" onClick={autoFetchCoordinates} disabled={fetchingCoords} className="px-3 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20 rounded-lg text-xs font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-[#FF6B00]/20 transition-colors">
                        {fetchingCoords ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />} Auto-Detect
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Latitude</label>
                        <input type="text" required value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} className="block w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FF6B00]" placeholder="18.5204" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Longitude</label>
                        <input type="text" required value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} className="block w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FF6B00]" placeholder="73.8567" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* DELIVERY CONFIG */}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Truck size={20} className="text-blue-500" /> Delivery Engine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Free Delivery Radius (KM)</label>
                      <input type="number" step="0.1" required value={formData.freeRadius} onChange={(e) => setFormData({ ...formData, freeRadius: Number(e.target.value) })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white" />
                      <p className="text-[10px] text-white/40 mt-1">Orders within this distance are free.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Base Delivery Radius (KM)</label>
                      <input type="number" step="0.1" required value={formData.paidRadius} onChange={(e) => setFormData({ ...formData, paidRadius: Number(e.target.value) })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white" />
                      <p className="text-[10px] text-white/40 mt-1">Orders up to this distance cost the base fee.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Max Delivery Radius (KM)</label>
                      <input type="number" step="0.1" required value={formData.maxRadius} onChange={(e) => setFormData({ ...formData, maxRadius: Number(e.target.value) })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white border-l-2 border-l-red-500" />
                      <p className="text-[10px] text-white/40 mt-1">Orders beyond this distance are blocked.</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Base Fee (₹)</label>
                      <input type="number" required value={formData.baseFee} onChange={(e) => setFormData({ ...formData, baseFee: Number(e.target.value) })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white" />
                      <p className="text-[10px] text-white/40 mt-1">Flat fee for orders inside the Base Radius.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Per KM Extra Charge (₹)</label>
                      <input type="number" required value={formData.perKmCharge} onChange={(e) => setFormData({ ...formData, perKmCharge: Number(e.target.value) })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white" />
                      <p className="text-[10px] text-white/40 mt-1">Charge per km if distance {'>'} Base Radius.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Avg Prep Time (Mins)</label>
                      <input type="number" required value={formData.prepTime} onChange={(e) => setFormData({ ...formData, prepTime: Number(e.target.value) })} className="block w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white" />
                      <p className="text-[10px] text-white/40 mt-1">Used to calculate delivery ETA dynamically.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.2)] text-base font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:ring-red-500 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default OwnerSettings;
