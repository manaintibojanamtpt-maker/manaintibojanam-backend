import { InventoryForecastRequirement } from '../types';
import { getKitchenHealthScore } from './KitchenHealthService';
import { generateDailyForecast } from './ForecastingService';

export interface PredictiveAlert {
  id: string;
  type: 'inventory' | 'operational' | 'retention';
  severity: 'warning' | 'critical' | 'info';
  message: string;
}

export const generatePredictiveAlerts = async (
  tenantId: string, 
  inventoryForecast: InventoryForecastRequirement[]
): Promise<PredictiveAlert[]> => {
  if (!tenantId) return [];

  const alerts: PredictiveAlert[] = [];

  // 1. Inventory Alerts
  inventoryForecast.forEach(req => {
    if (req.riskLevel === 'Critical') {
      alerts.push({
        id: `inv_crit_${req.ingredient}`,
        type: 'inventory',
        severity: 'critical',
        message: `${req.ingredient} stockout risk. Immediate replenishment required for upcoming demand.`
      });
    } else if (req.riskLevel === 'High') {
      alerts.push({
        id: `inv_high_${req.ingredient}`,
        type: 'inventory',
        severity: 'warning',
        message: `${req.ingredient} inventory below weekend forecast.`
      });
    }
  });

  // 2. Operational Alerts
  const healthData = await getKitchenHealthScore(tenantId);
  if (healthData && healthData.score < 80) {
    alerts.push({
      id: 'ops_health',
      type: 'operational',
      severity: 'warning',
      message: 'Kitchen Health Score declining. Prep time or cancellations may be rising.'
    });
  }

  // 3. Demand Alerts (Retention/Drop-offs)
  const forecast = await generateDailyForecast(tenantId);
  if (forecast && forecast.expectedOrders < 20 && forecast.confidenceScore === 'High') {
    alerts.push({
      id: 'retention_drop',
      type: 'retention',
      severity: 'warning',
      message: 'Significant drop in expected demand detected. Consider launching a reactivation campaign.'
    });
  }

  return alerts;
};
