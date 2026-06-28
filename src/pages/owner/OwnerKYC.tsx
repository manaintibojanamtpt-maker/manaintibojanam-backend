import React, { useState, useEffect, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, UploadCloud, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant, type TenantInfo } from '../../context/TenantContext';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { getDb } from '../../lib/firebase-db';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { uploadKycDocumentViaApi } from '../../services/KycUploadService';
import {
  assertNotDuplicateUpload,
  hashFileSha256,
  KycDocumentSlot,
  validateKycDocument,
  getExistingDocumentMeta,
} from '../../lib/kycDocumentValidation';

type KycStepId = 'declaration' | 'identity' | 'documents';

function getKycStatusDisplay(tenantInfo: TenantInfo | null) {
  const level = tenantInfo?.kyc?.verificationLevel;
  const status = tenantInfo?.kyc?.status;

  if (status === 'verified' || level === 2 || level === 3) {
    return { label: 'Verified', className: 'text-green-400 bg-green-500/10 border-green-500/20' };
  }
  if (status === 'pending_verification' || level === 1) {
    return { label: 'Pending Review', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  }
  if (level === 0) {
    return { label: 'Draft', className: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
  }
  return { label: 'Not Started', className: 'text-neutral-400 bg-white/5 border-white/10' };
}

interface KycStepSectionProps {
  id: KycStepId;
  step: number;
  title: string;
  subtitle?: string;
  isComplete: boolean;
  completeLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  locked?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const KycStepSection: React.FC<KycStepSectionProps> = ({
  step,
  title,
  subtitle,
  isComplete,
  completeLabel,
  isOpen,
  onToggle,
  locked = false,
  badge,
  children,
}) => (
  <div
    className={`bg-white/5 border rounded-2xl overflow-hidden transition-colors ${
      isComplete ? 'border-emerald-500/25' : 'border-white/10'
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      className={`w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left transition-colors ${
        locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.03] cursor-pointer'
      }`}
      aria-expanded={isOpen}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black ${
            isComplete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/70'
          }`}
        >
          {isComplete ? <CheckCircle2 size={16} /> : step}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {badge}
            {isComplete && !isOpen && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {completeLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{isComplete && !isOpen ? completeLabel : subtitle}</p>
          )}
        </div>
      </div>
      {!locked && (
        <ChevronDown
          size={20}
          className={`text-white/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      )}
    </button>

    <AnimatePresence initial={false}>
      {isOpen && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
          <div className="px-5 sm:px-6 pb-6 pt-0 border-t border-white/10">{children}</div>
        </m.div>
      )}
    </AnimatePresence>
  </div>
);

export const OwnerKYC: React.FC = () => {
  const { userProfile } = useAuth();
  const tenantId = useOwnerTenantId();
  const { tenantInfo, loading: tenantLoading, refreshTenant } = useTenant();
  const resolvedTenantId = tenantInfo?.id || tenantId;
  const [loading, setLoading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<KycDocumentSlot | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Partial<Record<KycDocumentSlot, string>>>({});
  const identityInputRef = useRef<HTMLInputElement>(null);
  const businessInputRef = useRef<HTMLInputElement>(null);
  const sessionUploadHashes = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (tenantId && !tenantInfo && !tenantLoading) {
      void refreshTenant();
    }
  }, [tenantId, tenantInfo, tenantLoading, refreshTenant]);

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

  useEffect(() => {
    if (tenantInfo) {
      setKycForm({
        ownerName: tenantInfo.kyc?.ownerName || '',
        businessName: tenantInfo.kyc?.businessName || '',
        phone: tenantInfo.kyc?.phone || '',
        email: tenantInfo.kyc?.email || '',
        address: tenantInfo.kyc?.address || '',
        city: tenantInfo.kyc?.city || '',
        state: tenantInfo.kyc?.state || '',
        country: tenantInfo.kyc?.country || 'India',
        pincode: tenantInfo.kyc?.pincode || '',
        gstNumber: tenantInfo.kyc?.gstNumber || '',
        panNumber: tenantInfo.kyc?.panNumber || '',
        fssaiNumber: tenantInfo.fssai?.number || '',
      });
    }
  }, [tenantInfo]);

  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [openStep, setOpenStep] = useState<KycStepId | null>(null);

  const identityDoc = getExistingDocumentMeta(tenantInfo?.kyc as Record<string, unknown> | undefined, 'identity');
  const businessDoc = getExistingDocumentMeta(tenantInfo?.kyc as Record<string, unknown> | undefined, 'business');

  const isDeclarationComplete = Boolean(tenantInfo?.legal?.merchantDeclarationAcceptedAt);

  const isBusinessIdentityComplete = Boolean(
    tenantInfo?.kyc?.ownerName &&
      tenantInfo?.kyc?.businessName &&
      tenantInfo?.kyc?.phone &&
      tenantInfo?.kyc?.address
  );

  const areDocumentsComplete = Boolean(identityDoc.url && businessDoc.url);

  const kycStatus = getKycStatusDisplay(tenantInfo);
  const isKycSubmitted =
    kycStatus.label === 'Pending Review' || kycStatus.label === 'Verified';
  const isKycFullyComplete = kycStatus.label === 'Verified';
  const isKycCoreComplete = isDeclarationComplete && isBusinessIdentityComplete;
  const isKycWrapped = isKycCoreComplete && isKycSubmitted;

  const stepsComplete = useMemo(
    () => ({
      declaration: isDeclarationComplete,
      identity: isBusinessIdentityComplete,
      documents: areDocumentsComplete,
    }),
    [isDeclarationComplete, isBusinessIdentityComplete, areDocumentsComplete]
  );

  const firstIncompleteStep = useMemo((): KycStepId | null => {
    if (!stepsComplete.declaration) return 'declaration';
    if (!stepsComplete.identity) return 'identity';
    if (!stepsComplete.documents) return 'documents';
    return null;
  }, [stepsComplete]);

  useEffect(() => {
    if (isKycWrapped) {
      setOpenStep(null);
      return;
    }
    setOpenStep((current) => {
      if (current && !stepsComplete[current]) return current;
      return firstIncompleteStep;
    });
  }, [isKycWrapped, firstIncompleteStep, stepsComplete]);

  const toggleStep = (stepId: KycStepId) => {
    if (isKycWrapped) {
      setOpenStep((current) => (current === stepId ? null : stepId));
      return;
    }
    setOpenStep((current) => (current === stepId ? null : stepId));
  };

  const handleSaveKYC = async () => {
    if (!resolvedTenantId) {
      toast.error(
        userProfile?.ownedTenantIds?.length
          ? 'Loading your kitchen profile. Please try again in a moment.'
          : 'No kitchen linked to this account. Complete owner registration first.',
      );
      return;
    }
    if (!kycForm.ownerName || !kycForm.businessName || !kycForm.phone || !kycForm.address) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'tenants', resolvedTenantId), {
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
        'fssai.verificationStatus': kycForm.fssaiNumber ? 'submitted' : tenantInfo?.fssai?.verificationStatus || 'not_submitted',
        'kyc.verificationLevel': 1,
        'kyc.status': 'pending_verification',
      });
      toast.success('Business identity saved — submitted for review');
      setOpenStep(areDocumentsComplete ? null : 'documents');
      refreshTenant();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save KYC profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDeclaration = async () => {
    if (!resolvedTenantId) {
      toast.error(
        userProfile?.ownedTenantIds?.length
          ? 'Loading your kitchen profile. Please try again in a moment.'
          : 'No kitchen linked to this account. Complete owner registration first.',
      );
      return;
    }
    setLoading(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'tenants', resolvedTenantId), {
        'legal.merchantDeclarationAcceptedAt': new Date().toISOString(),
      });
      toast.success('Merchant Declaration Accepted');
      setOpenStep('identity');
      refreshTenant();
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept declaration');
    } finally {
      setLoading(false);
    }
  };

  const resetFileInput = (slot: KycDocumentSlot) => {
    const input = slot === 'identity' ? identityInputRef.current : businessInputRef.current;
    if (input) input.value = '';
  };

  const handleKYCUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: KycDocumentSlot) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!resolvedTenantId) {
      toast.error(
        userProfile?.ownedTenantIds?.length
          ? 'Loading your kitchen profile. Please try again in a moment.'
          : 'No kitchen linked to this account. Complete owner registration first.',
      );
      return;
    }

    const validationError = validateKycDocument(file, slot);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await assertNotDuplicateUpload(file, slot, tenantInfo?.kyc as Record<string, unknown> | undefined);

      const fileHash = await hashFileSha256(file);
      if (sessionUploadHashes.current.has(fileHash)) {
        toast.error('This file was already uploaded in this session.');
        return;
      }

      setUploadingSlot(slot);
      setUploadProgress((prev) => ({ ...prev, [slot]: 'Checking file…' }));

      await uploadKycDocumentViaApi(
        file,
        resolvedTenantId,
        slot,
        fileHash,
        (message) => setUploadProgress((prev) => ({ ...prev, [slot]: message })),
      );

      sessionUploadHashes.current.add(fileHash);
      toast.success(slot === 'identity' ? 'Aadhaar uploaded securely.' : 'Business document uploaded securely.');
      refreshTenant();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload document';
      toast.error(message);
    } finally {
      setUploadingSlot(null);
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      resetFileInput(slot);
    }
  };

  const completedStepsCount = [stepsComplete.declaration, stepsComplete.identity, stepsComplete.documents].filter(Boolean).length;

  const renderUploadSlot = (
    slot: KycDocumentSlot,
    title: string,
    hint: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    existing: { url?: string; fileName?: string },
  ) => {
    const isUploading = uploadingSlot === slot;
    const progressLabel = uploadProgress[slot];
    const isBusy = uploadingSlot !== null;
    const isUploaded = Boolean(existing.url);

    return (
      <label
        className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors group ${
          isUploaded
            ? 'border-green-500/30 bg-green-500/5 cursor-default'
            : isUploading
              ? 'border-blue-500/30 bg-blue-500/5 cursor-wait'
              : 'border-white/10 bg-black/20 hover:bg-black/40 cursor-pointer'
        }`}
      >
        {isUploaded ? (
          <CheckCircle2 className="text-green-400 mb-2" size={32} />
        ) : (
          <UploadCloud
            className={`mb-2 transition-colors ${isUploading ? 'text-blue-400 animate-pulse' : 'text-gray-500 group-hover:text-white'}`}
            size={32}
          />
        )}
        <p className="text-sm font-bold text-white mb-1">
          {isUploading ? (progressLabel || 'Uploading…') : isUploaded ? `${title} uploaded` : title}
        </p>
        <p className="text-xs text-gray-500">
          {isUploaded ? existing.fileName || 'Document on file' : hint}
        </p>
        {isUploading && (
          <p className="text-xs text-blue-300/80 mt-2">Do not close this tab until upload completes.</p>
        )}
        {!isUploaded && (
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={slot === 'identity' ? '.pdf,.jpg,.jpeg,.png,.webp' : '.pdf,.jpg,.jpeg,.png,.webp'}
            disabled={isBusy || tenantLoading || !resolvedTenantId}
            onChange={(event) => void handleKYCUpload(event, slot)}
          />
        )}
      </label>
    );
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Shield className="text-blue-500" />
              Digital KYC & Compliance
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              {isKycWrapped
                ? 'Your compliance details are on file. Expand a section below only if you need to update something.'
                : 'Complete each step below to unlock publishing and payment features.'}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-gray-400">Status:</span>
            <span className={`font-bold text-sm px-2 py-1 rounded-md border ${kycStatus.className}`}>
              {kycStatus.label}
            </span>
          </div>
        </div>

        {isKycWrapped && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={22} />
              <div>
                <h2 className="text-lg font-black text-white">
                  {isKycFullyComplete ? 'KYC completed' : 'KYC submitted — pending review'}
                </h2>
                <p className="text-sm text-emerald-100/75 mt-1">
                  {isKycFullyComplete
                    ? 'Your kitchen is verified. All required compliance details are approved.'
                    : 'We have your business identity and declaration. Our team will review your submission shortly.'}
                </p>
                <p className="text-xs text-white/45 mt-2">
                  {tenantInfo?.kyc?.businessName || kycForm.businessName} · {tenantInfo?.kyc?.phone || kycForm.phone}
                </p>
              </div>
            </div>
          </m.div>
        )}

        {!isKycWrapped && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-white/60">
              Step {Math.min(completedStepsCount + 1, 3)} of 3 — complete one section at a time
            </p>
            <p className="text-xs font-bold text-white/40">{completedStepsCount}/3 done</p>
          </div>
        )}

        <KycStepSection
          id="declaration"
          step={1}
          title="Merchant Declaration"
          subtitle="Accept responsibility for your kitchen operations before continuing."
          isComplete={stepsComplete.declaration}
          completeLabel="Declaration signed"
          isOpen={openStep === 'declaration'}
          onToggle={() => toggleStep('declaration')}
        >
          <div className="pt-4 space-y-4">
            <div className="bg-black/40 rounded-xl p-4 text-sm text-gray-300 space-y-2">
              <p>I confirm that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>I am entirely responsible for the food quality provided to customers.</li>
                <li>I am responsible for maintaining a hygienic cooking environment.</li>
                <li>I am responsible for obtaining and maintaining local licenses (including FSSAI).</li>
                <li>I understand that BhojanOS provides software technology services and is not liable for food-related incidents.</li>
              </ul>
            </div>
            {!isDeclarationComplete ? (
              <>
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
                  type="button"
                  onClick={handleAcceptDeclaration}
                  disabled={!declarationAccepted || loading || tenantLoading || !resolvedTenantId}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  {loading ? 'Processing...' : tenantLoading ? 'Loading kitchen...' : 'Sign Declaration Digitally'}
                </button>
              </>
            ) : (
              <p className="text-sm text-emerald-400/90 flex items-center gap-2">
                <CheckCircle2 size={16} /> Signed on{' '}
                {new Date(tenantInfo!.legal!.merchantDeclarationAcceptedAt).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        </KycStepSection>

        <KycStepSection
          id="identity"
          step={2}
          title="Business Identity"
          subtitle="Legal name, business details, and registered address."
          isComplete={stepsComplete.identity}
          completeLabel="Details saved"
          isOpen={openStep === 'identity'}
          onToggle={() => toggleStep('identity')}
          locked={!stepsComplete.declaration}
        >
          <div className="pt-4 space-y-6">
            {!stepsComplete.declaration && (
              <p className="text-sm text-amber-400/90">Complete the merchant declaration first.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Owner Name *</label>
                <input
                  type="text"
                  value={kycForm.ownerName}
                  onChange={(e) => setKycForm({ ...kycForm, ownerName: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Legal Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Business Name *</label>
                <input
                  type="text"
                  value={kycForm.businessName}
                  onChange={(e) => setKycForm({ ...kycForm, businessName: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Registered Business Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number *</label>
                <input
                  type="text"
                  value={kycForm.phone}
                  onChange={(e) => setKycForm({ ...kycForm, phone: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address *</label>
                <input
                  type="email"
                  value={kycForm.email}
                  onChange={(e) => setKycForm({ ...kycForm, email: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Business Address *</label>
              <textarea
                rows={2}
                value={kycForm.address}
                onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">City</label>
                <input type="text" value={kycForm.city} onChange={(e) => setKycForm({ ...kycForm, city: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">State</label>
                <input type="text" value={kycForm.state} onChange={(e) => setKycForm({ ...kycForm, state: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pincode</label>
                <input type="text" value={kycForm.pincode} onChange={(e) => setKycForm({ ...kycForm, pincode: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Country</label>
                <input type="text" value={kycForm.country} disabled className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">GST Number (Optional)</label>
                <input type="text" value={kycForm.gstNumber} onChange={(e) => setKycForm({ ...kycForm, gstNumber: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">PAN Number (Optional)</label>
                <input type="text" value={kycForm.panNumber} onChange={(e) => setKycForm({ ...kycForm, panNumber: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                FSSAI Number
                <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-[10px] normal-case">Optional during sandbox</span>
              </label>
              <input type="text" value={kycForm.fssaiNumber} onChange={(e) => setKycForm({ ...kycForm, fssaiNumber: e.target.value })} placeholder="14-digit FSSAI Number" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveKYC}
                disabled={loading || !stepsComplete.declaration}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : isBusinessIdentityComplete ? 'Update & resubmit' : 'Save & continue'}
              </button>
            </div>
          </div>
        </KycStepSection>

        <KycStepSection
          id="documents"
          step={3}
          title="Document Center"
          subtitle="Upload Aadhaar and business proof (required before live launch)."
          isComplete={stepsComplete.documents}
          completeLabel="Documents uploaded"
          isOpen={openStep === 'documents'}
          onToggle={() => toggleStep('documents')}
          locked={!stepsComplete.identity}
          badge={
            <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-[10px] font-bold">
              Optional during sandbox
            </span>
          }
        >
          <div className="pt-4 space-y-4">
            {!stepsComplete.identity && (
              <p className="text-sm text-amber-400/90">Save your business identity before uploading documents.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderUploadSlot('identity', 'Aadhaar', 'PDF or image — file name must include "Aadhaar"', identityInputRef, identityDoc)}
              {renderUploadSlot('business', 'Business Proof', 'GST, Trade License, or MSME (name in file)', businessInputRef, businessDoc)}
            </div>
          </div>
        </KycStepSection>

      </div>
    </div>
  );
};
