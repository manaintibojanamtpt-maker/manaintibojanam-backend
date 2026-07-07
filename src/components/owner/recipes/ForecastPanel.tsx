import React from 'react';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import type { IngredientForecast } from '../../../types';

type Props = {
  forecast: IngredientForecast | null;
  loading?: boolean;
};

function SkeletonRow() {
  return <div className="h-14 rounded-xl bg-white/5 animate-pulse" />;
}

export function ForecastPanel({ forecast, loading }: Props) {
  if (loading || !forecast) {
    return (
      <div className="space-y-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-white mb-1">Tomorrow Forecast</h3>
        <p className="text-sm text-white/50">Target date: {forecast.forecastDate}</p>
      </div>

      {forecast.alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <AlertTriangle size={14} /> Shortage Alerts
          </h4>
          {forecast.alerts.map((alert) => (
            <div
              key={alert.ingredientId}
              className={`rounded-xl px-4 py-3 border text-sm ${
                alert.severity === 'critical'
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-3 bg-black/30 text-xs font-bold uppercase text-white/50">
          <div className="col-span-2">Ingredient</div>
          <div>Need</div>
          <div>Stock</div>
          <div>Balance</div>
          <div>Buy</div>
        </div>
        <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
          {forecast.lines.map((line) => (
            <div key={line.ingredientId} className="grid grid-cols-6 gap-2 px-4 py-3 text-sm text-white/80">
              <div className="col-span-2 font-medium text-white">{line.name}</div>
              <div>{line.forecastNeed} {line.unit}</div>
              <div>{line.currentStock}</div>
              <div className={line.expectedBalance < 0 ? 'text-red-400' : 'text-green-400'}>
                {line.expectedBalance}
              </div>
              <div>{line.recommendedPurchase > 0 ? line.recommendedPurchase : '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {forecast.purchaseRecommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-300 flex items-center gap-2 mb-3">
            <ShoppingCart size={14} /> Suggested Purchase List
          </h4>
          <div className="space-y-2">
            {forecast.purchaseRecommendations.map((row) => (
              <div
                key={row.ingredientId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-white">{row.name}</p>
                  <p className="text-xs text-white/50">{row.supplier} · {row.daysRemaining} days remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{row.quantity} {row.unit}</p>
                  <p className="text-xs text-white/50">Est. ₹{row.estimatedCost}</p>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
                  onClick={() => {
                    // Placeholder for purchase order integration
                    window.alert(`Purchase order draft created for ${row.quantity} ${row.unit} of ${row.name}`);
                  }}
                >
                  Create PO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
