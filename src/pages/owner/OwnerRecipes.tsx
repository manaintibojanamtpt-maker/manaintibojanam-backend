import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { MenuItem, Recipe, RecipeIngredient } from '../../types';
import { getRecipes, saveRecipe } from '../../services/RecipeService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import { Save, Plus, Trash2, Utensils, BookOpen, AlertCircle } from 'lucide-react';
import { m } from 'framer-motion';

export default function OwnerRecipes() {
  const { tenantId } = useTenant();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  // Form State
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      try {
        const db = getDb();
        const q = query(collection(db, 'menuItems'), where('tenantId', '==', tenantId));
        const [menuSnap, recipesData] = await Promise.all([
          getDocs(q),
          getRecipes(tenantId)
        ]);
        
        setMenuItems(menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
        setRecipes(recipesData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId]);

  const handleSelect = (item: MenuItem) => {
    setSelectedItem(item);
    setSaved(false);
    const existingRecipe = recipes.find(r => r.menuItemId === item.id);
    if (existingRecipe) {
      setIngredients(existingRecipe.ingredients);
    } else {
      setIngredients([]);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { ingredient: '', quantity: 0, unit: 'grams' }]);
  };

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!tenantId || !selectedItem) return;
    setSaving(true);
    try {
      const validIngredients = ingredients.filter(i => i.ingredient.trim() !== '' && i.quantity > 0);
      await saveRecipe(tenantId, selectedItem.id, validIngredients);
      
      // Update local state
      const updatedRecipes = await getRecipes(tenantId);
      setRecipes(updatedRecipes);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading recipe matrix...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <BookOpen className="text-purple-400" />
          Recipe Intelligence
        </h1>
        <p className="text-white/60 font-medium text-sm mt-1">Map raw ingredients to menu items to enable precise Inventory Forecasting.</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar: Menu Items */}
        <div className="w-1/3 bg-dark-card border border-white/5 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-black/20">
            <h3 className="font-bold text-white">Menu Items</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {menuItems.map(item => {
              const hasRecipe = recipes.some(r => r.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${selectedItem?.id === item.id ? 'bg-purple-600 text-white' : 'hover:bg-white/5 text-white/80'}`}
                >
                  <span className="font-medium truncate pr-2">{item.name}</span>
                  {hasRecipe ? (
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Recipe Configured" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/20 shrink-0" title="No Recipe" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content: Recipe Editor */}
        <div className="flex-1 bg-dark-card border border-white/5 rounded-2xl p-6 flex flex-col">
          {selectedItem ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
                  <p className="text-sm text-white/50">Define the exact raw materials required to prepare one unit of this item.</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  {saving ? 'Saving...' : <><Save size={16} /> Save Recipe</>}
                </button>
              </div>

              {saved && (
                <m.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/20 text-green-400 p-3 rounded-lg border border-green-500/20 mb-6 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Recipe successfully saved. Inventory forecasts will now use this data.
                </m.div>
              )}

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-12 gap-4 mb-2 px-2 text-xs font-bold text-white/50 uppercase tracking-wider">
                  <div className="col-span-5">Ingredient Name</div>
                  <div className="col-span-3">Quantity</div>
                  <div className="col-span-3">Unit</div>
                  <div className="col-span-1"></div>
                </div>

                {ingredients.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                    <Utensils size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">No ingredients defined.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-black/20 p-2 rounded-xl border border-white/5">
                        <div className="col-span-5">
                          <input 
                            type="text" 
                            value={ing.ingredient}
                            onChange={(e) => handleUpdateIngredient(idx, 'ingredient', e.target.value)}
                            placeholder="e.g. Basmati Rice"
                            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number" 
                            value={ing.quantity || ''}
                            onChange={(e) => handleUpdateIngredient(idx, 'quantity', parseFloat(e.target.value))}
                            placeholder="0"
                            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={ing.unit}
                            onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                          >
                            <option value="grams">grams (g)</option>
                            <option value="kg">kilograms (kg)</option>
                            <option value="ml">milliliters (ml)</option>
                            <option value="L">liters (L)</option>
                            <option value="pieces">pieces</option>
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button onClick={() => handleRemoveIngredient(idx)} className="text-white/30 hover:text-red-400 transition-colors p-2">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={handleAddIngredient}
                  className="mt-4 w-full border border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/5 text-white/70 hover:text-purple-400 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={18} /> Add Ingredient
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <BookOpen size={48} className="text-white/10 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Select a Menu Item</h3>
              <p className="text-white/50 max-w-sm">Choose an item from the sidebar to configure its recipe for accurate inventory forecasting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
