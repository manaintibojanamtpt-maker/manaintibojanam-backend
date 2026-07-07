import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RawIngredient } from '../../../types';
import { INGREDIENT_CATEGORIES, INGREDIENT_UNITS } from '../../../config/ingredientUnits';
import {
  createOwnerIngredient,
  deleteOwnerIngredient,
  updateOwnerIngredient,
} from '../../../lib/ownerIngredientsApi';

type Props = {
  tenantId: string;
  ingredients: RawIngredient[];
  onChanged: () => Promise<void>;
};

const emptyForm = (): Omit<RawIngredient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  category: 'Other',
  unit: 'gm',
  currentStock: 0,
  reorderLevel: 0,
  costPerUnit: 0,
  supplier: '',
  brand: '',
  gstPercent: 0,
  shelfLifeDays: 0,
  storageType: 'dry',
  barcode: '',
});

export function IngredientMasterPanel({ tenantId, ingredients, onChanged }: Props) {
  const [editing, setEditing] = useState<RawIngredient | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.supplier.toLowerCase().includes(q),
    );
  }, [ingredients, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const openEdit = (row: RawIngredient) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category,
      unit: row.unit,
      currentStock: row.currentStock,
      reorderLevel: row.reorderLevel,
      costPerUnit: row.costPerUnit,
      supplier: row.supplier,
      brand: row.brand,
      gstPercent: row.gstPercent,
      shelfLifeDays: row.shelfLifeDays,
      storageType: row.storageType,
      barcode: row.barcode || '',
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Ingredient name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateOwnerIngredient(tenantId, editing.id, form);
        toast.success('Ingredient updated');
      } else {
        await createOwnerIngredient(tenantId, form);
        toast.success('Ingredient created');
      }
      setEditing(null);
      setForm(emptyForm());
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save ingredient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RawIngredient) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await deleteOwnerIngredient(tenantId, row.id);
      toast.success('Ingredient deleted');
      if (editing?.id === row.id) {
        setEditing(null);
        setForm(emptyForm());
      }
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ingredient');
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="flex-1 min-w-[200px] bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white"
        />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold"
        >
          <Plus size={16} /> Add Ingredient
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[320px]">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 text-sm font-bold text-white/70">
            Raw Ingredients ({filtered.length})
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-white/5">
            {filtered.length === 0 ? (
              <p className="p-6 text-white/50 text-sm">No ingredients yet. Add your first raw material.</p>
            ) : (
              filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openEdit(row)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                    editing?.id === row.id ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="text-xs text-white/50">
                        {row.category} · {row.currentStock} {row.unit} · ₹{row.costPerUnit}/{row.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(row);
                      }}
                      className="p-2 text-white/30 hover:text-red-400"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl p-4 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">{editing ? 'Edit Ingredient' : 'New Ingredient'}</h3>
            {(editing || form.name) && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm());
                }}
                className="text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs text-white/50">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Category
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-white/50">
              Unit
              <select
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                {INGREDIENT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-white/50">
              Current Stock
              <input
                type="number"
                min={0}
                value={form.currentStock}
                onChange={(e) => setForm((prev) => ({ ...prev, currentStock: Number(e.target.value) }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Reorder Level
              <input
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, reorderLevel: Number(e.target.value) }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Cost per Unit (₹)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.costPerUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, costPerUnit: Number(e.target.value) }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              GST %
              <input
                type="number"
                min={0}
                value={form.gstPercent}
                onChange={(e) => setForm((prev) => ({ ...prev, gstPercent: Number(e.target.value) }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Supplier
              <input
                value={form.supplier}
                onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Brand
              <input
                value={form.brand}
                onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Shelf Life (days)
              <input
                type="number"
                min={0}
                value={form.shelfLifeDays}
                onChange={(e) => setForm((prev) => ({ ...prev, shelfLifeDays: Number(e.target.value) }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Storage
              <input
                value={form.storageType}
                onChange={(e) => setForm((prev) => ({ ...prev, storageType: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
            <label className="col-span-2 text-xs text-white/50">
              Barcode (optional)
              <input
                value={form.barcode || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : editing ? 'Update Ingredient' : 'Save Ingredient'}
          </button>
        </div>
      </div>
    </div>
  );
}
