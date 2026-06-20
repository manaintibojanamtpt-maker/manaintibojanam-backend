import { AIOperationsInsight } from '../types';
import { generateDailyForecast } from './ForecastingService';
import { generateInventoryForecast } from './InventoryForecastService';
import { getKitchenHealthScore } from './KitchenHealthService';
import { generatePredictiveAlerts } from './PredictiveAlertsService';

/**
 * AI Operations Manager
 * Transforms raw analytical data and forecasts into actionable decisions.
 */
export const generateMorningBrief = async (tenantId: string): Promise<AIOperationsInsight | null> => {
  if (!tenantId) return null;

  try {
    // Parallelize data fetching
    const [dailyForecast, kitchenHealth] = await Promise.all([
      generateDailyForecast(tenantId),
      getKitchenHealthScore(tenantId)
    ]);

    if (!dailyForecast) return null;

    const inventoryForecast = await generateInventoryForecast(tenantId, dailyForecast);
    const alerts = await generatePredictiveAlerts(tenantId, inventoryForecast);

    // Determine aggregate inventory risk
    let overallRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (alerts.some(a => a.type === 'inventory' && a.severity === 'critical')) {
      overallRisk = 'Critical';
    } else if (alerts.some(a => a.type === 'inventory' && a.severity === 'warning')) {
      overallRisk = 'Medium';
    }

    // Generate Top 3 Recommendations
    const recommendations: string[] = [];

    // Rule 1: Inventory
    const critInv = inventoryForecast.find(i => i.riskLevel === 'Critical');
    if (critInv) {
      recommendations.push(`Prepare ${critInv.quantityRequired} ${critInv.unit} additional ${critInv.ingredient} today to meet expected demand.`);
    }

    // Rule 2: Kitchen Health
    if (kitchenHealth && kitchenHealth.score < 85) {
      recommendations.push(`Monitor prep times closely. Health score dropped due to recent delays.`);
    }

    // Rule 3: Demand / Retention
    if (dailyForecast.expectedOrders > 0 && dailyForecast.confidenceScore === 'High') {
       // if we have high confidence, maybe suggest a VIP campaign
       recommendations.push(`Demand is stable. Excellent time to launch a VIP reward campaign to drive repeat purchases.`);
    }

    // Fallbacks if we don't have 3
    if (recommendations.length < 3) {
      const highInv = inventoryForecast.find(i => i.riskLevel === 'High' && i.ingredient !== critInv?.ingredient);
      if (highInv) {
        recommendations.push(`${highInv.ingredient} inventory may be insufficient for weekend forecast.`);
      }
    }
    if (recommendations.length < 3) {
      recommendations.push('Review yesterday\'s forecast accuracy to ensure predictions remain calibrated.');
    }

    // Trim to Top 3
    const top3 = recommendations.slice(0, 3);

    return {
      expectedOrders: dailyForecast.expectedOrders,
      expectedRevenue: dailyForecast.expectedRevenue,
      inventoryRisk: overallRisk,
      kitchenHealth: kitchenHealth ? kitchenHealth.score : 100,
      confidence: dailyForecast.confidenceScore,
      recommendations: top3
    };

  } catch (error) {
    console.error('Error generating morning brief:', error);
    return null;
  }
};
