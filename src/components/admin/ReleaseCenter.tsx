import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import { ReleaseNote } from '../../types';
import toast from 'react-hot-toast';
import { Rocket, Send, Edit, Plus, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function ReleaseCenter() {
  const { currentUser } = useAuth();
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Sort client-side to avoid composite index req
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

  const handleSave = async (publish: boolean) => {
    if (!version || !title || !summary) {
      toast.error('Version, Title, and Summary are required.');
      return;
    }

    try {
      const db = getDb();
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

      if (editingId) {
        await updateDoc(doc(db, 'release_notes', editingId), payload);
        toast.success(publish ? 'Release published!' : 'Draft saved!');
      } else {
        await addDoc(collection(db, 'release_notes'), payload);
        toast.success(publish ? 'Release published!' : 'Draft saved!');
      }

      resetForm();
      loadReleases();
    } catch (error: any) {
      console.error(error);
      toast.error('Error saving release: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Rocket className="text-indigo-500" />
          Release Center
        </h2>
        {!isCreating && !editingId && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> New Release
          </button>
        )}
      </div>

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
                <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white">
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
                    <button onClick={() => removeHighlight(i)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button onClick={addHighlight} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">+ Add Highlight</button>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/10 mt-4">
              <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={() => handleSave(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">Save Draft</button>
              <button onClick={() => handleSave(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"><Send size={16}/> Publish Now</button>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <div className="space-y-4">
          {releases.length === 0 && !loading && (
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
                  {/* For a fully robust solution, this should be queried, but for now we leave space for analytics */}
                  <span className="text-lg font-bold text-white">-</span>
                </div>
                <button 
                  onClick={() => {
                    setVersion(release.version);
                    setTitle(release.title);
                    setSummary(release.summary);
                    setCategory(release.category as any);
                    setHighlights(release.highlights || []);
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
