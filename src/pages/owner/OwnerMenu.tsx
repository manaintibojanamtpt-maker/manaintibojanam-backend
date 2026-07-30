import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import {
  fetchOwnerMenuItemsCached,
  invalidateOwnerMenuCache,
  peekOwnerMenuCache,
  seedOwnerMenuCache,
} from '../../lib/ownerMenuCache';
import type { MenuItem } from '../../types';
import { useDashboardMenu } from '../../context/DashboardRealtimeProvider';
import type {
  StorefrontAddonGroupSnapshot,
  StorefrontVariantSnapshot,
} from '../../domain/storefront/menu-item-projection';
import {
  countMenuOptions,
  normalizeAddonGroupsForSave,
  normalizeVariantsForSave,
} from '../../lib/menuItemOptions';
import { MenuItemOptionsEditor } from '../../components/owner/MenuItemOptionsEditor';
import { addMenuItem, updateMenuItem, deleteMenuItem } from '../../services/api';
import { fetchOwnerCategories, type OwnerCategory } from '../../lib/ownerCategoryApi';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Loader2, ClipboardList, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { needsStoreSetup } from '../../lib/storeSetupProgress';

// Client-side AI Image Enhancer & Compressor
const compressImage = async (file: File, magicEnhance: boolean = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 600; // Slightly higher resolution for better quality
        const MAX_HEIGHT = 600;
        
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
        
        if (ctx) {
          // AI Magic Enhance: Optimized for Food Photography
          // Increases saturation, contrast, and adds slight warmth
          if (magicEnhance) {
            ctx.filter = 'contrast(1.15) saturate(1.25) brightness(1.05) sepia(0.05)';
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Reset filter
          ctx.filter = 'none';
        }
        
        // Output as high-quality WebP
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const OwnerMenu = () => {
  const { tenantInfo } = useTenant();
  const tenantId = useOwnerTenantId();
  const dashboardMenu = useDashboardMenu();

  const [items, setItems] = useState<MenuItem[]>(() => {
    if (tenantId) {
      const cached = peekOwnerMenuCache(tenantId);
      if (cached?.items?.length) return cached.items;
    }
    if (dashboardMenu.items.length) return dashboardMenu.items;
    return [];
  });
  const [loading, setLoading] = useState(() => items.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    categoryId: '',
    type: 'veg' as 'veg' | 'non-veg',
    isAvailable: true,
    image: '',
    magicEnhance: true // Default to true for better food photos
  });
  const [categories, setCategories] = useState<OwnerCategory[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState<StorefrontVariantSnapshot[]>([]);
  const [addonGroups, setAddonGroups] = useState<StorefrontAddonGroupSnapshot[]>([]);

  const loadMenuItems = async (activeTenantId: string, opts?: { soft?: boolean }) => {
    const soft = opts?.soft ?? items.length > 0;
    if (soft) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetchOwnerMenuItemsCached(activeTenantId, (fresh) => {
        setItems(fresh.items ?? []);
      });
      setItems(response.items ?? []);
    } catch (error) {
      console.error('Menu load error:', error);
      if (items.length === 0) {
        toast.error('Failed to load menu. Check your connection and try again.');
        setItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!tenantId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const cached = peekOwnerMenuCache(tenantId);
    if (cached?.items?.length) {
      setItems(cached.items);
      setLoading(false);
    } else if (dashboardMenu.items.length) {
      setItems(dashboardMenu.items);
      seedOwnerMenuCache(tenantId, dashboardMenu.items);
      setLoading(false);
    }

    void loadMenuItems(tenantId, { soft: true });
    void fetchOwnerCategories(tenantId)
      .then((response) => setCategories((response.categories ?? []).filter((c) => c.isActive !== false)))
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category: item.category,
        categoryId: item.categoryId || '',
        type: item.type || 'veg',
        isAvailable: item.isAvailable,
        image: item.image || '',
        magicEnhance: true
      });
      setVariants(item.variants ? [...item.variants] : []);
      setAddonGroups(item.addonGroups ? [...item.addonGroups] : []);
    } else {
      const defaultCategory = categories[0];
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: defaultCategory?.name || 'Main Course',
        categoryId: defaultCategory?.id || '',
        type: 'veg',
        isAvailable: true,
        image: '',
        magicEnhance: true
      });
      setVariants([]);
      setAddonGroups([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const nextAvailable = !item.isAvailable;
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isAvailable: nextAvailable } : row)),
    );
    try {
      await updateMenuItem(item.id, { isAvailable: nextAvailable });
      if (tenantId) {
        invalidateOwnerMenuCache(tenantId);
        seedOwnerMenuCache(
          tenantId,
          items.map((row) => (row.id === item.id ? { ...row, isAvailable: nextAvailable } : row)),
        );
      }
      toast.success(`${item.name} is now ${nextAvailable ? 'Available' : 'Sold Out'}`);
    } catch (err) {
      console.error(err);
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, isAvailable: item.isAvailable } : row)),
      );
      toast.error('Failed to update availability');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const base64Image = await compressImage(file, formData.magicEnhance);
      setFormData(prev => ({ ...prev, image: base64Image }));
    } catch (error) {
      console.error('Failed to compress image:', error);
      toast.error('Failed to process image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    
    if (!formData.name || !formData.price || !formData.category) {
      toast.error('Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      const basePrice = Number(formData.price);
      const itemData = {
        tenantId,
        name: formData.name,
        description: formData.description,
        price: basePrice,
        category: formData.category,
        ...(formData.categoryId ? { categoryId: formData.categoryId } : {}),
        type: formData.type,
        isAvailable: formData.isAvailable,
        image: formData.image || '',
        variants: normalizeVariantsForSave(variants, basePrice),
        addonGroups: normalizeAddonGroupsForSave(addonGroups),
      };

      if (editingItem) {
        await updateMenuItem(editingItem.id, itemData);
        toast.success('Item updated successfully');
      } else {
        await addMenuItem(itemData as any);
        toast.success('Item added successfully');
      }
      handleCloseModal();
      invalidateOwnerMenuCache(tenantId);
      await loadMenuItems(tenantId, { soft: true });
    } catch (error) {
      console.error('Save failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to save menu item';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteMenuItem(id);
        setItems((prev) => prev.filter((row) => row.id !== id));
        if (tenantId) {
          invalidateOwnerMenuCache(tenantId);
          seedOwnerMenuCache(
            tenantId,
            items.filter((row) => row.id !== id),
          );
        }
        toast.success('Item deleted');
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6 md:p-12 text-white max-w-lg mx-auto text-center">
        <h2 className="text-xl font-bold mb-2">Finish store setup</h2>
        <p className="text-white/50 mb-6 text-sm leading-relaxed">
          Your menu will unlock after registration creates your storefront tenant.
        </p>
        <Link
          to="/owner/register"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#FF6B00] hover:bg-[#E56D00] text-white font-bold rounded-xl transition-colors"
        >
          Complete registration
        </Link>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="p-6 md:p-12 text-white">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="h-10 w-48 rounded-xl bg-white/5 animate-pulse" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 text-white">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu Builder</h1>
            <p className="text-white/50 mt-1">
              Manage your catalog items and prices.
              {refreshing ? <span className="ml-2 text-orange-400/80">· updating…</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/owner/menu/categories"
              className="flex items-center px-4 py-2 border border-white/15 hover:bg-white/5 text-white font-semibold rounded-lg transition-colors"
            >
              Manage categories
            </Link>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-600/20"
            >
              <Plus size={18} className="mr-2" />
              Add Item
            </button>
          </div>
        </header>

        {tenantInfo && needsStoreSetup(tenantInfo, items.length) && (
          <div className="mb-6 p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-orange-300">Store setup in progress</p>
              <p className="text-xs text-orange-200/70 mt-1">
                Step 6 needs at least 3 menu items. Import the ready-made template or add dishes here.
              </p>
            </div>
            <Link
              to="/owner/setup?step=6"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold transition-colors"
            >
              <ClipboardList size={16} />
              Continue setup
            </Link>
          </div>
        )}

        <div className="bg-[#0f0f11] rounded-2xl border border-white/10 overflow-hidden">
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={24} className="text-white/40" />
              </div>
              <h3 className="text-lg font-bold mb-2">No menu items yet</h3>
              <p className="text-white/50 mb-6 max-w-sm mx-auto">
                Add your first dish to start receiving orders on your storefront.
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Create First Item
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-4 text-xs uppercase tracking-wider font-semibold text-white/50">Item</th>
                    <th className="p-4 text-xs uppercase tracking-wider font-semibold text-white/50">Price</th>
                    <th className="p-4 text-xs uppercase tracking-wider font-semibold text-white/50">Category</th>
                    <th className="p-4 text-xs uppercase tracking-wider font-semibold text-white/50">Status</th>
                    <th className="p-4 text-xs uppercase tracking-wider font-semibold text-white/50 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-[#0a0a0a]" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                              <ImageIcon size={16} className="text-white/30" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {item.name}
                            </div>
                            <div className="text-xs text-white/40 truncate max-w-[200px]">{item.description}</div>
                            {(() => {
                              const counts = countMenuOptions(item.variants ?? [], item.addonGroups ?? []);
                              if (counts.variantCount === 0 && counts.addonCount === 0) return null;
                              return (
                                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                                  {counts.variantCount > 0 ? `${counts.variantCount} size${counts.variantCount > 1 ? 's' : ''}` : null}
                                  {counts.variantCount > 0 && counts.addonCount > 0 ? ' · ' : null}
                                  {counts.addonCount > 0 ? `${counts.addonCount} add-on${counts.addonCount > 1 ? 's' : ''}` : null}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-sm">₹{item.price}</td>
                      <td className="p-4">
                        <span className="bg-white/5 px-2 py-1 rounded-md text-xs text-white/70 border border-white/10">{item.category}</span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAvailability(item);
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${item.isAvailable ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        >
                          {item.isAvailable ? 'Available' : 'Sold Out'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link
                          to={`/owner/recipes?menuItemId=${encodeURIComponent(item.id)}`}
                          className="inline-flex p-2 hover:bg-purple-500/20 rounded-lg text-purple-400/70 hover:text-purple-300 transition-colors"
                          title="Open Recipe Builder"
                        >
                          <BookOpen size={16} />
                        </Link>
                        <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-500/60 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Item Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="sticky top-0 bg-[#0f0f11] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'New Menu Item'}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Item Name</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-white/20"
                  placeholder="e.g. Chicken Biryani"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Price (₹)</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-white/20"
                    placeholder="250"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Category</label>
                  {categories.length > 0 ? (
                    <select
                      required
                      value={formData.categoryId || formData.category}
                      onChange={(e) => {
                        const selected = categories.find((c) => c.id === e.target.value);
                        if (selected) {
                          setFormData({ ...formData, categoryId: selected.id, category: selected.name });
                          return;
                        }
                        setFormData({ ...formData, categoryId: '', category: e.target.value });
                      }}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id} className="bg-[#0f0f11]">
                          {category.name}
                        </option>
                      ))}
                      {formData.categoryId === '' && formData.category ? (
                        <option value={formData.category} className="bg-[#0f0f11]">
                          {formData.category} (custom)
                        </option>
                      ) : null}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value, categoryId: '' })}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-white/20"
                      placeholder="e.g. Main Course"
                    />
                  )}
                  <Link to="/owner/menu/categories" className="mt-1 inline-block text-[11px] text-orange-300/80 hover:text-orange-300">
                    {categories.length ? 'Edit categories' : 'Create categories'}
                  </Link>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-white/20"
                  placeholder="Short appetizing description..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <label className="text-sm font-semibold text-white/50">Dietary Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="bg-transparent text-sm sm:text-base font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="veg" className="bg-[#0f0f11]">Vegetarian</option>
                    <option value="non-veg" className="bg-[#0f0f11]">Non-Veg</option>
                  </select>
                </div>
                
                <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 cursor-pointer" onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})}>
                  <label className="text-sm font-semibold text-white/50 cursor-pointer">Available Now</label>
                  <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${formData.isAvailable ? 'bg-red-500' : 'bg-white/20'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.isAvailable ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider">Item Image</label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <span className="text-xs font-semibold text-emerald-500 group-hover:text-emerald-400 transition-colors">✨ AI Food Enhance</span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${formData.magicEnhance ? 'bg-emerald-500' : 'bg-white/20'}`} onClick={(e) => { e.preventDefault(); setFormData({...formData, magicEnhance: !formData.magicEnhance}); }}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${formData.magicEnhance ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#0a0a0a] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-white/20" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer bg-[#151515] hover:bg-[#1a1a1a] border border-white/10 rounded-lg py-3 px-4 text-center text-sm font-semibold transition-colors">
                    {uploadingImage ? <Loader2 size={18} className="animate-spin mx-auto text-white/50" /> : 'Choose Image (Max 200KB)'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                  </label>
                </div>
              </div>

              <MenuItemOptionsEditor
                basePrice={Number(formData.price) || 0}
                variants={variants}
                addonGroups={addonGroups}
                onVariantsChange={setVariants}
                onAddonGroupsChange={setAddonGroups}
              />

              <div className="pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center py-3 bg-white text-black font-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <>{editingItem ? 'Save Changes' : 'Create Item'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerMenu;
