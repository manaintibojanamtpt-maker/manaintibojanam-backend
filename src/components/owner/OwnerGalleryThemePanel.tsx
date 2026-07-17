import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, Palette, Plus, Save, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { fetchOwnerStorefront, updateOwnerStorefront } from '../../lib/ownerStorefrontApi';
import {
  uploadStorefrontMediaViaApi,
  type StorefrontMediaKind,
} from '../../lib/ownerStorefrontMediaApi';

interface GalleryItem {
  galleryId: string;
  url: string;
  caption: string;
  sortOrder: number;
}

interface ThemeForm {
  primaryColor: string;
  secondaryColor: string;
  highlightColor: string;
  coverUrl: string;
  tagline: string;
  description: string;
}

const DEFAULT_THEME: ThemeForm = {
  primaryColor: '#FF6B00',
  secondaryColor: '#1a1a1a',
  highlightColor: '#ef4444',
  coverUrl: '',
  tagline: '',
  description: '',
};

export const OwnerGalleryThemePanel: React.FC = () => {
  const tenantId = useOwnerTenantId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [theme, setTheme] = useState<ThemeForm>(DEFAULT_THEME);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await fetchOwnerStorefront(tenantId);
        const mp = data.marketplace ?? {};
        const rawGallery = Array.isArray(mp.gallery) ? mp.gallery : [];
        setGallery(
          rawGallery
            .map((entry, index) => {
              const item = entry as Record<string, unknown>;
              return {
                galleryId: typeof item.galleryId === 'string' ? item.galleryId : `gallery_${index}`,
                url: typeof item.url === 'string' ? item.url : '',
                caption: typeof item.caption === 'string' ? item.caption : '',
                sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
              };
            })
            .filter((item) => item.url)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );

        const rawTheme = (mp.theme ?? {}) as Record<string, unknown>;
        setTheme({
          primaryColor: typeof rawTheme.primaryColor === 'string' ? rawTheme.primaryColor : DEFAULT_THEME.primaryColor,
          secondaryColor: typeof rawTheme.secondaryColor === 'string' ? rawTheme.secondaryColor : DEFAULT_THEME.secondaryColor,
          highlightColor: typeof rawTheme.highlightColor === 'string' ? rawTheme.highlightColor : DEFAULT_THEME.highlightColor,
          coverUrl: typeof rawTheme.coverUrl === 'string' ? rawTheme.coverUrl : '',
          tagline: typeof mp.tagline === 'string' ? mp.tagline : '',
          description: typeof mp.description === 'string' ? mp.description : '',
        });
      } catch (error) {
        console.error('Failed to load gallery/theme:', error);
        toast.error('Failed to load gallery and theme');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [tenantId]);

  const uploadImage = async (file: File, kind: StorefrontMediaKind) => {
    if (!tenantId) throw new Error('Kitchen not loaded yet.');
    return uploadStorefrontMediaViaApi(file, tenantId, kind);
  };

  const persistStorefront = async (
    nextGallery: GalleryItem[],
    nextTheme: ThemeForm,
    toastId?: string,
  ) => {
    if (!tenantId) return;
    const coverUrl = nextTheme.coverUrl || nextGallery[0]?.url || undefined;
    await updateOwnerStorefront(tenantId, {
      marketplace: {
        gallery: nextGallery.map((item, index) => ({
          galleryId: item.galleryId,
          url: item.url,
          caption: item.caption.trim() || undefined,
          sortOrder: index,
        })),
        theme: {
          primaryColor: nextTheme.primaryColor,
          secondaryColor: nextTheme.secondaryColor,
          highlightColor: nextTheme.highlightColor,
          coverUrl,
        },
        tagline: nextTheme.tagline.trim() || undefined,
        description: nextTheme.description.trim() || undefined,
      },
    });
    if (toastId) {
      toast.success('Synced to OrderBhojan', { id: toastId });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading photo…');
    try {
      const downloadUrl = await uploadImage(file, 'gallery');
      const nextGallery = [
        ...gallery,
        {
          galleryId: `gallery_${Date.now()}`,
          url: downloadUrl,
          caption: '',
          sortOrder: gallery.length,
        },
      ];
      setGallery(nextGallery);
      await persistStorefront(nextGallery, theme, toastId);
    } catch (error) {
      console.error('Image upload failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(message, { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setUploading(true);
    const toastId = toast.loading('Uploading cover…');
    try {
      const downloadUrl = await uploadImage(file, 'cover');
      const nextTheme = { ...theme, coverUrl: downloadUrl };
      setTheme(nextTheme);
      await persistStorefront(gallery, nextTheme, toastId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload cover image';
      toast.error(message, { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const toastId = toast.loading('Saving gallery and theme…');
    try {
      await persistStorefront(gallery, theme, toastId);
    } catch (error) {
      console.error('Failed to save gallery/theme:', error);
      const message = error instanceof Error ? error.message : 'Failed to save gallery and theme';
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <p className="text-xs text-white/50">
        Cover and gallery photos auto-sync to OrderBhojan after upload. Theme colors and text save when you tap Save.
      </p>
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={20} className="text-[#FF6B00]" />
          <h3 className="text-lg font-bold text-white">Storefront Theme</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Tagline</label>
            <input
              type="text"
              value={theme.tagline}
              onChange={(e) => setTheme((prev) => ({ ...prev, tagline: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white"
              placeholder="Authentic home-style meals"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Primary Color</label>
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => setTheme((prev) => ({ ...prev, primaryColor: e.target.value }))}
              className="h-12 w-full rounded-lg border border-white/10 bg-[#0a0a0a] cursor-pointer"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">About (shown on restaurant page)</label>
            <textarea
              rows={3}
              value={theme.description}
              onChange={(e) => setTheme((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white"
              placeholder="Tell customers what makes your kitchen special"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Cover Image</label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-40 rounded-xl border border-dashed border-white/20 bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                {theme.coverUrl ? (
                  <img src={theme.coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="text-white/30" size={28} />
                )}
              </div>
              <label className="cursor-pointer rounded-lg border border-white/10 bg-[#151515] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a1a]">
                <span className="flex items-center gap-2">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Upload Cover
                </span>
                <input type="file" className="sr-only" accept="image/*" onChange={handleCoverUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/10" />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ImageIcon size={20} className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">Photo Gallery</h3>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">
            <Plus size={16} />
            Add Photo
            <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </div>

        {gallery.length === 0 ? (
          <p className="text-sm text-white/50">No gallery photos yet. Add kitchen, dish, or team photos customers see on OrderBhojan.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gallery.map((item) => (
              <div key={item.galleryId} className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
                <img src={item.url} alt={item.caption || 'Gallery'} className="h-36 w-full object-cover" />
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={item.caption}
                    onChange={(e) =>
                      setGallery((prev) =>
                        prev.map((entry) =>
                          entry.galleryId === item.galleryId ? { ...entry, caption: e.target.value } : entry,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 py-2 text-sm text-white"
                    placeholder="Caption (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => setGallery((prev) => prev.filter((entry) => entry.galleryId !== item.galleryId))}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        disabled={saving || uploading || !tenantId}
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-6 py-3 text-base font-bold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {saving ? 'Saving…' : 'Save Gallery & Theme'}
      </button>
    </div>
  );
};

export default OwnerGalleryThemePanel;
