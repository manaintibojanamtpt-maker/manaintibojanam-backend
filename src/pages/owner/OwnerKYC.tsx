import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Shield, FileText, CheckCircle2, AlertCircle, UploadCloud, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { getDb } from '../../lib/firebase-db';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import StorageService from '../../services/StorageService';

export const OwnerKYC: React.FC = () => {
  const { userProfile } = useAuth();
  const { tenantInfo, refreshTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form State
  const [kycForm, setKycForm] = useState({
    ownerName: tenantInfo?.kyc?.ownerName || '',
    businessName: tenantInfo?.kyc?.businessName || '',
    phone: tenantInfo?.kyc?.phone || '',
    email: tenantInfo?.kyc?.email || '',
    address: tenantInfo?.kyc?.address || '',
    city: tenantInfo?.kyc?.city || '',
    state: tenantInfo?.kyc?.state || '',
    country: tenantInfo?.kyc?.country || 'India',
    pincode: tenantInfo?.kyc?.pincode || '',
    gstNumber: tenantInfo?.kyc?.gstNumber || '',
    panNumber: tenantInfo?.kyc?.panNumber || '',
    fssaiNumber: tenantInfo?.fssai?.number || '',
  });

  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const handleSaveKYC = async () => {
    if (!tenantInfo?.id) return;
    if (!kycForm.ownerName || !kycForm.businessName || !kycForm.phone || !kycForm.address) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'tenants', tenantInfo.id), {
        'kyc.ownerName': kycForm.ownerName,
        'kyc.businessName': kycForm.businessName,
        'kyc.phone': kycForm.phone,
        'kyc.email': kycForm.email,
        'kyc.address': kycForm.address,
        'kyc.city': kycForm.city,
        'kyc.state': kycForm.state,
        'kyc.country': kycForm.country,
        'kyc.pincode': kycForm.pincode,
        'kyc.gstNumber': kycForm.gstNumber,
        'kyc.panNumber': kycForm.panNumber,
        'fssai.number': kycForm.fssaiNumber,
        'fssai.verificationStatus': kycForm.fssaiNumber ? 'submitted' : tenantInfo.fssai?.verificationStatus || 'not_submitted'
      });
      toast.success('KYC Profile Saved');
      refreshTenant();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save KYC profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDeclaration = async () => {
    if (!tenantInfo?.id) return;
    setLoading(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'tenants', tenantInfo.id), {
        'legal.merchantDeclarationAcceptedAt': new Date().toISOString(),
      });
      toast.success('Merchant Declaration Accepted');
      refreshTenant();
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept declaration');
    } finally {
      setLoading(false);
    }
  };

  const handleKYCUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !tenantInfo?.id) return;

    try {
      setUploadingDoc(true);
      const url = await StorageService.uploadKYCDocument(file, tenantInfo.id, docType);
      
      const db = getDb();
      await updateDoc(doc(db, 'tenants', tenantInfo.id), {
        [`kyc.${docType}DocumentUrl`]: url,
        'kyc.verificationLevel': 1,
        'kyc.status': 'pending_verification'
      });
      
      toast.success(`${docType} document uploaded securely.`);
      refreshTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Shield className="text-blue-500" />
              Digital KYC & Compliance
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Complete your KYC to unlock publishing and payment features.</p>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-sm font-bold text-gray-400">Status:</span>
            {tenantInfo?.kyc?.verificationLevel === 0 ? (
              <span className="text-orange-500 font-bold text-sm bg-orange-500/10 px-2 py-1 rounded-md">Level 0 (Draft)</span>
            ) : (
              <span className="text-green-500 font-bold text-sm bg-green-500/10 px-2 py-1 rounded-md">Verified</span>
            )}
          </div>
        </div>

        {/* Legal Declaration (Phase 3 Requirement) */}
        {!tenantInfo?.legal?.merchantDeclarationAcceptedAt && (
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="text-red-500 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Mandatory Merchant Declaration</h3>
                <p className="text-red-200/80 text-sm mb-4">
                  Before proceeding, you must formally accept responsibility for your kitchen operations.
                </p>
                <div className="bg-black/40 rounded-xl p-4 text-sm text-gray-300 space-y-2 mb-4">
                  <p>I confirm that:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>I am entirely responsible for the food quality provided to customers.</li>
                    <li>I am responsible for maintaining a hygienic cooking environment.</li>
                    <li>I am responsible for obtaining and maintaining local licenses (including FSSAI).</li>
                    <li>I understand that BhojanOS strictly provides software technology services and is not liable for food-related incidents.</li>
                  </ul>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-black/50"
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-white">I agree to the Merchant Declaration</span>
                </label>
                
                <button
                  onClick={handleAcceptDeclaration}
                  disabled={!declarationAccepted || loading}
                  className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  {loading ? 'Processing...' : 'Sign Declaration Digitally'}
                </button>
              </div>
            </div>
          </m.div>
        )}

        {/* KYC Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="text-gray-400" size={20} />
              Business Identity
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Owner Name *</label>
                <input 
                  type="text" 
                  value={kycForm.ownerName}
                  onChange={(e) => setKycForm({...kycForm, ownerName: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                  placeholder="Legal Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Business Name *</label>
                <input 
                  type="text" 
                  value={kycForm.businessName}
                  onChange={(e) => setKycForm({...kycForm, businessName: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                  placeholder="Registered Business Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number *</label>
                <input 
                  type="text" 
                  value={kycForm.phone}
                  onChange={(e) => setKycForm({...kycForm, phone: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address *</label>
                <input 
                  type="email" 
                  value={kycForm.email}
                  onChange={(e) => setKycForm({...kycForm, email: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Business Address *</label>
              <textarea 
                rows={2}
                value={kycForm.address}
                onChange={(e) => setKycForm({...kycForm, address: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">City</label>
                <input 
                  type="text" 
                  value={kycForm.city}
                  onChange={(e) => setKycForm({...kycForm, city: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">State</label>
                <input 
                  type="text" 
                  value={kycForm.state}
                  onChange={(e) => setKycForm({...kycForm, state: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pincode</label>
                <input 
                  type="text" 
                  value={kycForm.pincode}
                  onChange={(e) => setKycForm({...kycForm, pincode: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Country</label>
                <input 
                  type="text" 
                  value={kycForm.country}
                  disabled
                  className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-gray-500 focus:outline-none cursor-not-allowed" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">GST Number (Optional)</label>
                <input 
                  type="text" 
                  value={kycForm.gstNumber}
                  onChange={(e) => setKycForm({...kycForm, gstNumber: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">PAN Number (Optional)</label>
                <input 
                  type="text" 
                  value={kycForm.panNumber}
                  onChange={(e) => setKycForm({...kycForm, panNumber: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 pt-4 border-t border-white/5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  FSSAI Number <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-[10px]">Optional During Sandbox</span>
                </label>
                <input 
                  type="text" 
                  value={kycForm.fssaiNumber}
                  onChange={(e) => setKycForm({...kycForm, fssaiNumber: e.target.value})}
                  placeholder="14-digit FSSAI Number"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                />
                <p className="text-xs text-gray-500 mt-2">You can register without an FSSAI number to test the Sandbox, but it is Required Before Live Launch.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveKYC}
                disabled={loading}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Document Upload Center (UI Shell) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="text-gray-400" size={20} />
              Document Center <span className="text-orange-500 bg-orange-500/10 px-2 py-1 rounded text-[12px] ml-2">Optional During Sandbox</span>
            </h2>
            <p className="text-sm text-gray-400 mt-1">Upload required documents to achieve Level 1 Verification (Required Before Live Launch).</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <label className="border border-white/10 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer group">
              <UploadCloud className="text-gray-500 group-hover:text-white transition-colors mb-2" size={32} />
              <p className="text-sm font-bold text-white mb-1">{uploadingDoc ? 'Uploading...' : 'Identity Proof'}</p>
              <p className="text-xs text-gray-500">Aadhaar, PAN, Passport</p>
              <input type="file" className="hidden" disabled={uploadingDoc} onChange={(e) => handleKYCUpload(e, 'identity')} />
            </label>

            <label className="border border-white/10 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer group">
              <UploadCloud className="text-gray-500 group-hover:text-white transition-colors mb-2" size={32} />
              <p className="text-sm font-bold text-white mb-1">{uploadingDoc ? 'Uploading...' : 'Business Proof'}</p>
              <p className="text-xs text-gray-500">GST, Trade License, MSME</p>
              <input type="file" className="hidden" disabled={uploadingDoc} onChange={(e) => handleKYCUpload(e, 'business')} />
            </label>

          </div>
        </div>

      </div>
    </div>
  );
};
