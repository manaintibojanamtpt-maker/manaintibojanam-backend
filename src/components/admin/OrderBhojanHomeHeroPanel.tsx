import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchPlatformHomeHeroConfig,
  updatePlatformHomeHeroConfig,
  type PlatformHomeHeroConfig,
  type PlatformHomeHeroSlide,
} from '../../services/api';
import StorageService from '../../services/StorageService';

const HERO_ASSET_OPTIONS = [
  { id: '', label: 'None (use URL or upload)' },
  { id: 'hero-biryani', label: 'Hero — Biryani' },
  { id: 'hero-thali', label: 'Hero — Thali' },
  { id: 'hero-tiffin', label: 'Hero — Tiffin' },
  { id: 'cat-pizza', label: 'Category — Pizza' },
  { id: 'cat-biryani', label: 'Category — Biryani' },
  { id: 'cat-meals', label: 'Category — Meals' },
  { id: 'cat-south-indian', label: 'Category — South Indian' },
  { id: 'cat-north-indian', label: 'Category — North Indian' },
] as const;

type EditableSlide = PlatformHomeHeroSlide & { imageSource: 'asset' | 'url' };

function toEditableSlide(slide: PlatformHomeHeroSlide): EditableSlide {
  return {
    ...slide,
    imageSource: slide.imageUrl ? 'url' : 'asset',
  };
}

function toPayloadSlide(slide: EditableSlide): PlatformHomeHeroSlide {
  const base: PlatformHomeHeroSlide = {
    id: slide.id.trim(),
    subline: slide.subline.trim(),
    imageAlt: slide.imageAlt.trim(),
    ...(slide.headline?.trim() ? { headline: slide.headline.trim() } : {}),
    ...(slide.cta?.trim() ? { cta: slide.cta.trim() } : {}),
    ...(slide.ctaPath?.trim() ? { ctaPath: slide.ctaPath.trim() } : {}),
  };

  if (slide.imageSource === 'url') {
    const imageUrl = slide.imageUrl?.trim();
    return imageUrl ? { ...base, imageUrl } : base;
  }

  const assetId = slide.assetId?.trim();
  return assetId ? { ...base, assetId } : base;
}

function createEmptySlide(index: number): EditableSlide {
  return {
    id: `slide-${index + 1}`,
    headline: '',
    subline: '',
    imageAlt: '',
    assetId: 'hero-biryani',
    imageSource: 'asset',
    cta: '',
    ctaPath: '',
  };
}

export function OrderBhojanHomeHeroPanel() {
  const [config, setConfig] = useState<PlatformHomeHeroConfig | null>(null);
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformHomeHeroConfig();
      setConfig(data);
      setSlides(data.slides.map(toEditableSlide));
    } catch (error) {
      console.error('Failed to load home hero config', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load hero config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const updateSlide = (index: number, patch: Partial<EditableSlide>) => {
    setSlides((current) =>
      current.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addSlide = () => {
    if (slides.length >= 6) {
      toast.error('Maximum six slides allowed');
      return;
    }
    setSlides((current) => [...current, createEmptySlide(current.length)]);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) {
      toast.error('At least one slide is required');
      return;
    }
    setSlides((current) => current.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!config) return;

    const ids = slides.map((slide) => slide.id.trim()).filter(Boolean);
    if (ids.length !== slides.length) {
      toast.error('Every slide needs a unique id');
      return;
    }
    if (new Set(ids).size !== ids.length) {
      toast.error('Slide ids must be unique');
      return;
    }

    for (let i = 0; i < slides.length; i += 1) {
      const slide = slides[i];
      if (!slide.subline.trim() || !slide.imageAlt.trim()) {
        toast.error(`Slide ${i + 1} requires subline and image alt text`);
        return;
      }
      if (slide.imageSource === 'url' && !slide.imageUrl?.trim()) {
        toast.error(`Slide ${i + 1} requires an image URL or upload`);
        return;
      }
      if (slide.imageSource === 'asset' && !slide.assetId?.trim()) {
        toast.error(`Slide ${i + 1} requires a built-in asset or switch to URL/upload`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: PlatformHomeHeroConfig = {
        eyebrow: config.eyebrow.trim(),
        headline: config.headline.trim(),
        rotationIntervalMs: config.rotationIntervalMs,
        slides: slides.map(toPayloadSlide),
      };
      const saved = await updatePlatformHomeHeroConfig(payload);
      const next = (saved as { data?: PlatformHomeHeroConfig }).data ?? payload;
      setConfig(next);
      setSlides(next.slides.map(toEditableSlide));
      toast.success('Home hero saved — live on OrderBhojan after cache refresh');
    } catch (error) {
      console.error('Failed to save home hero config', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save hero config');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            OrderBhojan Home Hero
          </h2>
          <p className="text-sm font-medium text-gray-400 mt-2">
            Manage sliding hero images on the OrderBhojan home feed.
          </p>
          {(config.updatedAt || config.updatedBy) && (
            <p className="text-xs text-gray-600 mt-2">
              Last saved{config.updatedBy ? ` by ${config.updatedBy}` : ''}
              {config.updatedAt ? ` · ${String(config.updatedAt)}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadConfig()}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/5"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save changes
          </button>
        </div>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hero header</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Eyebrow</span>
            <input
              type="text"
              value={config.eyebrow}
              onChange={(e) => setConfig({ ...config, eyebrow: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Headline</span>
            <input
              type="text"
              value={config.headline}
              onChange={(e) => setConfig({ ...config, headline: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Rotation interval (ms)
            </span>
            <input
              type="number"
              min={5000}
              max={30000}
              step={1000}
              value={config.rotationIntervalMs}
              onChange={(e) =>
                setConfig({ ...config, rotationIntervalMs: Number(e.target.value) || 12000 })
              }
              className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Slides ({slides.length}/6)
          </h3>
          <button
            type="button"
            onClick={addSlide}
            disabled={slides.length >= 6}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/5 disabled:opacity-40"
          >
            <Plus size={16} />
            Add slide
          </button>
        </div>

        {slides.map((slide, index) => (
          <div
            key={`${slide.id}-${index}`}
            className="bg-[#151515] border border-white/5 rounded-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ImageIcon size={18} className="text-orange-400" />
                <span className="text-sm font-bold text-white">Slide {index + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(index, 1)}
                  disabled={index === slides.length - 1}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10"
                  title="Remove slide"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Slide id</span>
                  <input
                    type="text"
                    value={slide.id}
                    onChange={(e) => updateSlide(index, { id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Headline</span>
                  <input
                    type="text"
                    value={slide.headline ?? ''}
                    onChange={(e) => updateSlide(index, { headline: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subline</span>
                  <textarea
                    value={slide.subline}
                    onChange={(e) => updateSlide(index, { subline: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white resize-y"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Image alt text</span>
                  <input
                    type="text"
                    value={slide.imageAlt}
                    onChange={(e) => updateSlide(index, { imageAlt: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">CTA label</span>
                    <input
                      type="text"
                      value={slide.cta ?? ''}
                      onChange={(e) => updateSlide(index, { cta: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">CTA path</span>
                    <input
                      type="text"
                      value={slide.ctaPath ?? ''}
                      onChange={(e) => updateSlide(index, { ctaPath: e.target.value })}
                      placeholder="/search?q=biryani"
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSlide(index, {
                        imageSource: 'asset',
                        imageUrl: undefined,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                      slide.imageSource === 'asset'
                        ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                        : 'border-white/10 text-gray-500'
                    }`}
                  >
                    Built-in asset
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSlide(index, {
                        imageSource: 'url',
                        assetId: undefined,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                      slide.imageSource === 'url'
                        ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                        : 'border-white/10 text-gray-500'
                    }`}
                  >
                    URL / upload
                  </button>
                </div>

                {slide.imageSource === 'asset' ? (
                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Asset</span>
                    <select
                      value={slide.assetId ?? ''}
                      onChange={(e) => updateSlide(index, { assetId: e.target.value || undefined })}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                    >
                      {HERO_ASSET_OPTIONS.map((option) => (
                        <option key={option.id || 'none'} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="block space-y-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Image URL</span>
                      <input
                        type="url"
                        value={slide.imageUrl ?? ''}
                        onChange={(e) => updateSlide(index, { imageUrl: e.target.value })}
                        placeholder="https://… or /api/marketplace/media/…"
                        className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white"
                      />
                    </label>
                    <HeroSlideImageUpload
                      slideId={slide.id || `slide-${index + 1}`}
                      currentImage={slide.imageUrl}
                      onImageSelect={(url) =>
                        updateSlide(index, { imageUrl: url || undefined, imageSource: 'url' })
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type HeroSlideImageUploadProps = {
  slideId: string;
  currentImage?: string;
  onImageSelect: (url: string) => void;
};

function HeroSlideImageUpload({ slideId, currentImage, onImageSelect }: HeroSlideImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = StorageService.validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const url = await StorageService.uploadPlatformHeroImage(file, slideId);
      onImageSelect(url);
      toast.success('Hero image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Upload image</span>
      {currentImage ? (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10">
          <img src={currentImage} alt="" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 rounded-xl border border-dashed border-white/15 text-sm font-semibold text-gray-400 hover:border-orange-500/40 hover:text-orange-300 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Choose image (JPEG, PNG, WebP)'}
        </button>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:text-white"
        >
          {currentImage ? 'Replace' : 'Upload'}
        </button>
        {currentImage ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => onImageSelect('')}
            className="px-3 py-2 rounded-lg border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/10"
          >
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleFileSelect(event)}
      />
    </div>
  );
}
