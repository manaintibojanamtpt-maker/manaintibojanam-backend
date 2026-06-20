export interface KitchenHealthMetrics {
  completionRate: number;
  avgPrepTimeMinutes: number;
  avgRating: number;
  repeatCustomerRate: number;
  cancellationRate: number;
  refundRate: number;
}

export interface KitchenHealthResult {
  score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  suggestions: string[];
}

export const calculateKitchenHealth = (metrics: KitchenHealthMetrics): KitchenHealthResult => {
  // Weights
  // Completion: 30%, Prep Time: 20%, Rating: 20%, Repeat: 15%, Cancellation: 10%, Refund: 5%
  
  let score = 0;
  const suggestions: string[] = [];

  // 1. Completion Rate (Max 30 points)
  // 100% completion = 30 points
  const completionScore = (metrics.completionRate / 100) * 30;
  score += completionScore;
  if (metrics.completionRate < 95) suggestions.push("Improve order completion rate.");

  // 2. Prep Time (Max 20 points)
  // Ideal: < 15 mins = 20 pts. > 45 mins = 0 pts.
  let prepScore = 20;
  if (metrics.avgPrepTimeMinutes > 15) {
    prepScore = Math.max(0, 20 - ((metrics.avgPrepTimeMinutes - 15) * 0.6));
  }
  score += prepScore;
  if (metrics.avgPrepTimeMinutes > 25) suggestions.push(`Reduce prep time by ${Math.ceil(metrics.avgPrepTimeMinutes - 20)} minutes.`);

  // 3. Average Rating (Max 20 points)
  // 5.0 = 20 pts. 
  const ratingScore = (metrics.avgRating / 5) * 20;
  score += ratingScore;
  if (metrics.avgRating < 4.2) suggestions.push("Focus on food quality to improve ratings.");

  // 4. Repeat Customer Rate (Max 15 points)
  // 50% repeat rate = 15 pts
  const repeatScore = Math.min(15, (metrics.repeatCustomerRate / 50) * 15);
  score += repeatScore;
  if (metrics.repeatCustomerRate < 30) suggestions.push("Increase repeat customer rate via Reactivation Campaigns.");

  // 5. Cancellation Rate (Max 10 points)
  // 0% = 10 pts. > 10% = 0 pts.
  const cancelScore = Math.max(0, 10 - (metrics.cancellationRate * 1));
  score += cancelScore;
  if (metrics.cancellationRate > 5) suggestions.push("Cancellation rate exceeds target (5%).");

  // 6. Refund Rate (Max 5 points)
  // 0% = 5 pts. > 5% = 0 pts.
  const refundScore = Math.max(0, 5 - (metrics.refundRate * 1));
  score += refundScore;
  if (metrics.refundRate > 2) suggestions.push("Monitor order accuracy to reduce refunds.");

  // Overall logic
  const finalScore = Math.round(Math.min(100, Math.max(0, score)));
  let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (finalScore > 85) trend = 'UP';
  else if (finalScore < 60) trend = 'DOWN';

  if (suggestions.length === 0) {
    suggestions.push("Kitchen is operating at peak efficiency!");
  }

  return {
    score: finalScore,
    trend,
    suggestions: suggestions.slice(0, 3) // Return top 3 suggestions
  };
};

// Added for Phase 6D: Helper to fetch metrics and calculate score in one call
export const getKitchenHealthScore = async (tenantId: string): Promise<KitchenHealthResult | null> => {
  if (!tenantId) return null;
  // Mocking the metrics retrieval for now, in a real scenario this would fetch from AnalyticsService
  const metrics: KitchenHealthMetrics = {
    completionRate: 98,
    avgPrepTimeMinutes: 18,
    avgRating: 4.6,
    repeatCustomerRate: 35,
    cancellationRate: 1.5,
    refundRate: 0.5
  };
  return calculateKitchenHealth(metrics);
};
