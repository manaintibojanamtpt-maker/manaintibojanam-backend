import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import { ReleaseNote } from '../../types';
import toast from 'react-hot-toast';
import { Rocket, Send, Edit, Plus, Trash2, Eye, Sparkles, FileEdit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isReleaseNewer, PENDING_PLATFORM_RELEASE } from '../../config/platformRelease';

export function ReleaseCenter() {
  const { currentUser } = useAuth();
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingManifest, setPublishingManifest] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<ReleaseNote['category']>('stability');
  const [highlights, setHighlights] = useState<string[]>(['']);

  const loadReleases = async () => {
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(query(collection(db, 'release_notes')));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseNote));
      data.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' }));
      setReleases(data);
    } catch (error: any) {
      toast.error('Failed to load releases: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleases();
  }, []);

  const latestPublished = useMemo(
    () => releases.find(r => r.isPublished) ?? null,
    [releases],
  );

  const existingManifestRelease = useMemo(
    () => releases.find(r => r.version === PENDING_PLATFORM_RELEASE.version) ?? null,
    [releases],
  );

  const manifestReadyToPublish = useMemo(() => {
    if (existingManifestRelease?.isPublished) return false;
    const baseline = latestPublished?.version ?? null;
    return isReleaseNewer(PENDING_PLATFORM_RELEASE.version, baseline) || Boolean(existingManifestRelease && !existingManifestRelease.isPublished);
  }, [existingManifestRelease, latestPublished]);

  const applyManifestToForm = () => {
    setVersion(PENDING_PLATFORM_RELEASE.version);
    setTitle(PENDING_PLATFORM_RELEASE.title);
    setSummary(PENDING_PLATFORM_RELEASE.summary);
    setCategory(PENDING_PLATFORM_RELEASE.category);
    setHighlights([...PENDING_PLATFORM_RELEASE.highlights]);
    setIsCreating(true);
    setEditingId(existingManifestRelease?.id ?? null);
  };

  const handleHighlightChange = (index: number, val: string) => {
    const newH = [...highlights];
    newH[index] = val;
    setHighlights(newH);
  };

  const addHighlight = () => setHighlights([...highlights, '']);
  const removeHighlight = (index: number) => {
    if (highlights.length > 1) {
      setHighlights(highlights.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setVersion('');
    setTitle('');
    setSummary('');
    setCategory('stability');
    setHighlights(['']);
    setIsCreating(false);
    setEditingId(null);
  };

  const saveRelease = async (payload: Partial<ReleaseNote>, options?: { editingId?: string | null; successMessage?: string }) => {
    const db = getDb();
    if (options?.editingId) {
      await updateDoc(doc(db, 'release_notes', options.editingId), payload);
    } else {
      await addDoc(collection(db, 'release_notes'), payload);
    }
    toast.success(options?.successMessage ?? 'Release saved!');
    resetForm();
    await loadReleases();
  };

  const handleSave = async (publish: boolean) => {
    if (!version || !title || !summary) {
      toast.error('Version, Title, and Summary are required.');
      return;
    }

    try {
      const cleanHighlights = highlights.filter(h => h.trim() !== '');

      const payload: Partial<ReleaseNote> = {
        version,
        title,
        summary,
        category,
        highlights: cleanHighlights,
        isPublished: publish,
        publishedBy: currentUser?.email || 'Admin',
      };

      if (publish) {
        payload.publishedAt = serverTimestamp();
      }

      await saveRelease(payload, {
        editingId,
        successMessage: publish ? 'Release published!' : 'Draft saved!',
      });
    } catch (error: any) {
      console.error(error);
      toast.error('Error saving release: ' + error.message);
    }
  };

  const handlePublishManifest = async () => {
    setPublishingManifest(true);
    try {
      const payload: Partial<ReleaseNote> = {
        version: PENDING_PLATFORM_RELEASE.version,
        title: PENDING_PLATFORM_RELEASE.title,
        summary: PENDING_PLATFORM_RELEASE.summary,
        category: PENDING_PLATFORM_RELEASE.category,
        highlights: PENDING_PLATFORM_RELEASE.highlights,
        isPublished: true,
        publishedBy: currentUser?.email || PENDING_PLATFORM_RELEASE.publishedBy,
        publishedAt: serverTimestamp(),
      };

      await saveRelease(payload, {
        editingId: existingManifestRelease?.id ?? null,
        successMessage: `v${PENDING_PLATFORM_RELEASE.version} published to all owners!`,
      });
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to publish manifest release: ' + error.message);
    } finally {
      setPublishingManifest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="text-indigo-500" />
            Release Center
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Latest published: {latestPublished ? `v${latestPublished.version}` : 'none yet'}
            {' · '}
            App manifest: v{PENDING_PLATFORM_RELEASE.version}
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> New Release
          </button>
        )}
      </div>

      {!isCreating && !editingId && manifestReadyToPublish && (
        <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/50 border border-indigo-500/30 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                <Sparkles size={14} />
                Ready to publish from app manifest
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded text-sm">
                    v{PENDING_PLATFORM_RELEASE.version}
                  </span>
                  <span className="text-xs text-gray-400 uppercase">{PENDING_PLATFORM_RELEASE.category}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{PENDING_PLATFORM_RELEASE.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{PENDING_PLATFORM_RELEASE.summary}</p>
              </div>
              <ul className="text-sm text-gray-400 space-y-1 list-disc pl-5">
                {PENDING_PLATFORM_RELEASE.highlights.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {PENDING_PLATFORM_RELEASE.highlights.length > 4 && (
                  <li className="list-none pl-0 text-gray-500">
                    +{PENDING_PLATFORM_RELEASE.highlights.length - 4} more highlights
                  </li>
                )}
              </ul>
              <p className="text-xs text-gray-500">
                Source: <code className="text-indigo-300">src/config/platformRelease.ts</code> — update this file before each deploy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                disabled={publishingManifest}
                onClick={() => void handlePublishManifest()}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
              >
                <Send size={16} />
                {publishingManifest ? 'Publishing…' : `Publish v${PENDING_PLATFORM_RELEASE.version}`}
              </button>
              <button
                type="button"
                onClick={applyManifestToForm}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors"
              >
                <FileEdit size={16} />
                Review &amp; edit first
              </button>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && !manifestReadyToPublish && latestPublished?.version === PENDING_PLATFORM_RELEASE.version && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-300 text-sm">
          v{PENDING_PLATFORM_RELEASE.version} is already published. Owners will see it on their dashboard.
        </div>
      )}

      {(isCreating || editingId) && (
        <div className="bg-[#1C0E0A] border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Release' : 'Create Release'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Version</label>
                <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 1.0.8" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value as ReleaseNote['category'])} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white">
                  <option value="security">Security</option>
                  <option value="performance">Performance</option>
                  <option value="bugfix">Bug Fix</option>
                  <option value="stability">Stability</option>
                  <option value="merchant_growth">Merchant Growth</option>
                  <option value="storefront">Storefront</option>
                  <option value="payments">Payments</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Performance & Security Update" className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Summary</label>
              <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Brief summary of what's changed..." className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white"></textarea>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Highlights</label>
              <div className="space-y-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={h} onChange={e => handleHighlightChange(i, e.target.value)} placeholder={`Highlight ${i + 1}`} className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white" />
                    <button type="button" onClick={() => removeHighlight(i)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button type="button" onClick={addHighlight} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">+ Add Highlight</button>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/10 mt-4">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button type="button" onClick={() => void handleSave(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">Save Draft</button>
              <button type="button" onClick={() => void handleSave(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"><Send size={16}/> Publish Now</button>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <div className="space-y-4">
          {releases.length === 0 && !loading && !manifestReadyToPublish && (
            <div className="text-center p-10 bg-[#1C0E0A] border border-white/10 rounded-xl">
              <p className="text-gray-400">No releases found.</p>
            </div>
          )}
          {releases.map(release => (
            <div key={release.id} className="bg-[#1C0E0A] border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded text-sm">v{release.version}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${release.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {release.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{release.category}</span>
                </div>
                <h3 className="font-bold text-white text-lg">{release.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{release.summary}</p>
                {release.isPublished && release.publishedAt && (
                  <p className="text-xs text-gray-500 mt-2">Published: {new Date(release.publishedAt.toMillis ? release.publishedAt.toMillis() : release.publishedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex flex-col items-center justify-center p-2 bg-black/30 rounded-lg min-w-[80px] border border-white/5">
                  <span className="text-xs text-gray-500 uppercase flex items-center gap-1"><Eye size={12}/> Views</span>
                  <span className="text-lg font-bold text-white">-</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVersion(release.version);
                    setTitle(release.title);
                    setSummary(release.summary);
                    setCategory(release.category);
                    setHighlights(release.highlights?.length ? release.highlights : ['']);
                    setEditingId(release.id);
                  }}
                  className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
