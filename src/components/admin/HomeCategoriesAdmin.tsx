import React, { useState, useEffect } from 'react';
import { HomeCategory } from '../../types';
import { fetchHomeCategories, saveHomeCategories } from '../../lib/config/homeCategories';
import toast from 'react-hot-toast';
import { Grid, Plus, Trash2, Save, MoveUp, MoveDown, RefreshCw } from 'lucide-react';

export function HomeCategoriesAdmin() {
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchHomeCategories();
      setCategories(data);
    } catch (e: any) {
      toast.error('Failed to load categories: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveHomeCategories(categories);
      toast.success('Categories saved successfully');
    } catch (e: any) {
      toast.error('Failed to save categories: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = (index: number, field: keyof HomeCategory, value: string) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], [field]: value };
    setCategories(newCats);
  };

  const addCategory = () => {
    setCategories([...categories, { id: '', label: '', imageUrl: '', emoji: '' }]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;
    
    const newCats = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newCats[index], newCats[swapIndex]] = [newCats[swapIndex], newCats[index]];
    setCategories(newCats);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Grid className="text-emerald-500" />
            OrderBhojan Hero Categories
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage the categories shown on the OrderBhojan discovery feed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500 text-sm">Loading categories...</div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, index) => (
            <div key={index} className="bg-[#1C0E0A] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex flex-col gap-1 w-full md:w-1/4">
                <label className="text-xs text-gray-500">ID (lowercase, no spaces)</label>
                <input
                  value={cat.id}
                  onChange={(e) => updateCategory(index, 'id', e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                  placeholder="e.g. pizza"
                />
              </div>
              <div className="flex flex-col gap-1 w-full md:w-1/4">
                <label className="text-xs text-gray-500">Label</label>
                <input
                  value={cat.label}
                  onChange={(e) => updateCategory(index, 'label', e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                  placeholder="e.g. Pizza"
                />
              </div>
              <div className="flex flex-col gap-1 w-full md:w-2/4">
                <label className="text-xs text-gray-500">Image URL</label>
                <input
                  value={cat.imageUrl}
                  onChange={(e) => updateCategory(index, 'imageUrl', e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                  placeholder="/categories/pizza.jpg"
                />
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-6 shrink-0">
                <button onClick={() => moveCategory(index, 'up')} disabled={index === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30"><MoveUp size={16}/></button>
                <button onClick={() => moveCategory(index, 'down')} disabled={index === categories.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-30"><MoveDown size={16}/></button>
                <button onClick={() => removeCategory(index)} className="p-2 text-red-500 hover:text-red-400 ml-2"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCategory}
            className="w-full py-4 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      )}
    </div>
  );
}
