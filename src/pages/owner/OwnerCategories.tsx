import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import {
  createOwnerCategory,
  deleteOwnerCategory,
  fetchOwnerCategories,
  updateOwnerCategory,
  type OwnerCategory,
} from '../../lib/ownerCategoryApi';

const OwnerCategories: React.FC = () => {
  const tenantId = useOwnerTenantId();
  const [categories, setCategories] = useState<OwnerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('0');

  const load = async (activeTenantId: string) => {
    setLoading(true);
    try {
      const response = await fetchOwnerCategories(activeTenantId);
      setCategories(response.categories ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    void load(tenantId);
  }, [tenantId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId || !name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      await createOwnerCategory({
        tenantId,
        name: name.trim(),
        priority: Number(priority) || 0,
        isActive: true,
        showOnHome: false,
      });
      setName('');
      setPriority(String((categories[categories.length - 1]?.priority ?? -1) + 1));
      toast.success('Category created');
      await load(tenantId);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: OwnerCategory) => {
    if (!tenantId) return;
    try {
      await updateOwnerCategory(category.id, {
        tenantId,
        name: category.name,
        priority: category.priority,
        isActive: !category.isActive,
        showOnHome: category.showOnHome,
        image: category.image,
      });
      setCategories((prev) =>
        prev.map((row) => (row.id === category.id ? { ...row, isActive: !row.isActive } : row)),
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (category: OwnerCategory) => {
    if (!tenantId) return;
    if (!window.confirm(`Delete category “${category.name}”? Menu items keep their category text.`)) {
      return;
    }
    try {
      await deleteOwnerCategory(category.id, tenantId);
      setCategories((prev) => prev.filter((row) => row.id !== category.id));
      toast.success('Category deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete category');
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6 text-white/70">
        Select a kitchen to manage categories.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            to="/owner/menu"
            className="mb-2 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to menu
          </Link>
          <h1 className="text-2xl font-bold text-white">Menu categories</h1>
          <p className="mt-1 text-sm text-white/50">
            Control section names and order on your OrderBhojan menu rail.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Biryani"
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="number"
            min={0}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            title="Display order (lower first)"
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Add
          </button>
        </div>
        <p className="text-xs text-white/40">Priority: lower numbers appear first on the customer menu.</p>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="animate-spin" size={18} /> Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50">
          No categories yet. Add one above, then pick it when editing menu items.
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{category.name}</p>
                <p className="text-xs text-white/40">
                  Order {category.priority}
                  {!category.isActive ? ' · Hidden' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleActive(category)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    category.isActive
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-white/15 text-white/50'
                  }`}
                >
                  {category.isActive ? 'Active' : 'Hidden'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(category)}
                  className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-red-300"
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OwnerCategories;
