import { SimulationResult } from '../types';

/**
 * Forecast Simulation Lab
 * Enables owners to run What-If scenarios without affecting real data.
 */
export const simulateScenario = async (
  tenantId: string, 
  actionType: 'discount' | 'ad_spend' | 'vip_campaign' | 'promo',
  value?: number
): Promise<SimulationResult> => {
  // Artificial delays to simulate complex ML/DB computations
  await new Promise(r => setTimeout(r, 600));

  switch (actionType) {
    case 'discount':
      return {
        action: `Launch ${value || 10}% Discount`,
        expectedOrderLift: (value || 10) * 1.5, // Heuristic: 10% discount = 15% order lift
        expectedRevenueLift: (value || 10) * 0.8, // Revenue doesn't scale 1:1 due to reduced margins
        expectedRepeatLift: 5,
      };
    
    case 'ad_spend':
      return {
        action: `Increase Ad Spend`,
        expectedOrderLift: 25,
        expectedRevenueLift: 20,
        expectedRepeatLift: 2, // Ads bring new users, low initial repeat lift
      };

    case 'vip_campaign':
      return {
        action: `Launch VIP Reactivation`,
        expectedOrderLift: 12,
        expectedRevenueLift: 8,
        expectedRepeatLift: 15, // Highly targeted to retention
      };

    case 'promo':
    default:
      return {
        action: `Promote Item`,
        expectedOrderLift: 8,
        expectedRevenueLift: 8,
        expectedRepeatLift: 4,
      };
  }
};
