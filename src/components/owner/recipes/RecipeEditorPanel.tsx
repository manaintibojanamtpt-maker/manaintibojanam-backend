import React, { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Save,
  Sparkles,
  AlertTriangle,
  Circle,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MenuItem, RawIngredient, Recipe, RecipeCostResult, RecipeIngredient } from '../../../types';
import { INGREDIENT_UNITS, MENU_RECIPE_CATEGORIES, type MenuRecipeCategoryFilter } from '../../../config/ingredientUnits';
import {
  computeOwnerRecipeCost,
  saveOwnerRecipe,
  suggestOwnerRecipe,
} from '../../../lib/ownerRecipesApi';

type Props = {
  tenantId: string;
  menuItems: MenuItem[];
  recipes: Recipe[];
  ingredients: RawIngredient[];
  onRecipesChanged: () => Promise<void>;
  initialMenuItemId?: string | null;
};

function matchesCategory(item: MenuItem, filter: MenuRecipeCategoryFilter): boolean {
  if (filter === 'All') return true;
  const category = item.category.toLowerCase();
  const type = (item.type || '').toLowerCase();
  if (filter === 'Veg') return type === 'veg' || category.includes('veg');
  if (filter === 'Non Veg') return type === 'non-veg' || category.includes('non');
  if (filter === 'Beverages') return /beverage|drink|juice|lassi|tea|coffee/i.test(category + item.name);
  if (filter === 'Desserts') return /dessert|sweet|ice|kheer|halwa/i.test(category + item.name);
  return true;
}

export function RecipeEditorPanel({
  tenantId,
  menuItems,
  recipes,
  ingredients,
  onRecipesChanged,
  initialMenuItemId,
}: Props) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [rows, setRows] = useState<RecipeIngredient[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MenuRecipeCategoryFilter>('All');
  const [cost, setCost] = useState<RecipeCostResult | null>(null);
  const [optimizations, setOptimizations] = useState<string[]>([]);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const recipeByMenuId = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.menuItemId, recipe])),
    [recipes],
  );

  const configuredCount = useMemo(
    () => menuItems.filter((item) => (recipeByMenuId.get(item.id)?.ingredients?.length || 0) > 0).length,
    [menuItems, recipeByMenuId],
  );

  const coveragePercent = menuItems.length
    ? Math.round((configuredCount / menuItems.length) * 100)
    : 0;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (!matchesCategory(item, category)) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }, [menuItems, search, category]);

  const ingredientOptions = useMemo(
    () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!selectedItem || rows.length === 0) {
      setCost(null);
      setOptimizations([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void computeOwnerRecipeCost(tenantId, selectedItem.id, rows, selectedItem.price)
        .then((response) => {
          setCost(response.cost);
          setOptimizations(response.optimizations || []);
        })
        .catch(() => {
          setCost(null);
          setOptimizations([]);
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [rows, selectedItem, tenantId]);

  const selectItem = (item: MenuItem) => {
    if (dirty && !window.confirm('You have unsaved recipe changes. Discard them?')) return;
    setSelectedItem(item);
    setDirty(false);
    setMobileEditorOpen(true);
    const existing = recipeByMenuId.get(item.id);
    setRows(existing?.ingredients?.length ? [...existing.ingredients] : []);
  };

  useEffect(() => {
    if (!initialMenuItemId || selectedItem) return;
    const item = menuItems.find((row) => row.id === initialMenuItemId);
    if (item) selectItem(item);
  }, [initialMenuItemId, menuItems, selectedItem]);

  const updateRow = (index: number, patch: Partial<RecipeIngredient>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ingredientId: '', ingredient: '', quantity: 0, unit: 'gm' }]);
    setDirty(true);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleIngredientPick = (index: number, ingredientId: string) => {
    const master = ingredientOptions.find((row) => row.id === ingredientId);
    updateRow(index, {
      ingredientId,
      ingredient: master?.name || '',
      unit: master?.unit || 'gm',
    });
  };

  const handleSuggest = async () => {
    if (!selectedItem) return;
    setSuggesting(true);
    try {
      const response = await suggestOwnerRecipe(tenantId, selectedItem.name);
      setRows(response.ingredients);
      setDirty(true);
      toast.success('AI recipe suggestion applied — review and save');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to suggest recipe');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    const validRows = rows.filter(
      (row) => (row.ingredientId || row.ingredient?.trim()) && row.quantity > 0,
    );
    if (validRows.length === 0) {
      toast.error('Add at least one ingredient with quantity > 0');
      return;
    }

    const seen = new Set<string>();
    for (const row of validRows) {
      const key = row.ingredientId || row.ingredient?.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        toast.error('Duplicate ingredients are not allowed');
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      await saveOwnerRecipe(tenantId, selectedItem.id, validRows);
      setDirty(false);
      toast.success('Recipe saved');
      await onRecipesChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const editorContent = selectedItem ? (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
          <p className="text-sm text-white/50">₹{selectedItem.price} · {selectedItem.category}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSuggest()}
            disabled={suggesting}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-sm font-semibold"
          >
            <Sparkles size={16} />
            {suggesting ? 'Suggesting...' : 'AI Suggest'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="mb-3 flex items-center gap-2 text-amber-300 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={14} /> Unsaved changes
        </div>
      )}

      <div className="grid grid-cols-12 gap-3 mb-2 px-1 text-xs font-bold text-white/50 uppercase">
        <div className="col-span-5">Ingredient</div>
        <div className="col-span-3">Quantity</div>
        <div className="col-span-3">Unit</div>
        <div className="col-span-1" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {rows.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-white/50">
            No ingredients mapped yet.
          </div>
        ) : (
          rows.map((row, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-center bg-black/20 border border-white/5 rounded-xl p-2">
              <div className="col-span-5">
                <select
                  value={row.ingredientId || ''}
                  onChange={(e) => handleIngredientPick(index, e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Select ingredient</option>
                  {ingredientOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.quantity || ''}
                  onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="col-span-3">
                <select
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {INGREDIENT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="p-2 text-white/30 hover:text-red-400"
                  aria-label="Remove ingredient"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 w-full border border-dashed border-white/20 hover:border-orange-500/40 text-white/70 hover:text-orange-300 py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Add Ingredient
      </button>

      {cost && (
        <div className="mt-4 border border-white/10 rounded-2xl p-4 bg-black/30">
          <h3 className="font-bold text-white mb-3">Recipe Cost</h3>
          <div className="space-y-1 text-sm text-white/70 mb-3">
            {cost.lines.map((line) => (
              <div key={`${line.name}-${line.quantity}`} className="flex justify-between gap-3">
                <span>{line.name} · {line.quantity}{line.unit}</span>
                <span>₹{line.lineCost}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-white/60">Ingredient Cost</div><div className="text-right text-white">₹{cost.ingredientCost}</div>
            <div className="text-white/60">Labour (8%)</div><div className="text-right text-white">₹{cost.labourCost}</div>
            <div className="text-white/60">Packaging</div><div className="text-right text-white">₹{cost.packagingCost}</div>
            <div className="text-white/60 font-bold">Total Cost</div><div className="text-right text-white font-bold">₹{cost.totalCost}</div>
            <div className="text-white/60">Selling Price</div><div className="text-right text-white">₹{cost.sellingPrice}</div>
            <div className="text-white/60">Profit</div><div className={`text-right font-bold ${cost.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{cost.profit}</div>
            <div className="text-white/60">Margin</div><div className="text-right text-white">{cost.marginPercent}%</div>
          </div>
          {optimizations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-bold uppercase text-purple-300 mb-2">AI Cost Tips</p>
              <ul className="text-sm text-white/60 space-y-1">
                {optimizations.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <Circle className="text-white/10 mb-4" size={48} />
      <h3 className="text-lg font-bold text-white mb-2">Select a Menu Item</h3>
      <p className="text-white/50 max-w-sm">Choose an item to map raw ingredients and calculate recipe cost.</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      <div className={`lg:w-[340px] shrink-0 border border-white/10 rounded-2xl flex flex-col min-h-[280px] ${mobileEditorOpen ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Menu Items</h3>
            <span className="text-xs font-bold text-orange-300">{coveragePercent}% recipes</span>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {MENU_RECIPE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  category === cat ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filteredItems.map((item) => {
            const configured = (recipeByMenuId.get(item.id)?.ingredients?.length || 0) > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                  selectedItem?.id === item.id ? 'bg-orange-600 text-white' : 'hover:bg-white/5 text-white/80'
                }`}
              >
                <span className="font-medium truncate">{item.name}</span>
                <span className={`text-[10px] font-bold uppercase shrink-0 ${configured ? 'text-green-400' : 'text-red-400'}`}>
                  {configured ? '🟢' : '🔴'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 border border-white/10 rounded-2xl p-4 lg:p-6 min-h-[320px] ${mobileEditorOpen ? 'flex' : 'hidden lg:flex'} flex-col`}>
        <div className="lg:hidden flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setMobileEditorOpen(false)}
            className="inline-flex items-center gap-1 text-white/60 text-sm"
          >
            <X size={16} /> Back to menu
          </button>
        </div>
        {editorContent}
      </div>

      {!mobileEditorOpen && (
        <button
          type="button"
          onClick={() => selectedItem && setMobileEditorOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-20 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-orange-600 text-white font-bold shadow-lg"
        >
          <Plus size={16} /> Recipe
        </button>
      )}

      <AnimatePresence>
        {saving && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
