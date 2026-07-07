import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import type { MenuItem, RawIngredient, Recipe, RecipeIntelligenceSummary, IngredientForecast } from '../../types';
import { fetchOwnerMenuItems } from '../../lib/ownerMenuApi';
import {
  fetchOwnerRecipes,
  fetchRecipeIntelligenceSummary,
  fetchIngredientForecast,
} from '../../lib/ownerRecipesApi';
import { fetchOwnerIngredients } from '../../lib/ownerIngredientsApi';
import { RecipeAnalyticsCards } from '../../components/owner/recipes/RecipeAnalyticsCards';
import { IngredientMasterPanel } from '../../components/owner/recipes/IngredientMasterPanel';
import { RecipeEditorPanel } from '../../components/owner/recipes/RecipeEditorPanel';
import { ForecastPanel } from '../../components/owner/recipes/ForecastPanel';

type Tab = 'recipes' | 'ingredients' | 'forecast';

export default function OwnerRecipes() {
  const tenantId = useOwnerTenantId();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<RawIngredient[]>([]);
  const [summary, setSummary] = useState<RecipeIntelligenceSummary | null>(null);
  const [forecast, setForecast] = useState<IngredientForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const loadCoreData = useCallback(async (activeTenantId: string) => {
    const [menuResponse, recipesResponse, ingredientsResponse, summaryResponse] = await Promise.all([
      fetchOwnerMenuItems(activeTenantId),
      fetchOwnerRecipes(activeTenantId),
      fetchOwnerIngredients(activeTenantId),
      fetchRecipeIntelligenceSummary(activeTenantId),
    ]);

    setMenuItems(menuResponse.items ?? []);
    setRecipes(recipesResponse.recipes ?? []);
    setIngredients(ingredientsResponse.ingredients ?? []);
    setSummary(summaryResponse.summary ?? null);
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadCoreData(tenantId)
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load Recipe Intelligence data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, loadCoreData]);

  useEffect(() => {
    if (!tenantId || activeTab !== 'forecast') return;

    let cancelled = false;
    setForecastLoading(true);
    void fetchIngredientForecast(tenantId, 1)
      .then((response) => {
        if (!cancelled) setForecast(response.forecast);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error('Failed to load forecast');
      })
      .finally(() => {
        if (!cancelled) setForecastLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, activeTab]);

  const refreshRecipes = useCallback(async () => {
    if (!tenantId) return;
    const [recipesResponse, summaryResponse] = await Promise.all([
      fetchOwnerRecipes(tenantId),
      fetchRecipeIntelligenceSummary(tenantId),
    ]);
    setRecipes(recipesResponse.recipes ?? []);
    setSummary(summaryResponse.summary ?? null);
  }, [tenantId]);

  const refreshIngredients = useCallback(async () => {
    if (!tenantId) return;
    const [ingredientsResponse, summaryResponse] = await Promise.all([
      fetchOwnerIngredients(tenantId),
      fetchRecipeIntelligenceSummary(tenantId),
    ]);
    setIngredients(ingredientsResponse.ingredients ?? []);
    setSummary(summaryResponse.summary ?? null);
  }, [tenantId]);

  if (!tenantId && !loading) {
    return (
      <div className="p-8 text-white">
        <p className="text-white/70">Store profile is still loading. Refresh in a moment or return to the dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-white/70 gap-3">
        <Loader2 className="animate-spin text-orange-500" />
        <p>Loading Recipe Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <BookOpen className="text-orange-400" />
          Recipe Intelligence
        </h1>
        <p className="text-white/60 font-medium text-sm mt-1">
          Map menu items to raw ingredients for costing, inventory deduction, and purchase forecasting.
        </p>
      </div>

      <RecipeAnalyticsCards summary={summary} />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {([
          ['recipes', 'Recipes'],
          ['ingredients', 'Raw Ingredients'],
          ['forecast', 'Forecast & Alerts'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
              activeTab === id ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[520px]">
        {activeTab === 'recipes' && tenantId && (
          <RecipeEditorPanel
            tenantId={tenantId}
            menuItems={menuItems}
            recipes={recipes}
            ingredients={ingredients}
            onRecipesChanged={refreshRecipes}
            initialMenuItemId={searchParams.get('menuItemId')}
          />
        )}
        {activeTab === 'ingredients' && tenantId && (
          <IngredientMasterPanel
            tenantId={tenantId}
            ingredients={ingredients}
            onChanged={refreshIngredients}
          />
        )}
        {activeTab === 'forecast' && (
          <ForecastPanel forecast={forecast} loading={forecastLoading} />
        )}
      </div>
    </div>
  );
}
