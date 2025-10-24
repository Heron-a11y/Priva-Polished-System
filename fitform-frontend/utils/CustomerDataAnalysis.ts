import { CLOTHING_TYPES, ClothingType } from '../constants/ClothingTypes';

export interface CustomerInsights {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  favoriteClothingTypes: Array<{type: string, count: number, percentage: number}>;
  preferredSizes: Array<{size: string, count: number}>;
  measurementTrends: {
    weightChange: number;
    sizeStability: 'stable' | 'changing' | 'new';
    lastMeasurementDate: string;
    measurementAccuracy: number;
    measurementCount: number;
    averageAccuracy: number;
  };
  seasonalPreferences: Array<{season: string, orders: number, percentage: number}>;
  rentalVsPurchaseRatio: number;
  satisfactionScore: number;
  sizeConsistency: number;
  brandPreferences: Array<{brand: string, count: number}>;
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  orderFrequency: {
    monthly: number;
    seasonal: number;
    yearly: number;
  };
  // Enhanced insights based on rental & purchase history
  rentalInsights: {
    totalRentals: number;
    averageRentalDuration: number;
    mostRentedTypes: Array<{type: string, count: number}>;
    penaltyRate: number;
    returnTimeliness: number;
  };
  purchaseInsights: {
    totalPurchases: number;
    averagePurchaseValue: number;
    mostPurchasedTypes: Array<{type: string, count: number}>;
    purchaseFrequency: number;
  };
  measurementInsights: {
    bodyTypeAnalysis: string;
    sizeRecommendations: Array<{clothingType: string, recommendedSize: string}>;
    measurementConsistency: number;
    growthPatterns: Array<{measurement: string, change: number, period: string}>;
  };
  behavioralPatterns: {
    preferredOrderDays: Array<{day: string, count: number}>;
    preferredOrderTimes: Array<{timeRange: string, count: number}>;
    seasonalSpending: Array<{month: string, amount: number}>;
    loyaltyScore: number;
  };
}

export interface Recommendation {
  id: string;
  type: 'size' | 'style' | 'seasonal' | 'maintenance' | 'budget' | 'sizing';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  category: string;
  confidence: number;
  relatedData?: any;
  imageUrl?: string;
  imageSource?: any;
  suggestedItems?: Array<{
    name: string;
    description: string;
    imageSource?: any;
    imageUrl?: string;
    size?: string;
    category: string;
    reason: string;
  }>;
}

export interface MeasurementData {
  id: number;
  measurements: {
    height?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    shoulder_width?: number;
    arm_length?: number;
    inseam?: number;
    neck?: number;
  };
  created_at: string;
  measurement_type: string;
  accuracy_score?: number;
}

export interface HistoryItem {
  id: number;
  type: 'rental' | 'purchase';
  item_name: string;
  clothing_type: string;
  status: string;
  date: string;
  amount: number | null;
  measurements?: {
    bust?: number;
    waist?: number;
    hips?: number;
    shoulder_width?: number;
    arm_length?: number;
    inseam?: number;
    [key: string]: number | undefined;
  };
  size?: string;
  brand?: string;
  season?: string;
  order_type?: string;
  quotation_amount?: number;
  penalty_status?: string;
  total_penalties?: number;
  notes?: string;
}

export class CustomerDataAnalyzer {
  private orders: HistoryItem[];
  private measurements: MeasurementData[];
  private profile: any;

  constructor(orders: HistoryItem[], measurements: MeasurementData[], profile: any) {
    this.orders = orders;
    this.measurements = measurements;
    this.profile = profile;
  }

  /**
   * Generate comprehensive customer insights
   */
  generateInsights(): CustomerInsights {
    const totalOrders = this.orders.length;
    
    // Helper function to extract amount from order
    const extractAmount = (order: any): number => {
      // Use the same logic as RentalPurchaseHistory for consistency
      if (order.order_type === 'rental') {
        // For rentals: use quotation_amount
        return order.quotation_amount ? Number(order.quotation_amount) : 0;
      } else if (order.order_type === 'purchase') {
        // For purchases: use quotation_amount OR quotation_price
        return (order.quotation_amount || order.quotation_price) ? 
          Number(order.quotation_amount || order.quotation_price) : 0;
      } else {
        // Fallback to the original logic for other types
        const possibleAmounts = [
          order.amount,
          order.quotation_amount,
          order.total_amount,
          order.price,
          order.cost,
          order.value
        ];
        
        for (const amount of possibleAmounts) {
          if (amount !== null && amount !== undefined && amount !== '') {
            const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
            if (!isNaN(numericAmount) && numericAmount > 0) {
              return numericAmount;
            }
          }
        }
      }
      
      return 0;
    };
    
    const totalSpent = this.orders.reduce((sum, order) => {
      const amount = extractAmount(order);
      console.log('🔍 Debug: Order amount calculation:', {
        orderId: order.id,
        orderType: order.order_type,
        originalAmount: order.amount,
        quotationAmount: order.quotation_amount,
        quotationPrice: order.quotation_price,
        totalAmount: order.total_amount,
        extractedAmount: amount,
        runningTotal: sum + amount
      });
      return sum + amount;
    }, 0);
    
    console.log('🔍 Debug: Total spent calculation result:', totalSpent);
    console.log('🔍 Debug: Total orders processed:', this.orders.length);
    console.log('🔍 Debug: Orders breakdown:', {
      rentals: this.orders.filter(o => o.order_type === 'rental').length,
      purchases: this.orders.filter(o => o.order_type === 'purchase').length,
      other: this.orders.filter(o => !['rental', 'purchase'].includes(o.order_type)).length
    });
    
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Analyze clothing type preferences
    const clothingTypeCounts: {[key: string]: number} = {};
    this.orders.forEach(order => {
      clothingTypeCounts[order.clothing_type] = (clothingTypeCounts[order.clothing_type] || 0) + 1;
    });
    
    const favoriteClothingTypes = Object.entries(clothingTypeCounts)
      .map(([type, count]) => ({ 
        type, 
        count, 
        percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Analyze rental vs purchase ratio
    const rentals = this.orders.filter(order => order.type === 'rental' || order.order_type === 'rental').length;
    const purchases = this.orders.filter(order => order.type === 'purchase' || order.order_type === 'purchase').length;
    const rentalVsPurchaseRatio = totalOrders > 0 ? rentals / totalOrders : 0;

    // Analyze measurement trends
    const measurementTrends = this.analyzeMeasurementTrends();

    // Seasonal analysis
    const seasonalPreferences = this.analyzeSeasonalPreferences();

    // Size consistency analysis
    const sizeConsistency = this.analyzeSizeConsistency();

    // Brand preferences
    const brandPreferences = this.analyzeBrandPreferences();

    // Price range analysis
    const priceRange = this.analyzePriceRange();

    // Order frequency analysis
    const orderFrequency = this.analyzeOrderFrequency();

    // Enhanced rental insights
    const rentalInsights = this.analyzeRentalInsights();

    // Enhanced purchase insights
    const purchaseInsights = this.analyzePurchaseInsights();

    // Enhanced measurement insights
    const measurementInsights = this.analyzeMeasurementInsights();

    // Behavioral patterns
    const behavioralPatterns = this.analyzeBehavioralPatterns();

    // Calculate satisfaction score based on various factors
    const satisfactionScore = this.calculateSatisfactionScore();

    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      favoriteClothingTypes,
      preferredSizes: [], // Would need size data from orders
      measurementTrends,
      seasonalPreferences,
      rentalVsPurchaseRatio,
      satisfactionScore,
      sizeConsistency,
      brandPreferences,
      priceRange,
      orderFrequency,
      rentalInsights,
      purchaseInsights,
      measurementInsights,
      behavioralPatterns
    };
  }

  /**
   * Generate personalized recommendations based on rental history + measurement data
   */
  generateRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Enhanced recommendations using rental history + measurement data
    recommendations.push(...this.generateStepByStepRecommendations(insights));
    recommendations.push(...this.generateRuleBasedRecommendations(insights));
    recommendations.push(...this.generateFittingRecommendations(insights));
    recommendations.push(...this.generateSimilarItemRecommendations(insights));
    recommendations.push(...this.generateFilipinoFormalRecommendations(insights));
    recommendations.push(...this.generateMeasurementProfileRecommendations(insights));
    recommendations.push(...this.generateTrendBasedRecommendations(insights));
    recommendations.push(...this.generatePatternBasedRecommendations(insights));
    recommendations.push(...this.generateSizeRecommendations(insights));
    recommendations.push(...this.generateStyleRecommendations(insights));
    recommendations.push(...this.generateSeasonalRecommendations(insights));
    recommendations.push(...this.generateBudgetRecommendations(insights));
    recommendations.push(...this.generateMaintenanceRecommendations(insights));

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  private analyzeMeasurementTrends() {
    const sortedMeasurements = this.measurements.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (sortedMeasurements.length === 0) {
      return {
        weightChange: 0,
        sizeStability: 'new' as const,
        lastMeasurementDate: 'Never',
        measurementAccuracy: 0
      };
    }

    const latestMeasurement = sortedMeasurements[0];
    const sizeStability = this.calculateSizeStability(sortedMeasurements);
    const measurementAccuracy = this.calculateMeasurementAccuracy(sortedMeasurements);

    return {
      weightChange: 0, // Would need weight data
      sizeStability,
      lastMeasurementDate: latestMeasurement.created_at,
      measurementAccuracy
    };
  }

  private calculateSizeStability(measurements: MeasurementData[]): 'stable' | 'changing' | 'new' {
    if (measurements.length < 2) return 'new';
    
    // Compare latest measurements with previous ones
    const latest = measurements[0].measurements;
    const previous = measurements[1].measurements;
    
    const tolerance = 2; // 2 inches/cm tolerance
    let changes = 0;
    let totalComparisons = 0;

    Object.keys(latest).forEach(key => {
      if (latest[key] && previous[key]) {
        const diff = Math.abs(latest[key] - previous[key]);
        if (diff > tolerance) changes++;
        totalComparisons++;
      }
    });

    const changePercentage = totalComparisons > 0 ? changes / totalComparisons : 0;
    
    if (changePercentage > 0.3) return 'changing';
    if (changePercentage > 0.1) return 'stable';
    return 'stable';
  }

  private calculateMeasurementAccuracy(measurements: MeasurementData[]): number {
    // Calculate accuracy based on measurement consistency and completeness
    if (measurements.length === 0) return 0;
    
    const latest = measurements[0].measurements;
    const requiredFields = ['height', 'chest', 'waist', 'hips'];
    const completedFields = requiredFields.filter(field => latest[field] && latest[field] > 0);
    
    const completeness = completedFields.length / requiredFields.length;
    const consistency = this.calculateConsistency(measurements);
    
    return Math.round((completeness * 0.6 + consistency * 0.4) * 100);
  }

  private calculateConsistency(measurements: MeasurementData[]): number {
    if (measurements.length < 2) return 1;
    
    const latest = measurements[0].measurements;
    const previous = measurements[1].measurements;
    
    let totalDiff = 0;
    let comparisons = 0;
    
    Object.keys(latest).forEach(key => {
      if (latest[key] && previous[key]) {
        const diff = Math.abs(latest[key] - previous[key]);
        totalDiff += diff;
        comparisons++;
      }
    });
    
    const averageDiff = comparisons > 0 ? totalDiff / comparisons : 0;
    const maxExpectedDiff = 5; // Maximum expected difference in inches/cm
    
    return Math.max(0, 1 - (averageDiff / maxExpectedDiff));
  }

  private analyzeSeasonalPreferences() {
    const seasonalData: {[key: string]: number} = {
      'Spring': 0,
      'Summer': 0,
      'Fall': 0,
      'Winter': 0
    };

    this.orders.forEach(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        if (!isNaN(orderDate.getTime())) {
          const month = orderDate.getMonth();
          if (month >= 2 && month <= 4) seasonalData.Spring++;
          else if (month >= 5 && month <= 7) seasonalData.Summer++;
          else if (month >= 8 && month <= 10) seasonalData.Fall++;
          else seasonalData.Winter++;
        }
      }
    });

    const total = Object.values(seasonalData).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(seasonalData).map(([season, orders]) => ({
      season,
      orders,
      percentage: total > 0 ? (orders / total) * 100 : 0
    }));
  }

  private analyzeSizeConsistency(): number {
    // Analyze size consistency across orders
    const sizeData = this.orders.filter(order => order.size).map(order => order.size);
    if (sizeData.length === 0) return 0;
    
    const sizeCounts: {[key: string]: number} = {};
    sizeData.forEach(size => {
      sizeCounts[size] = (sizeCounts[size] || 0) + 1;
    });
    
    const mostCommonSize = Object.entries(sizeCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (!mostCommonSize) return 0;
    
    return (mostCommonSize[1] / sizeData.length) * 100;
  }

  private analyzeBrandPreferences() {
    const brandCounts: {[key: string]: number} = {};
    this.orders.forEach(order => {
      if (order.brand) {
        brandCounts[order.brand] = (brandCounts[order.brand] || 0) + 1;
      }
    });
    
    return Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private analyzePriceRange() {
    // Helper function to extract amount from order
    const extractAmount = (order: any): number => {
      const possibleAmounts = [
        order.amount,
        order.quotation_amount,
        order.total_amount,
        order.price,
        order.cost,
        order.value
      ];
      
      for (const amount of possibleAmounts) {
        if (amount !== null && amount !== undefined && amount !== '') {
          const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
          if (!isNaN(numericAmount) && numericAmount > 0) {
            return numericAmount;
          }
        }
      }
      
      return 0;
    };
    
    const amounts = this.orders
      .map(order => extractAmount(order))
      .filter(amount => amount > 0);
    
    console.log('🔍 Debug: Price range amounts:', amounts);
    
    if (amounts.length === 0) {
      return { min: 0, max: 0, average: 0 };
    }
    
    const result = {
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      average: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    };
    
    console.log('🔍 Debug: Price range result:', result);
    return result;
  }

  private analyzeOrderFrequency() {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const monthly = this.orders.filter(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        return !isNaN(orderDate.getTime()) && orderDate >= oneMonthAgo;
      }
      return false;
    }).length;
    
    const seasonal = this.orders.filter(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        return !isNaN(orderDate.getTime()) && orderDate >= threeMonthsAgo;
      }
      return false;
    }).length;
    
    const yearly = this.orders.filter(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        return !isNaN(orderDate.getTime()) && orderDate >= oneYearAgo;
      }
      return false;
    }).length;
    
    return { monthly, seasonal, yearly };
  }

  private calculateSatisfactionScore(): number {
    let score = 70; // Base score
    
    // Factors that increase satisfaction
    if (this.orders.length > 5) score += 10; // Loyal customer
    if (this.measurements.length > 0) score += 5; // Has measurements
    if (this.orders.filter(o => o.status === 'completed').length > 0) score += 10; // Completed orders
    
    // Factors that might decrease satisfaction
    const cancelledOrders = this.orders.filter(o => o.status === 'cancelled').length;
    if (cancelledOrders > 0) score -= cancelledOrders * 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private generateSizeRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (this.measurements.length === 0) {
      recommendations.push({
        id: 'measurement-1',
        type: 'size',
        title: 'Complete Your Body Measurements',
        description: 'Get accurate measurements to receive better size recommendations and improve your fitting experience.',
        priority: 'high',
        actionable: true,
        category: 'Size & Fit',
        confidence: 95,
        relatedData: { measurementCount: 0 }
      });
    } else if (this.measurements.length === 1) {
      const daysSinceLastMeasurement = Math.floor(
        (Date.now() - new Date(this.measurements[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastMeasurement > 90) {
        recommendations.push({
          id: 'measurement-2',
          type: 'size',
          title: 'Update Your Measurements',
          description: `Your measurements are ${daysSinceLastMeasurement} days old. Consider updating them for more accurate recommendations.`,
          priority: 'medium',
          actionable: true,
          category: 'Size & Fit',
          confidence: 80,
          relatedData: { daysSinceLastMeasurement }
        });
      }
    }

    if (insights.sizeConsistency < 70 && this.orders.length > 3) {
      recommendations.push({
        id: 'size-consistency-1',
        type: 'sizing',
        title: 'Improve Size Consistency',
        description: 'Your size preferences vary across orders. Consider getting professional sizing advice.',
        priority: 'medium',
        actionable: true,
        category: 'Size & Fit',
        confidence: 75,
        relatedData: { consistency: insights.sizeConsistency }
      });
    }

    return recommendations;
  }

  private generateStyleRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (insights.favoriteClothingTypes.length > 0) {
      const topType = insights.favoriteClothingTypes[0];
      const clothingTypeInfo = CLOTHING_TYPES.find(type => type.value === topType.type);
      
      if (clothingTypeInfo) {
        recommendations.push({
          id: 'style-1',
          type: 'style',
          title: `Explore More ${clothingTypeInfo.label} Options`,
          description: `You love ${clothingTypeInfo.label.toLowerCase()}! We have new arrivals in this category that might interest you.`,
          priority: 'medium',
          actionable: true,
          category: 'Style Preferences',
          confidence: 85,
          relatedData: { favoriteType: topType.type, percentage: topType.percentage }
        });
      }
    }

    // Suggest exploring new categories if customer is very focused on one type
    if (insights.favoriteClothingTypes.length > 0 && insights.favoriteClothingTypes[0].percentage > 80) {
      recommendations.push({
        id: 'style-2',
        type: 'style',
        title: 'Try New Styles',
        description: 'You have a strong preference for one clothing type. Consider exploring other categories to diversify your wardrobe.',
        priority: 'low',
        actionable: true,
        category: 'Style Preferences',
        confidence: 60,
        relatedData: { focusPercentage: insights.favoriteClothingTypes[0].percentage }
      });
    }

    return recommendations;
  }

  private generateSeasonalRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const currentMonth = new Date().getMonth();
    const season = currentMonth >= 2 && currentMonth <= 4 ? 'Spring' : 
                  currentMonth >= 5 && currentMonth <= 7 ? 'Summer' :
                  currentMonth >= 8 && currentMonth <= 10 ? 'Fall' : 'Winter';
    
    const currentSeasonData = insights.seasonalPreferences.find(s => s.season === season);
    
    if (currentSeasonData && currentSeasonData.orders === 0) {
      recommendations.push({
        id: 'seasonal-1',
        type: 'seasonal',
        title: `${season} Collection`,
        description: `Check out our latest ${season.toLowerCase()} collection with pieces perfect for the current season.`,
        priority: 'medium',
        actionable: true,
        category: 'Seasonal',
        confidence: 70,
        relatedData: { season, currentOrders: currentSeasonData.orders }
      });
    }

    return recommendations;
  }

  private generateBudgetRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (insights.rentalVsPurchaseRatio > 0.8) {
      recommendations.push({
        id: 'budget-1',
        type: 'budget',
        title: 'Consider Purchase Options',
        description: 'You rent frequently. Consider purchasing items you love for long-term value.',
        priority: 'low',
        actionable: true,
        category: 'Budget & Value',
        confidence: 65,
        relatedData: { rentalRatio: insights.rentalVsPurchaseRatio }
      });
    } else if (insights.rentalVsPurchaseRatio < 0.2) {
      recommendations.push({
        id: 'budget-2',
        type: 'budget',
        title: 'Try Rental Services',
        description: 'Consider renting for special occasions or trying new styles before purchasing.',
        priority: 'low',
        actionable: true,
        category: 'Budget & Value',
        confidence: 60,
        relatedData: { rentalRatio: insights.rentalVsPurchaseRatio }
      });
    }

    return recommendations;
  }

  private generateMaintenanceRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (insights.rentalVsPurchaseRatio > 0.7) {
      recommendations.push({
        id: 'maintenance-1',
        type: 'maintenance',
        title: 'Rental Care Tips',
        description: 'Since you rent frequently, here are some tips to keep your rented items in perfect condition.',
        priority: 'low',
        actionable: true,
        category: 'Care & Maintenance',
        confidence: 80,
        relatedData: { rentalRatio: insights.rentalVsPurchaseRatio }
      });
    }

    return recommendations;
  }

  /**
   * Analyze rental-specific insights
   */
  private analyzeRentalInsights() {
    const rentals = this.orders.filter(order => order.type === 'rental' || order.order_type === 'rental');
    
    if (rentals.length === 0) {
      return {
        totalRentals: 0,
        averageRentalDuration: 0,
        mostRentedTypes: [],
        penaltyRate: 0,
        returnTimeliness: 100
      };
    }

    // Analyze most rented clothing types
    const rentalTypeCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      rentalTypeCounts[rental.clothing_type] = (rentalTypeCounts[rental.clothing_type] || 0) + 1;
    });

    const mostRentedTypes = Object.entries(rentalTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate penalty rate
    const ordersWithPenalties = rentals.filter(rental => rental.penalty_status && rental.penalty_status !== 'none').length;
    const penaltyRate = rentals.length > 0 ? (ordersWithPenalties / rentals.length) * 100 : 0;

    // Calculate return timeliness (simplified)
    const onTimeReturns = rentals.filter(rental => rental.penalty_status === 'none' || !rental.penalty_status).length;
    const returnTimeliness = rentals.length > 0 ? (onTimeReturns / rentals.length) * 100 : 100;

    return {
      totalRentals: rentals.length,
      averageRentalDuration: 7, // Simplified - would need actual rental duration data
      mostRentedTypes,
      penaltyRate,
      returnTimeliness
    };
  }

  /**
   * Analyze purchase-specific insights
   */
  private analyzePurchaseInsights() {
    const purchases = this.orders.filter(order => order.type === 'purchase' || order.order_type === 'purchase');
    
    if (purchases.length === 0) {
      return {
        totalPurchases: 0,
        averagePurchaseValue: 0,
        mostPurchasedTypes: [],
        purchaseFrequency: 0
      };
    }

    // Analyze most purchased clothing types
    const purchaseTypeCounts: {[key: string]: number} = {};
    purchases.forEach(purchase => {
      purchaseTypeCounts[purchase.clothing_type] = (purchaseTypeCounts[purchase.clothing_type] || 0) + 1;
    });

    const mostPurchasedTypes = Object.entries(purchaseTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate average purchase value
    const totalPurchaseValue = purchases.reduce((sum, purchase) => {
      // Use robust amount extraction
      const possibleAmounts = [
        purchase.amount,
        purchase.quotation_amount,
        purchase.total_amount,
        purchase.price,
        purchase.cost,
        purchase.value
      ];
      
      let amount = 0;
      for (const amt of possibleAmounts) {
        if (amt !== null && amt !== undefined && amt !== '') {
          const numericAmount = typeof amt === 'string' ? Number(amt) : amt;
          if (!isNaN(numericAmount) && numericAmount > 0) {
            amount = numericAmount;
            break;
          }
        }
      }
      
      console.log('🔍 Debug: Purchase amount calculation:', {
        originalAmount: purchase.amount,
        quotationAmount: purchase.quotation_amount,
        totalAmount: purchase.total_amount,
        calculatedAmount: amount,
        runningTotal: sum + amount
      });
      return sum + amount;
    }, 0);
    const averagePurchaseValue = purchases.length > 0 ? totalPurchaseValue / purchases.length : 0;
    
    console.log('🔍 Debug: Purchase insights:', {
      totalPurchases: purchases.length,
      totalPurchaseValue,
      averagePurchaseValue
    });

    // Calculate purchase frequency (purchases per month)
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const recentPurchases = purchases.filter(purchase => {
      const orderDateStr = purchase.date || purchase.created_at || purchase.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        return !isNaN(orderDate.getTime()) && orderDate >= oneYearAgo;
      }
      return false;
    }).length;
    const purchaseFrequency = recentPurchases / 12; // per month

    return {
      totalPurchases: purchases.length,
      averagePurchaseValue,
      mostPurchasedTypes,
      purchaseFrequency
    };
  }

  /**
   * Analyze measurement-specific insights
   */
  private analyzeMeasurementInsights() {
    if (this.measurements.length === 0) {
      return {
        bodyTypeAnalysis: 'No measurements available',
        sizeRecommendations: [],
        measurementConsistency: 0,
        growthPatterns: []
      };
    }

    const latestMeasurement = this.measurements[0];
    const bodyTypeAnalysis = this.analyzeBodyType(latestMeasurement.measurements);
    const sizeRecommendations = this.generateSizeRecommendations(latestMeasurement.measurements);
    const measurementConsistency = this.calculateMeasurementConsistency();
    const growthPatterns = this.analyzeGrowthPatterns();

    return {
      bodyTypeAnalysis,
      sizeRecommendations,
      measurementConsistency,
      growthPatterns
    };
  }

  /**
   * Analyze behavioral patterns
   */
  private analyzeBehavioralPatterns() {
    if (this.orders.length === 0) {
      return {
        preferredOrderDays: [],
        preferredOrderTimes: [],
        seasonalSpending: [],
        loyaltyScore: 0
      };
    }

    // Analyze preferred order days
    const dayCounts: {[key: string]: number} = {};
    this.orders.forEach(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        if (!isNaN(orderDate.getTime())) { // Check if date is valid
          const day = orderDate.toLocaleDateString('en-US', { weekday: 'long' });
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      }
    });
    

    const preferredOrderDays = Object.entries(dayCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    // Analyze seasonal spending
    const monthlySpending: {[key: string]: number} = {};
    this.orders.forEach(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        if (!isNaN(orderDate.getTime())) { // Check if date is valid
          const month = orderDate.toLocaleDateString('en-US', { month: 'long' });
          
          // Use robust amount extraction
          const possibleAmounts = [
            order.amount,
            order.quotation_amount,
            order.total_amount,
            order.price,
            order.cost,
            order.value
          ];
          
          let amount = 0;
          for (const amt of possibleAmounts) {
            if (amt !== null && amt !== undefined && amt !== '') {
              const numericAmount = typeof amt === 'string' ? Number(amt) : amt;
              if (!isNaN(numericAmount) && numericAmount > 0) {
                amount = numericAmount;
                break;
              }
            }
          }
          
          monthlySpending[month] = (monthlySpending[month] || 0) + amount;
          console.log('🔍 Debug: Seasonal spending calculation:', {
            month,
            amount,
            runningTotal: monthlySpending[month]
          });
        }
      }
    });
    
    console.log('🔍 Debug: Monthly spending result:', monthlySpending);
    

    const seasonalSpending = Object.entries(monthlySpending)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate loyalty score based on order frequency and consistency
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const recentOrders = this.orders.filter(order => {
      const orderDateStr = order.date || order.created_at || order.order_date;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        return !isNaN(orderDate.getTime()) && orderDate >= oneYearAgo;
      }
      return false;
    }).length;
    
    const loyaltyScore = Math.min(100, (recentOrders / 12) * 20); // Scale based on monthly orders

    return {
      preferredOrderDays,
      preferredOrderTimes: [], // Would need time data
      seasonalSpending,
      loyaltyScore
    };
  }

  /**
   * Analyze body type based on measurements
   */
  private analyzeBodyType(measurements: any): string {
    if (!measurements.waist || !measurements.hips || !measurements.bust) {
      return 'Incomplete measurements';
    }

    const waist = measurements.waist;
    const hips = measurements.hips;
    const bust = measurements.bust;

    // Simple body type analysis
    if (hips > bust && hips > waist) {
      return 'Pear-shaped';
    } else if (bust > hips && bust > waist) {
      return 'Apple-shaped';
    } else if (Math.abs(bust - hips) < 2 && waist < bust && waist < hips) {
      return 'Hourglass';
    } else if (Math.abs(bust - hips) < 2 && Math.abs(waist - bust) < 2) {
      return 'Rectangle';
    } else {
      return 'Triangle';
    }
  }

  /**
   * Generate size recommendations based on measurements
   */
  private generateSizeRecommendations(measurements: any): Array<{clothingType: string, recommendedSize: string}> {
    const recommendations = [];
    
    if (measurements.chest && measurements.waist) {
      // Simple size calculation (would need actual sizing charts)
      if (measurements.chest < 36) {
        recommendations.push({ clothingType: 'Shirts', recommendedSize: 'XS' });
      } else if (measurements.chest < 38) {
        recommendations.push({ clothingType: 'Shirts', recommendedSize: 'S' });
      } else if (measurements.chest < 40) {
        recommendations.push({ clothingType: 'Shirts', recommendedSize: 'M' });
      } else if (measurements.chest < 42) {
        recommendations.push({ clothingType: 'Shirts', recommendedSize: 'L' });
      } else {
        recommendations.push({ clothingType: 'Shirts', recommendedSize: 'XL' });
      }
    }

    return recommendations;
  }

  /**
   * Calculate measurement consistency
   */
  private calculateMeasurementConsistency(): number {
    if (this.measurements.length < 2) return 100;

    const latest = this.measurements[0].measurements;
    const previous = this.measurements[1].measurements;
    
    let totalVariance = 0;
    let measurementsCompared = 0;

    Object.keys(latest).forEach(key => {
      if (latest[key] && previous[key]) {
        const variance = Math.abs(latest[key] - previous[key]);
        totalVariance += variance;
        measurementsCompared++;
      }
    });

    if (measurementsCompared === 0) return 100;

    const averageVariance = totalVariance / measurementsCompared;
    const consistency = Math.max(0, 100 - (averageVariance * 10)); // Scale variance to percentage

    return Math.round(consistency);
  }

  /**
   * Analyze growth patterns in measurements
   */
  private analyzeGrowthPatterns(): Array<{measurement: string, change: number, period: string}> {
    if (this.measurements.length < 2) return [];

    const latest = this.measurements[0].measurements;
    const previous = this.measurements[1].measurements;
    const patterns = [];

    Object.keys(latest).forEach(key => {
      if (latest[key] && previous[key]) {
        const change = latest[key] - previous[key];
        if (Math.abs(change) > 0.5) { // Only include significant changes
          patterns.push({
            measurement: key,
            change: Math.round(change * 10) / 10,
            period: 'Last measurement'
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Generate fitting recommendations based on rental history + measurement data
   */
  private generateFittingRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze fitting issues from rental history
    const fittingIssues = this.analyzeFittingIssues();
    
    if (fittingIssues.length > 0) {
      recommendations.push({
        id: 'fitting-1',
        type: 'size',
        title: 'Improve Fitting Accuracy',
        description: `Based on your rental history, we've identified ${fittingIssues.length} fitting issues. Let's get more accurate measurements to improve your experience.`,
        priority: 'high',
        actionable: true,
        category: 'Fitting & Measurements',
        confidence: 90,
        relatedData: { fittingIssues, measurementCount: this.measurements.length }
      });
    }

    // Recommend size adjustments based on measurement changes
    if (insights.measurementInsights.growthPatterns.length > 0) {
      const significantChanges = insights.measurementInsights.growthPatterns.filter(p => Math.abs(p.change) > 1);
      if (significantChanges.length > 0) {
        recommendations.push({
          id: 'fitting-2',
          type: 'sizing',
          title: 'Update Size Preferences',
          description: `Your measurements have changed significantly (${significantChanges.length} measurements). Consider updating your size preferences for better fitting.`,
          priority: 'medium',
          actionable: true,
          category: 'Fitting & Measurements',
          confidence: 85,
          relatedData: { changes: significantChanges }
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations for similar items based on rental history
   */
  private generateSimilarItemRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Find most successful rental items
    const successfulRentals = this.orders.filter(order => 
      (order.type === 'rental' || order.order_type === 'rental') && 
      order.status === 'completed' && 
      (!order.penalty_status || order.penalty_status === 'none')
    );

    if (successfulRentals.length > 0) {
      // Group by clothing type and find most successful
      const successfulTypes: {[key: string]: number} = {};
      successfulRentals.forEach(rental => {
        successfulTypes[rental.clothing_type] = (successfulTypes[rental.clothing_type] || 0) + 1;
      });

      const topSuccessfulType = Object.entries(successfulTypes)
        .sort(([,a], [,b]) => b - a)[0];

      if (topSuccessfulType) {
        const clothingTypeInfo = CLOTHING_TYPES.find(type => type.value === topSuccessfulType[0]);
        if (clothingTypeInfo) {
          recommendations.push({
            id: 'similar-1',
            type: 'style',
            title: `Try Similar ${clothingTypeInfo.label} Styles`,
            description: `You've successfully rented ${topSuccessfulType[1]} ${clothingTypeInfo.label.toLowerCase()} items. Explore similar styles that match your preferences and measurements.`,
            priority: 'high',
            actionable: true,
            category: 'Similar Items',
            confidence: 95,
            relatedData: { 
              successfulType: topSuccessfulType[0], 
              count: topSuccessfulType[1],
              clothingTypeInfo 
            }
          });
        }
      }
    }

    // Recommend items based on measurement compatibility
    if (insights.measurementInsights.sizeRecommendations.length > 0) {
      const sizeRec = insights.measurementInsights.sizeRecommendations[0];
      recommendations.push({
        id: 'similar-2',
        type: 'style',
        title: `Perfect Fit ${sizeRec.clothingType}`,
        description: `Based on your measurements, we recommend ${sizeRec.recommendedSize} size ${sizeRec.clothingType.toLowerCase()} for the best fit.`,
        priority: 'medium',
        actionable: true,
        category: 'Similar Items',
        confidence: 80,
        relatedData: { sizeRecommendation: sizeRec }
      });
    }

    return recommendations;
  }

  /**
   * Generate specific pattern-based recommendations for Filipino formal wear
   */
  private generateFilipinoFormalRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze rental patterns for Filipino formal wear
    const formalRentals = this.orders.filter(order => 
      (order.type === 'rental' || order.order_type === 'rental') &&
      (order.clothing_type.toLowerCase().includes('barong') ||
       order.clothing_type.toLowerCase().includes('filipiniana') ||
       order.clothing_type.toLowerCase().includes('formal') ||
       order.clothing_type.toLowerCase().includes('traditional'))
    );

    if (formalRentals.length > 0) {
      // Analyze specific items rented
      const itemCounts: {[key: string]: number} = {};
      const sizeCounts: {[key: string]: number} = {};
      
      formalRentals.forEach(rental => {
        const itemKey = `${rental.clothing_type} - ${rental.size || 'Unknown'}`;
        itemCounts[itemKey] = (itemCounts[itemKey] || 0) + 1;
        
        if (rental.size) {
          sizeCounts[rental.size] = (sizeCounts[rental.size] || 0) + 1;
        }
      });

      // Find most frequently rented item
      const mostRentedItem = Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)[0];

      // Find most common size
      const mostCommonSize = Object.entries(sizeCounts)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostRentedItem && mostRentedItem[0].toLowerCase().includes('barong')) {
        const [itemName, count] = mostRentedItem;
        const size = mostCommonSize ? mostCommonSize[0] : 'Medium';
        
        // Suggest complementary items based on Barong rental pattern
        recommendations.push({
          id: 'filipino-1',
          type: 'style',
          title: 'Complete Your Formal Look',
          description: `You've rented ${count} Barong items. Consider adding a "Coat Barong" or "Filipiniana Partner Set" to complete your formal wardrobe for upcoming events.`,
          priority: 'high',
          actionable: true,
          category: 'Filipino Formal Wear',
          confidence: 90,
          relatedData: { 
            mostRentedItem: itemName,
            count,
            suggestedItems: ['Coat Barong', 'Filipiniana Partner Set'],
            preferredSize: size
          }
        });
      }

      // Suggest based on measurement profile matching
      if (insights.measurementInsights.bodyTypeAnalysis && 
          insights.measurementInsights.bodyTypeAnalysis !== 'Incomplete measurements') {
        const bodyType = insights.measurementInsights.bodyTypeAnalysis;
        const sizeRec = insights.measurementInsights.sizeRecommendations[0];
        
        if (sizeRec) {
          recommendations.push({
            id: 'filipino-2',
            type: 'style',
            title: `Perfect Fit for ${bodyType} Body Type`,
            description: `Based on your ${bodyType} body type and ${sizeRec.recommendedSize} measurements, we recommend trying traditional Filipino formal wear that complements your body shape.`,
            priority: 'medium',
            actionable: true,
            category: 'Filipino Formal Wear',
            confidence: 85,
            relatedData: { 
              bodyType,
              sizeRecommendation: sizeRec,
              suggestedStyles: this.getFilipinoStylesForBodyType(bodyType)
            }
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Get Filipino clothing styles recommended for specific body types
   */
  private getFilipinoStylesForBodyType(bodyType: string): string[] {
    switch (bodyType.toLowerCase()) {
      case 'pear-shaped':
        return ['A-line Filipiniana', 'Empire Waist Barong', 'Flared Barong'];
      case 'apple-shaped':
        return ['Straight Cut Barong', 'Classic Barong', 'Traditional Barong'];
      case 'hourglass':
        return ['Fitted Barong', 'Tailored Filipiniana', 'Form-fitting Barong'];
      case 'rectangle':
        return ['Belted Barong', 'Waist-defining Barong', 'Structured Barong'];
      case 'triangle':
        return ['Wide Lapel Barong', 'Broad Shoulder Barong', 'Balanced Barong'];
      default:
        return ['Classic Barong', 'Traditional Barong', 'Modern Barong'];
    }
  }

  /**
   * Generate recommendations based on measurement profile matching
   */
  private generateMeasurementProfileRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (insights.measurementInsights.sizeRecommendations.length > 0) {
      const sizeRec = insights.measurementInsights.sizeRecommendations[0];
      
      // Find items with similar measurement profiles
      const similarProfileItems = this.findItemsWithSimilarMeasurements(sizeRec);
      
      if (similarProfileItems.length > 0) {
        recommendations.push({
          id: 'profile-1',
          type: 'style',
          title: 'Items Matching Your Measurements',
          description: `Based on your ${sizeRec.recommendedSize} measurements, we found ${similarProfileItems.length} items that should fit you perfectly, even if you haven't tried them before.`,
          priority: 'high',
          actionable: true,
          category: 'Measurement-Based',
          confidence: 88,
          relatedData: { 
            sizeRecommendation: sizeRec,
            similarItems: similarProfileItems
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Find items with similar measurement profiles using catalog
   */
  private findItemsWithSimilarMeasurements(measurements: any): string[] {
    if (!measurements) return [];
    
    const similarItems: string[] = [];
    
    // Find catalog items that match the customer's body type and measurements
    const matchingItems = this.findMeasurementBasedCatalogItems(measurements);
    
    matchingItems.forEach(item => {
      similarItems.push(item.label);
    });
    
    return similarItems;
  }

  /**
   * Find catalog items based on measurements
   */
  private findMeasurementBasedCatalogItems(measurements: any): ClothingType[] {
    const matchingItems: ClothingType[] = [];
    
    // Determine body type from measurements
    const bodyType = this.analyzeBodyType(measurements);
    
    // Find items suitable for this body type
    if (bodyType.toLowerCase().includes('hourglass')) {
      // Hourglass figures look good in fitted items
      const fittedItems = CLOTHING_TYPES.filter(item => 
        item.label.toLowerCase().includes('mermaid') ||
        item.label.toLowerCase().includes('fitted') ||
        item.category === 'evening_party_wear'
      );
      matchingItems.push(...fittedItems.slice(0, 3));
    } else if (bodyType.toLowerCase().includes('pear')) {
      // Pear shapes look good in A-line or empire waist items
      const aLineItems = CLOTHING_TYPES.filter(item => 
        item.label.toLowerCase().includes('a-line') ||
        item.label.toLowerCase().includes('empire') ||
        item.category === 'evening_party_wear'
      );
      matchingItems.push(...aLineItems.slice(0, 3));
    } else if (bodyType.toLowerCase().includes('apple')) {
      // Apple shapes look good in empire waist or flowy items
      const flowyItems = CLOTHING_TYPES.filter(item => 
        item.label.toLowerCase().includes('flowy') ||
        item.label.toLowerCase().includes('empire') ||
        item.category === 'evening_party_wear'
      );
      matchingItems.push(...flowyItems.slice(0, 3));
    } else {
      // Rectangle shapes can wear most styles
      const versatileItems = CLOTHING_TYPES.filter(item => 
        item.popular || 
        item.category === 'formal_attire' ||
        item.category === 'ph_traditional'
      );
      matchingItems.push(...versatileItems.slice(0, 3));
    }
    
    return matchingItems;
  }

  /**
   * Generate pattern-based recommendations
   */
  private generatePatternBasedRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze rental patterns
    const rentalPatterns = this.analyzeRentalPatterns();
    
    if (rentalPatterns.preferredSeason) {
      const currentMonth = new Date().getMonth();
      const isPreferredSeason = this.isCurrentSeasonPreferred(rentalPatterns.preferredSeason, currentMonth);
      
      if (!isPreferredSeason) {
        recommendations.push({
          id: 'pattern-1',
          type: 'seasonal',
          title: `Your Favorite Season is Coming`,
          description: `You typically rent more during ${rentalPatterns.preferredSeason}. Start planning your ${rentalPatterns.preferredSeason.toLowerCase()} wardrobe now.`,
          priority: 'medium',
          actionable: true,
          category: 'Pattern Recognition',
          confidence: 75,
          relatedData: { preferredSeason: rentalPatterns.preferredSeason }
        });
      }
    }

    // Analyze size consistency patterns
    if (insights.sizeConsistency > 80 && this.orders.length > 5) {
      const mostCommonSize = this.getMostCommonSize();
      if (mostCommonSize) {
        recommendations.push({
          id: 'pattern-2',
          type: 'style',
          title: `Your Perfect Size: ${mostCommonSize}`,
          description: `You consistently choose ${mostCommonSize} size items. We have new arrivals in your preferred size across different categories.`,
          priority: 'medium',
          actionable: true,
          category: 'Pattern Recognition',
          confidence: 85,
          relatedData: { preferredSize: mostCommonSize, consistency: insights.sizeConsistency }
        });
      }
    }

    // Analyze spending patterns
    if (insights.behavioralPatterns.loyaltyScore > 70) {
      recommendations.push({
        id: 'pattern-3',
        type: 'budget',
        title: 'Loyalty Rewards Available',
        description: `As a valued customer (loyalty score: ${Math.round(insights.behavioralPatterns.loyaltyScore)}%), you're eligible for exclusive discounts and early access to new collections.`,
        priority: 'low',
        actionable: true,
        category: 'Pattern Recognition',
        confidence: 70,
        relatedData: { loyaltyScore: insights.behavioralPatterns.loyaltyScore }
      });
    }

    return recommendations;
  }

  /**
   * Analyze fitting issues from rental history
   */
  private analyzeFittingIssues(): string[] {
    const issues: string[] = [];
    
    // Check for orders with size-related issues
    const sizeIssues = this.orders.filter(order => 
      order.notes && (
        order.notes.toLowerCase().includes('size') ||
        order.notes.toLowerCase().includes('fit') ||
        order.notes.toLowerCase().includes('tight') ||
        order.notes.toLowerCase().includes('loose')
      )
    );

    if (sizeIssues.length > 0) {
      issues.push(`${sizeIssues.length} size-related issues found`);
    }

    // Check for measurement accuracy issues
    if (this.measurements.length > 0) {
      const latestMeasurement = this.measurements[0];
      const requiredFields = ['height', 'chest', 'waist', 'hips'];
      const missingFields = requiredFields.filter(field => !latestMeasurement.measurements[field]);
      
      if (missingFields.length > 0) {
        issues.push(`Missing measurements: ${missingFields.join(', ')}`);
      }
    }

    return issues;
  }

  /**
   * Analyze rental patterns
   */
  private analyzeRentalPatterns() {
    const rentals = this.orders.filter(order => order.type === 'rental' || order.order_type === 'rental');
    
    if (rentals.length === 0) {
      return { preferredSeason: null, preferredTypes: [], averageSpending: 0 };
    }

    // Analyze seasonal patterns
    const seasonalCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      const month = new Date(rental.date).getMonth();
      const season = month >= 2 && month <= 4 ? 'Spring' : 
                    month >= 5 && month <= 7 ? 'Summer' :
                    month >= 8 && month <= 10 ? 'Fall' : 'Winter';
      seasonalCounts[season] = (seasonalCounts[season] || 0) + 1;
    });

    const preferredSeason = Object.entries(seasonalCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Analyze preferred types
    const typeCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      typeCounts[rental.clothing_type] = (typeCounts[rental.clothing_type] || 0) + 1;
    });

    const preferredTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Calculate average spending
    const totalSpending = rentals.reduce((sum, rental) => sum + (rental.amount || 0), 0);
    const averageSpending = rentals.length > 0 ? totalSpending / rentals.length : 0;

    return {
      preferredSeason,
      preferredTypes,
      averageSpending
    };
  }

  /**
   * Check if current season is preferred
   */
  private isCurrentSeasonPreferred(preferredSeason: string, currentMonth: number): boolean {
    const currentSeason = currentMonth >= 2 && currentMonth <= 4 ? 'Spring' : 
                         currentMonth >= 5 && currentMonth <= 7 ? 'Summer' :
                         currentMonth >= 8 && currentMonth <= 10 ? 'Fall' : 'Winter';
    return currentSeason === preferredSeason;
  }

  /**
   * Get most common size from orders
   */
  private getMostCommonSize(): string | null {
    const sizeData = this.orders.filter(order => order.size).map(order => order.size);
    if (sizeData.length === 0) return null;
    
    const sizeCounts: {[key: string]: number} = {};
    sizeData.forEach(size => {
      sizeCounts[size] = (sizeCounts[size] || 0) + 1;
    });
    
    const mostCommon = Object.entries(sizeCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostCommon ? mostCommon[0] : null;
  }

  /**
   * Analyze specific rental patterns and trends
   */
  private analyzeRentalTrends(): {
    frequentlyRentedTypes: Array<{type: string, count: number, percentage: number}>;
    eventBasedRentals: Array<{occasion: string, count: number}>;
    sizePreferences: Array<{size: string, count: number}>;
    seasonalPatterns: Array<{season: string, count: number}>;
    brandPreferences: Array<{brand: string, count: number}>;
  } {
    const rentals = this.orders.filter(order => order.type === 'rental' || order.order_type === 'rental');
    
    if (rentals.length === 0) {
      return {
        frequentlyRentedTypes: [],
        eventBasedRentals: [],
        sizePreferences: [],
        seasonalPatterns: [],
        brandPreferences: []
      };
    }

    // Analyze frequently rented clothing types
    const typeCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      typeCounts[rental.clothing_type] = (typeCounts[rental.clothing_type] || 0) + 1;
    });

    const frequentlyRentedTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / rentals.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Analyze event-based rentals (based on notes or clothing type)
    const eventCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      if (rental.notes) {
        const occasion = this.extractOccasionFromNotes(rental.notes);
        if (occasion) {
          eventCounts[occasion] = (eventCounts[occasion] || 0) + 1;
        }
      }
      
      // Also check clothing type for formal events
      if (rental.clothing_type.toLowerCase().includes('formal') || 
          rental.clothing_type.toLowerCase().includes('barong') ||
          rental.clothing_type.toLowerCase().includes('filipiniana')) {
        eventCounts['Formal Events'] = (eventCounts['Formal Events'] || 0) + 1;
      }
    });

    const eventBasedRentals = Object.entries(eventCounts)
      .map(([occasion, count]) => ({ occasion, count }))
      .sort((a, b) => b.count - a.count);

    // Analyze size preferences
    const sizeCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      if (rental.size) {
        sizeCounts[rental.size] = (sizeCounts[rental.size] || 0) + 1;
      }
    });

    const sizePreferences = Object.entries(sizeCounts)
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count);

    // Analyze seasonal patterns
    const seasonalCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      const month = new Date(rental.date).getMonth();
      const season = month >= 2 && month <= 4 ? 'Spring' : 
                    month >= 5 && month <= 7 ? 'Summer' :
                    month >= 8 && month <= 10 ? 'Fall' : 'Winter';
      seasonalCounts[season] = (seasonalCounts[season] || 0) + 1;
    });

    const seasonalPatterns = Object.entries(seasonalCounts)
      .map(([season, count]) => ({ season, count }))
      .sort((a, b) => b.count - a.count);

    // Analyze brand preferences
    const brandCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      if (rental.brand) {
        brandCounts[rental.brand] = (brandCounts[rental.brand] || 0) + 1;
      }
    });

    const brandPreferences = Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      frequentlyRentedTypes,
      eventBasedRentals,
      sizePreferences,
      seasonalPatterns,
      brandPreferences
    };
  }

  /**
   * Extract occasion from rental notes
   */
  private extractOccasionFromNotes(notes: string): string | null {
    const lowerNotes = notes.toLowerCase();
    
    if (lowerNotes.includes('wedding') || lowerNotes.includes('kasalan')) {
      return 'Wedding';
    } else if (lowerNotes.includes('graduation') || lowerNotes.includes('graduation')) {
      return 'Graduation';
    } else if (lowerNotes.includes('formal') || lowerNotes.includes('formal')) {
      return 'Formal Event';
    } else if (lowerNotes.includes('party') || lowerNotes.includes('celebration')) {
      return 'Party/Celebration';
    } else if (lowerNotes.includes('business') || lowerNotes.includes('meeting')) {
      return 'Business Event';
    }
    
    return null;
  }

  /**
   * Generate trend-based recommendations
   */
  private generateTrendBasedRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const trends = this.analyzeRentalTrends();

    // Recommend based on frequently rented types
    if (trends.frequentlyRentedTypes.length > 0) {
      const topType = trends.frequentlyRentedTypes[0];
      if (topType.percentage > 50) { // If more than 50% of rentals are one type
        recommendations.push({
          id: 'trend-1',
          type: 'style',
          title: `You Love ${topType.type}!`,
          description: `${topType.percentage.toFixed(0)}% of your rentals are ${topType.type.toLowerCase()}. We have new arrivals in this category that you might enjoy.`,
          priority: 'high',
          actionable: true,
          category: 'Trend Analysis',
          confidence: 90,
          relatedData: { 
            type: topType.type,
            percentage: topType.percentage,
            count: topType.count
          }
        });
      }
    }

    // Recommend based on event patterns
    if (trends.eventBasedRentals.length > 0) {
      const topEvent = trends.eventBasedRentals[0];
      recommendations.push({
        id: 'trend-2',
        type: 'style',
        title: `Perfect for ${topEvent.occasion}`,
        description: `You've rented ${topEvent.count} times for ${topEvent.occasion.toLowerCase()}. We have specialized collections for these occasions.`,
        priority: 'medium',
        actionable: true,
        category: 'Trend Analysis',
        confidence: 80,
        relatedData: { 
          occasion: topEvent.occasion,
          count: topEvent.count
        }
      });
    }

    // Recommend based on seasonal patterns
    if (trends.seasonalPatterns.length > 0) {
      const currentMonth = new Date().getMonth();
      const currentSeason = currentMonth >= 2 && currentMonth <= 4 ? 'Spring' : 
                           currentMonth >= 5 && currentMonth <= 7 ? 'Summer' :
                           currentMonth >= 8 && currentMonth <= 10 ? 'Fall' : 'Winter';
      
      const currentSeasonData = trends.seasonalPatterns.find(s => s.season === currentSeason);
      if (currentSeasonData && currentSeasonData.count > 0) {
        recommendations.push({
          id: 'trend-3',
          type: 'seasonal',
          title: `${currentSeason} is Your Season!`,
          description: `You've rented ${currentSeasonData.count} items during ${currentSeason.toLowerCase()}. Check out our latest ${currentSeason.toLowerCase()} collection.`,
          priority: 'medium',
          actionable: true,
          category: 'Trend Analysis',
          confidence: 75,
          relatedData: { 
            season: currentSeason,
            count: currentSeasonData.count
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate step-by-step recommendations following the exact logic flow
   * Step 1: Collect data (Customer profile, Rental records, Measurement data)
   * Step 2: Analyze patterns (Detect frequent types, Match measurements, Identify trends)
   * Step 3: Generate recommendations (Suggest similar/complementary items)
   * Step 4: Display insights (Dashboard with most rented categories and recommendations)
   */
  private generateStepByStepRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Step 1: Collect data
    const customerProfile = this.collectCustomerProfile();
    const rentalRecords = this.collectRentalRecords();
    const measurementData = this.collectMeasurementData();

    // Step 2: Analyze patterns
    const patternAnalysis = this.analyzeRentalPatterns();
    const measurementMatches = this.analyzeMeasurementMatches();
    const trendAnalysis = this.analyzeTrends();

    // Step 3: Generate recommendations based on analysis
    recommendations.push(...this.generatePatternBasedSuggestions(patternAnalysis, customerProfile));
    recommendations.push(...this.generateMeasurementBasedSuggestions(measurementMatches, customerProfile));
    recommendations.push(...this.generateTrendBasedSuggestions(trendAnalysis, customerProfile));

    // Step 4: Display insights
    recommendations.push(...this.generateDashboardInsights(insights, patternAnalysis));

    return recommendations;
  }

  /**
   * Step 1: Collect customer profile data
   */
  private collectCustomerProfile() {
    return {
      gender: this.profile?.gender?.toLowerCase() || 'unknown',
      age: this.profile?.age || 0,
      location: this.profile?.location || 'unknown',
      preferences: this.profile?.preferences || []
    };
  }

  /**
   * Step 1: Collect rental records
   */
  private collectRentalRecords() {
    return this.orders.filter(order => 
      order.type === 'rental' || order.order_type === 'rental'
    ).map(rental => ({
      item: `${rental.clothing_type} ${rental.brand || ''}`.trim(),
      size: rental.size,
      date: rental.date,
      status: rental.status,
      notes: rental.notes
    }));
  }

  /**
   * Step 1: Collect measurement data
   */
  private collectMeasurementData() {
    if (this.measurements.length === 0) return null;
    
    const latest = this.measurements[0];
    return {
      chest: latest.measurements.chest,
      waist: latest.measurements.waist,
      hips: latest.measurements.hips,
      height: latest.measurements.height,
      shoulderWidth: latest.measurements.shoulder_width,
      armLength: latest.measurements.arm_length
    };
  }

  /**
   * Step 2: Analyze rental patterns
   */
  private analyzeRentalPatterns() {
    const rentals = this.orders.filter(order => 
      order.type === 'rental' || order.order_type === 'rental'
    );

    // Detect frequently rented types
    const typeCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      typeCounts[rental.clothing_type] = (typeCounts[rental.clothing_type] || 0) + 1;
    });

    const frequentTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / rentals.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Analyze specific items
    const itemCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      const itemKey = `${rental.clothing_type} ${rental.brand || ''} - ${rental.size || 'Unknown'}`.trim();
      itemCounts[itemKey] = (itemCounts[itemKey] || 0) + 1;
    });

    const frequentItems = Object.entries(itemCounts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count);

    return {
      frequentTypes,
      frequentItems,
      totalRentals: rentals.length
    };
  }

  /**
   * Step 2: Analyze measurement matches
   */
  private analyzeMeasurementMatches() {
    if (!this.measurements.length) return null;

    const latest = this.measurements[0];
    const measurements = latest.measurements;

    // Find items with similar measurement profiles
    const similarItems = this.findItemsWithSimilarMeasurements(measurements);
    
    return {
      measurements,
      similarItems,
      bodyType: this.analyzeBodyType(measurements)
    };
  }

  /**
   * Step 2: Analyze trends
   */
  private analyzeTrends() {
    const rentals = this.orders.filter(order => 
      order.type === 'rental' || order.order_type === 'rental'
    );

    // Event-based trends
    const eventTrends: {[key: string]: number} = {};
    rentals.forEach(rental => {
      if (rental.notes) {
        const occasion = this.extractOccasionFromNotes(rental.notes);
        if (occasion) {
          eventTrends[occasion] = (eventTrends[occasion] || 0) + 1;
        }
      }
    });

    // Style preferences
    const stylePreferences: {[key: string]: number} = {};
    rentals.forEach(rental => {
      if (rental.clothing_type.toLowerCase().includes('formal') || 
          rental.clothing_type.toLowerCase().includes('traditional')) {
        stylePreferences['Formal/Traditional'] = (stylePreferences['Formal/Traditional'] || 0) + 1;
      } else if (rental.clothing_type.toLowerCase().includes('casual') || 
                 rental.clothing_type.toLowerCase().includes('modern')) {
        stylePreferences['Casual/Modern'] = (stylePreferences['Casual/Modern'] || 0) + 1;
      }
    });

    return {
      eventTrends,
      stylePreferences,
      totalRentals: rentals.length
    };
  }

  /**
   * Step 3: Generate pattern-based suggestions
   */
  private generatePatternBasedSuggestions(patternAnalysis: any, customerProfile: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (patternAnalysis.frequentItems.length > 0) {
      const topItem = patternAnalysis.frequentItems[0];
      
      // Generate complementary suggestions based on the most rented item
      const complementaryItems = this.getComplementaryItems(topItem.item, customerProfile);
      
      if (complementaryItems.length > 0) {
        // Find the actual catalog item for the main image
        const catalogItem = CLOTHING_TYPES.find(item => 
          item.label.toLowerCase().includes(topItem.item.toLowerCase()) ||
          topItem.item.toLowerCase().includes(item.label.toLowerCase())
        );
        
        recommendations.push({
          id: 'pattern-based-suggestion',
          type: 'style',
          title: 'Based on Your Favorites',
          description: `You frequently rent "${topItem.item}". Here are complementary items perfect for your upcoming events.`,
          priority: 'high',
          actionable: true,
          category: 'Pattern-Based',
          confidence: 95,
          imageSource: catalogItem ? this.getCatalogItemImage(catalogItem) : undefined,
          imageUrl: catalogItem ? undefined : this.getCategoryImage(topItem.item),
          suggestedItems: complementaryItems,
          relatedData: {
            frequentItem: topItem.item,
            count: topItem.count,
            customerProfile
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Step 3: Generate measurement-based suggestions
   */
  private generateMeasurementBasedSuggestions(measurementMatches: any, customerProfile: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (measurementMatches && measurementMatches.similarItems.length > 0) {
      // Find a representative catalog item for the main image
      const representativeItem = CLOTHING_TYPES.find(item => 
        measurementMatches.similarItems.some(similarItem => 
          item.label.toLowerCase().includes(similarItem.toLowerCase()) ||
          similarItem.toLowerCase().includes(item.label.toLowerCase())
        )
      );
      
      recommendations.push({
        id: 'measurement-based-suggestion',
        type: 'style',
        title: 'Perfect Fit Recommendations',
        description: `Based on your measurements (${measurementMatches.bodyType}), these items should fit you perfectly, even if you haven't tried them before.`,
        priority: 'high',
        actionable: true,
        category: 'Measurement-Based',
        confidence: 88,
        imageSource: representativeItem ? this.getCatalogItemImage(representativeItem) : undefined,
        imageUrl: representativeItem ? undefined : this.getBodyTypeImage(measurementMatches.bodyType),
        suggestedItems: measurementMatches.similarItems.map((item: string) => {
          const catalogItem = CLOTHING_TYPES.find(catalogItem => 
            catalogItem.label.toLowerCase().includes(item.toLowerCase()) ||
            item.toLowerCase().includes(catalogItem.label.toLowerCase())
          );
          const imageSource = catalogItem ? this.getCatalogItemImage(catalogItem) : undefined;
          return {
            name: item,
            description: `Perfect fit based on your ${measurementMatches.bodyType} body type`,
            imageSource: imageSource,
            imageUrl: imageSource ? undefined : this.getItemImage(item),
            category: this.getItemCategory(item),
            reason: 'Measurement match'
          };
        }),
        relatedData: {
          bodyType: measurementMatches.bodyType,
          measurements: measurementMatches.measurements,
          customerProfile
        }
      });
    }

    return recommendations;
  }

  /**
   * Step 3: Generate trend-based suggestions
   */
  private generateTrendBasedSuggestions(trendAnalysis: any, customerProfile: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Event-based suggestions
    if (Object.keys(trendAnalysis.eventTrends).length > 0) {
      const topEvent = Object.entries(trendAnalysis.eventTrends)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      if (topEvent) {
        const eventItems = this.getEventBasedItems(topEvent[0], customerProfile);
        
        if (eventItems.length > 0) {
          // Find a representative catalog item for the main image
          const representativeItem = CLOTHING_TYPES.find(item => 
            eventItems.some(eventItem => 
              item.label.toLowerCase().includes(eventItem.name.toLowerCase()) ||
              eventItem.name.toLowerCase().includes(item.label.toLowerCase())
            )
          );
          
          recommendations.push({
            id: 'trend-event-suggestion',
            type: 'style',
            title: `Perfect for ${topEvent[0]}`,
            description: `You've rented ${topEvent[1]} times for ${topEvent[0].toLowerCase()}. Here are specialized items for these occasions.`,
            priority: 'medium',
            actionable: true,
            category: 'Event-Based',
            confidence: 85,
            imageSource: representativeItem ? this.getCatalogItemImage(representativeItem) : undefined,
            imageUrl: representativeItem ? undefined : this.getEventImage(topEvent[0]),
            suggestedItems: eventItems,
            relatedData: {
              event: topEvent[0],
              count: topEvent[1],
              customerProfile
            }
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Step 4: Generate dashboard insights
   */
  private generateDashboardInsights(insights: CustomerInsights, patternAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Most rented categories insight
    if (patternAnalysis.frequentTypes.length > 0) {
      const topCategory = patternAnalysis.frequentTypes[0];
      // Find a representative catalog item for the main image
      const representativeItem = CLOTHING_TYPES.find(item => 
        item.category === topCategory.type.toLowerCase().replace(' ', '_')
      );
      
      recommendations.push({
        id: 'dashboard-insight-categories',
        type: 'style',
        title: 'Your Style Profile',
        description: `Most rented categories: ${topCategory.type} (${topCategory.percentage.toFixed(0)}%)`,
        priority: 'medium',
        actionable: true,
        category: 'Dashboard Insights',
        confidence: 90,
        imageSource: representativeItem ? this.getCatalogItemImage(representativeItem) : undefined,
        imageUrl: representativeItem ? undefined : this.getCategoryImage(topCategory.type),
        relatedData: {
          topCategory: topCategory.type,
          percentage: topCategory.percentage,
          allCategories: patternAnalysis.frequentTypes
        }
      });
    }

    // Perfect fit match insight
    if (insights.measurementInsights.sizeRecommendations.length > 0) {
      const sizeRec = insights.measurementInsights.sizeRecommendations[0];
      // Find the actual catalog item for the main image
      const catalogItem = CLOTHING_TYPES.find(item => 
        item.label.toLowerCase().includes(sizeRec.clothingType.toLowerCase()) ||
        sizeRec.clothingType.toLowerCase().includes(item.label.toLowerCase())
      );
      
      recommendations.push({
        id: 'dashboard-insight-fit',
        type: 'style',
        title: 'Perfect Fit Match',
        description: `Recommended for you: ${sizeRec.clothingType} ${sizeRec.recommendedSize} - Perfect fit match based on previous rentals.`,
        priority: 'high',
        actionable: true,
        category: 'Dashboard Insights',
        confidence: 95,
        imageSource: catalogItem ? this.getCatalogItemImage(catalogItem) : undefined,
        imageUrl: catalogItem ? undefined : this.getCategoryImage(sizeRec.clothingType),
        suggestedItems: [{
          name: `${sizeRec.clothingType} ${sizeRec.recommendedSize}`,
          description: 'Perfect fit match based on your measurements and rental history',
          imageSource: catalogItem ? this.getCatalogItemImage(catalogItem) : undefined,
          imageUrl: catalogItem ? undefined : this.getItemImage(`${sizeRec.clothingType} ${sizeRec.recommendedSize}`),
          size: sizeRec.recommendedSize,
          category: sizeRec.clothingType,
          reason: 'Perfect fit match'
        }],
        relatedData: {
          sizeRecommendation: sizeRec,
          confidence: 95
        }
      });
    }

    return recommendations;
  }

  /**
   * Get complementary items based on frequently rented item using actual catalog
   */
  private getComplementaryItems(frequentItem: string, customerProfile: any): Array<{
    name: string;
    description: string;
    imageSource?: any;
    imageUrl?: string;
    size?: string;
    category: string;
    reason: string;
  }> {
    if (!frequentItem) return [];
    
    const itemLower = frequentItem.toLowerCase();
    const complementaryItems: Array<{
      name: string;
      description: string;
      imageUrl: string;
      size?: string;
      category: string;
      reason: string;
    }> = [];

    // Find matching catalog items based on frequent item
    const matchingItems = this.findMatchingCatalogItems(itemLower);
    
    // Add complementary items from catalog
    matchingItems.forEach(item => {
      const imageSource = this.getCatalogItemImage(item);
      complementaryItems.push({
        name: item.label,
        description: item.description,
        imageSource: imageSource, // Store the actual image source object
        imageUrl: typeof imageSource === 'string' ? imageSource : undefined, // Keep for backward compatibility
        category: this.getCategoryFromClothingType(item),
        reason: this.getComplementaryReason(item, itemLower)
      });
    });

    return complementaryItems;
  }

  /**
   * Find matching catalog items based on frequent item
   */
  private findMatchingCatalogItems(frequentItem: string): ClothingType[] {
    const matchingItems: ClothingType[] = [];
    
    if (frequentItem.includes('barong')) {
      // Find Barong-related items
      const barongItems = CLOTHING_TYPES.filter(item => 
        item.id.includes('barong') || 
        item.label.toLowerCase().includes('barong') ||
        item.category === 'ph_traditional'
      );
      matchingItems.push(...barongItems.slice(0, 3)); // Limit to 3 items
    } else if (frequentItem.includes('filipiniana')) {
      // Find Filipiniana-related items
      const filipinianaItems = CLOTHING_TYPES.filter(item => 
        item.id.includes('filipiniana') || 
        item.label.toLowerCase().includes('filipiniana') ||
        item.category === 'ph_traditional'
      );
      matchingItems.push(...filipinianaItems.slice(0, 3));
    } else if (frequentItem.includes('suit')) {
      // Find Suit-related items
      const suitItems = CLOTHING_TYPES.filter(item => 
        item.id.includes('suit') || 
        item.label.toLowerCase().includes('suit') ||
        item.category === 'formal_attire'
      );
      matchingItems.push(...suitItems.slice(0, 3));
    } else if (frequentItem.includes('dress') || frequentItem.includes('gown')) {
      // Find Dress/Gown-related items
      const dressItems = CLOTHING_TYPES.filter(item => 
        item.id.includes('dress') || 
        item.id.includes('gown') ||
        item.label.toLowerCase().includes('dress') ||
        item.label.toLowerCase().includes('gown') ||
        item.category === 'evening_party_wear' ||
        item.category === 'wedding_bridal'
      );
      matchingItems.push(...dressItems.slice(0, 3));
    } else if (frequentItem.includes('wedding')) {
      // Find Wedding-related items
      const weddingItems = CLOTHING_TYPES.filter(item => 
        item.id.includes('wedding') || 
        item.label.toLowerCase().includes('wedding') ||
        item.category === 'wedding_bridal'
      );
      matchingItems.push(...weddingItems.slice(0, 3));
    } else {
      // Find popular items as fallback
      const popularItems = CLOTHING_TYPES.filter(item => item.popular);
      matchingItems.push(...popularItems.slice(0, 3));
    }

    return matchingItems;
  }

  /**
   * Get catalog item image - returns the actual image object or URL
   */
  private getCatalogItemImage(item: ClothingType): any {
    // First, try to use the item's actual image from the catalog (same as order screens)
    if (item.image) {
      console.log('Using actual catalog image for:', item.label);
      return item.image; // Return the actual image object (require() result)
    }
    
    // Use the item's imageUrl if available
    if (item.imageUrl) {
      console.log('Using imageUrl for:', item.label, item.imageUrl);
      return { uri: item.imageUrl };
    }
    
    // Generate placeholder based on item category
    const categoryColors: {[key: string]: string} = {
      'formal_attire': '#2C3E50',
      'ph_traditional': '#8B4513',
      'evening_party_wear': '#9B59B6',
      'wedding_bridal': '#E91E63'
    };
    
    const color = categoryColors[item.category] || '#4A90E2';
    console.log('Using placeholder for:', item.label);
    return { uri: this.getDefaultImage(item.label, color, 200) };
  }

  /**
   * Get local image URI for catalog items
   */
  private getLocalImageUri(item: ClothingType): string {
    // Map catalog items to their actual image URLs
    const catalogImageMap: {[key: string]: string} = {
      // Formal Attire
      'suit_katrina': 'https://dummyimage.com/200x200/2C3E50/FFFFFF&text=Suit+Katrina',
      'suit_armani': 'https://dummyimage.com/200x200/34495E/FFFFFF&text=Suit+Armani',
      'suit_marty': 'https://dummyimage.com/200x200/2C3E50/FFFFFF&text=Suit+Marty',
      'suit_costume': 'https://dummyimage.com/200x200/F39C12/FFFFFF&text=Suit+Costume',
      'coat_barong': 'https://dummyimage.com/200x200/D4A5A5/FFFFFF&text=Coat+Barong',
      'pants': 'https://dummyimage.com/200x200/B8C5D6/FFFFFF&text=Pants',
      
      // Filipino Traditional
      'barong_kids': 'https://dummyimage.com/200x200/F4E4C1/FFFFFF&text=Barong+Kids',
      'barong_adults': 'https://dummyimage.com/200x200/8B4513/FFFFFF&text=Barong+Adults',
      'filipiniana_kids': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Filipiniana+Kids',
      'filipiniana_bolero': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Filipiniana+Bolero',
      'filipiniana_cocktail': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Filipiniana+Cocktail',
      'filipiniana_long_gown': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Filipiniana+Long+Gown',
      
      // Evening & Party Wear
      'evening_gown_kids': 'https://dummyimage.com/200x200/9B59B6/FFFFFF&text=Evening+Gown+Kids',
      'evening_gown_adults': 'https://dummyimage.com/200x200/9B59B6/FFFFFF&text=Evening+Gown+Adults',
      'cocktail_dress': 'https://dummyimage.com/200x200/9B59B6/FFFFFF&text=Cocktail+Dress',
      'ballgown_minimalist': 'https://dummyimage.com/200x200/9B59B6/FFFFFF&text=Ballgown+Minimalist',
      'ballgown_luxe': 'https://dummyimage.com/200x200/9B59B6/FFFFFF&text=Ballgown+Luxe',
      'ballgown_royal': 'https://dummyimage.com/200x200/9B59B6/FFFFFF&text=Ballgown+Royal',
      
      // Wedding & Bridal
      'wedding_gown': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Wedding+Gown',
      'civil_wedding': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Civil+Wedding',
      'mermaid': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Mermaid',
      'mothers_dress': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Mothers+Dress',
      'bridesmaid': 'https://dummyimage.com/200x200/E91E63/FFFFFF&text=Bridesmaid'
    };
    
    // Return the mapped image URL or a default based on category
    if (catalogImageMap[item.id]) {
      console.log('Using catalog image for:', item.label, catalogImageMap[item.id]);
      return catalogImageMap[item.id];
    }
    
    // Fallback to category-based placeholder
    const categoryColors: {[key: string]: string} = {
      'formal_attire': '#2C3E50',
      'ph_traditional': '#8B4513',
      'evening_party_wear': '#9B59B6',
      'wedding_bridal': '#E91E63'
    };
    
    const color = categoryColors[item.category] || '#2C3E50';
    const cleanText = item.label.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '+');
    const cleanColor = color.replace('#', '');
    
    const fallbackUrl = `https://dummyimage.com/200x200/${cleanColor}/FFFFFF&text=${cleanText}`;
    console.log('Using fallback image for:', item.label, fallbackUrl);
    return fallbackUrl;
  }

  /**
   * Get default image with reliable placeholder service
   */
  private getDefaultImage(text: string, color: string, size: number = 300): string {
    // Use a more reliable placeholder service
    const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '+');
    const cleanColor = color.replace('#', '');
    
    // Use only reliable services - no via.placeholder.com
    const imageUrl = `https://dummyimage.com/${size}x${size}/${cleanColor}/FFFFFF&text=${cleanText}`;
    
    console.log('Generated image URL:', imageUrl);
    
    return imageUrl;
  }

  /**
   * Get category from clothing type
   */
  private getCategoryFromClothingType(item: ClothingType): string {
    const categoryMap: {[key: string]: string} = {
      'formal_attire': 'Formal Attire',
      'ph_traditional': 'Filipino Traditional',
      'evening_party_wear': 'Evening & Party',
      'wedding_bridal': 'Wedding & Bridal'
    };
    
    return categoryMap[item.category] || 'Clothing';
  }

  /**
   * Get complementary reason for catalog item
   */
  private getComplementaryReason(item: ClothingType, frequentItem: string): string {
    if (item.category === 'ph_traditional') {
      return 'Perfect for Filipino traditional events';
    } else if (item.category === 'formal_attire') {
      return 'Professional and elegant choice';
    } else if (item.category === 'evening_party_wear') {
      return 'Great for evening events and parties';
    } else if (item.category === 'wedding_bridal') {
      return 'Ideal for special occasions and weddings';
    }
    
    return 'Complements your style preferences';
  }

  /**
   * Get event-based items using actual catalog
   */
  private getEventBasedItems(event: string, customerProfile: any): Array<{
    name: string;
    description: string;
    imageSource?: any;
    imageUrl?: string;
    size?: string;
    category: string;
    reason: string;
  }> {
    if (!event) return [];
    
    const eventItems: Array<{
      name: string;
      description: string;
      imageUrl: string;
      size?: string;
      category: string;
      reason: string;
    }> = [];

    // Find catalog items based on event type
    const eventCatalogItems = this.findEventCatalogItems(event);
    
    eventCatalogItems.forEach(item => {
      const imageSource = this.getCatalogItemImage(item);
      eventItems.push({
        name: item.label,
        description: item.description,
        imageSource: imageSource,
        imageUrl: typeof imageSource === 'string' ? imageSource : undefined,
        category: this.getCategoryFromClothingType(item),
        reason: this.getEventBasedReason(item, event)
      });
    });

    return eventItems;
  }

  /**
   * Find catalog items based on event type
   */
  private findEventCatalogItems(event: string): ClothingType[] {
    const eventLower = event.toLowerCase();
    let matchingItems: ClothingType[] = [];

    if (eventLower.includes('wedding')) {
      // Find wedding-related items
      matchingItems = CLOTHING_TYPES.filter(item => 
        item.id.includes('wedding') || 
        item.label.toLowerCase().includes('wedding') ||
        item.label.toLowerCase().includes('bridal') ||
        item.label.toLowerCase().includes('bride') ||
        item.category === 'wedding_bridal'
      );
    } else if (eventLower.includes('graduation')) {
      // Find formal items suitable for graduation
      matchingItems = CLOTHING_TYPES.filter(item => 
        item.category === 'formal_attire' ||
        item.category === 'ph_traditional' ||
        item.label.toLowerCase().includes('formal')
      );
    } else if (eventLower.includes('party') || eventLower.includes('evening')) {
      // Find evening/party items
      matchingItems = CLOTHING_TYPES.filter(item => 
        item.category === 'evening_party_wear' ||
        item.label.toLowerCase().includes('evening') ||
        item.label.toLowerCase().includes('cocktail')
      );
    } else if (eventLower.includes('formal') || eventLower.includes('business')) {
      // Find formal business items
      matchingItems = CLOTHING_TYPES.filter(item => 
        item.category === 'formal_attire' ||
        item.label.toLowerCase().includes('suit') ||
        item.label.toLowerCase().includes('formal')
      );
    } else {
      // Find popular items as fallback
      matchingItems = CLOTHING_TYPES.filter(item => item.popular);
    }

    return matchingItems.slice(0, 3); // Limit to 3 items
  }

  /**
   * Get event-based reason for catalog item
   */
  private getEventBasedReason(item: ClothingType, event: string): string {
    const eventLower = event.toLowerCase();
    
    if (eventLower.includes('wedding')) {
      return 'Perfect for wedding celebrations';
    } else if (eventLower.includes('graduation')) {
      return 'Ideal for graduation ceremonies';
    } else if (eventLower.includes('party') || eventLower.includes('evening')) {
      return 'Great for evening events and parties';
    } else if (eventLower.includes('formal') || eventLower.includes('business')) {
      return 'Professional and elegant for formal events';
    }
    
    return 'Perfect for special occasions';
  }

  /**
   * Get image URLs for different categories and items
   */
  private getCategoryImage(category: string): string {
    if (!category) return this.getDefaultImage('Clothing Collection', '#4A90E2');
    
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('barong')) {
      return this.getDefaultImage('Barong Collection', '#8B4513');
    } else if (categoryLower.includes('filipiniana')) {
      return this.getDefaultImage('Filipiniana Collection', '#E91E63');
    } else if (categoryLower.includes('suit')) {
      return this.getDefaultImage('Suit Collection', '#2C3E50');
    } else if (categoryLower.includes('dress')) {
      return this.getDefaultImage('Dress Collection', '#9B59B6');
    } else if (categoryLower.includes('formal')) {
      return this.getDefaultImage('Formal Collection', '#34495E');
    }
    
    return this.getDefaultImage('Clothing Collection', '#4A90E2');
  }

  private getBodyTypeImage(bodyType: string): string {
    if (!bodyType) return this.getDefaultImage('Body Type', '#95A5A6');
    
    const bodyTypeLower = bodyType.toLowerCase();
    
    if (bodyTypeLower.includes('hourglass')) {
      return this.getDefaultImage('Hourglass Shape', '#F39C12');
    } else if (bodyTypeLower.includes('pear')) {
      return this.getDefaultImage('Pear Shape', '#27AE60');
    } else if (bodyTypeLower.includes('apple')) {
      return this.getDefaultImage('Apple Shape', '#E74C3C');
    } else if (bodyTypeLower.includes('rectangle')) {
      return this.getDefaultImage('Rectangle Shape', '#3498DB');
    }
    
    return this.getDefaultImage('Body Type', '#95A5A6');
  }

  private getItemImage(item: string): string {
    if (!item) return this.getDefaultImage('Clothing Item', '#4A90E2', 200);
    
    const itemLower = item.toLowerCase();
    
    if (itemLower.includes('barong')) {
      return this.getDefaultImage('Barong Item', '#8B4513', 200);
    } else if (itemLower.includes('filipiniana')) {
      return this.getDefaultImage('Filipiniana Item', '#E91E63', 200);
    } else if (itemLower.includes('suit')) {
      return this.getDefaultImage('Suit Item', '#2C3E50', 200);
    } else if (itemLower.includes('dress')) {
      return this.getDefaultImage('Dress Item', '#9B59B6', 200);
    }
    
    return this.getDefaultImage('Clothing Item', '#4A90E2', 200);
  }

  private getEventImage(event: string): string {
    if (!event) return this.getDefaultImage('Event Collection', '#4A90E2');
    
    const eventLower = event.toLowerCase();
    
    if (eventLower.includes('wedding')) {
      return this.getDefaultImage('Wedding Collection', '#F39C12');
    } else if (eventLower.includes('graduation')) {
      return this.getDefaultImage('Graduation Collection', '#27AE60');
    } else if (eventLower.includes('formal')) {
      return this.getDefaultImage('Formal Event', '#2C3E50');
    }
    
    return this.getDefaultImage('Event Collection', '#4A90E2');
  }

  private getItemCategory(item: string): string {
    if (!item) return 'Clothing';
    
    const itemLower = item.toLowerCase();
    
    if (itemLower.includes('barong')) return 'Barong';
    if (itemLower.includes('filipiniana')) return 'Filipiniana';
    if (itemLower.includes('suit')) return 'Suit';
    if (itemLower.includes('dress')) return 'Dress';
    if (itemLower.includes('formal')) return 'Formal';
    
    return 'Clothing';
  }

  /**
   * Generate comprehensive rule-based recommendations for all categories
   */
  private generateRuleBasedRecommendations(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const rentals = this.orders.filter(order => order.type === 'rental' || order.order_type === 'rental');
    const purchases = this.orders.filter(order => order.type === 'purchase' || order.order_type === 'purchase');
    
    // Get customer profile data
    const customerAge = this.profile?.age || 0;
    const customerGender = this.profile?.gender?.toLowerCase() || 'unknown';
    const customerLocation = this.profile?.location || 'unknown';

    // Rule 1: Category-specific rental patterns (3+ times)
    const categoryRules = this.generateCategoryBasedRules(rentals, customerGender, customerAge);
    recommendations.push(...categoryRules);

    // Rule 2: Gender-specific recommendations
    const genderRules = this.generateGenderBasedRules(rentals, customerGender, customerAge);
    recommendations.push(...genderRules);

    // Rule 3: Age-specific recommendations
    const ageRules = this.generateAgeBasedRules(rentals, customerAge, customerGender);
    recommendations.push(...ageRules);

    // Rule 4: Formal wear patterns (5+ times)
    const formalRules = this.generateFormalWearRules(rentals, customerGender, customerAge);
    recommendations.push(...formalRules);

    // Rule 5: Measurement-based rules
    const measurementRules = this.generateMeasurementBasedRules(insights);
    recommendations.push(...measurementRules);

    // Rule 6: Size consistency rules
    const sizeRules = this.generateSizeConsistencyRules(rentals);
    recommendations.push(...sizeRules);

    // Rule 7: Event-based rules
    const eventRules = this.generateEventBasedRules(rentals, customerGender, customerAge);
    recommendations.push(...eventRules);

    // Rule 8: Loyalty and behavior rules
    const loyaltyRules = this.generateLoyaltyRules(insights, rentals, purchases);
    recommendations.push(...loyaltyRules);

    // Rule 9: Seasonal and timing rules
    const seasonalRules = this.generateSeasonalRules(rentals, customerAge);
    recommendations.push(...seasonalRules);

    // Rule 10: Penalty and quality rules
    const qualityRules = this.generateQualityRules(rentals);
    recommendations.push(...qualityRules);

    return recommendations;
  }

  /**
   * Generate category-based rules for all clothing types
   */
  private generateCategoryBasedRules(rentals: HistoryItem[], gender: string, age: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Analyze each clothing category
    const categoryCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      categoryCounts[rental.clothing_type] = (categoryCounts[rental.clothing_type] || 0) + 1;
    });

    // Rule for each category with 3+ rentals
    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count >= 3) {
        const categoryInfo = this.getCategoryInfo(category, gender, age);
        recommendations.push({
          id: `category-${category.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'style',
          title: `${categoryInfo.title}`,
          description: `You've rented ${category} ${count} times! ${categoryInfo.description}`,
          priority: 'high',
          actionable: true,
          category: 'Category-Based',
          confidence: 95,
          relatedData: { 
            category,
            count,
            suggestedItems: categoryInfo.suggestedItems,
            gender,
            age
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate gender-specific recommendations
   */
  private generateGenderBasedRules(rentals: HistoryItem[], gender: string, age: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (gender === 'male' || gender === 'm') {
      // Male-specific rules
      const maleFormalRentals = rentals.filter(rental => 
        rental.clothing_type.toLowerCase().includes('barong') ||
        rental.clothing_type.toLowerCase().includes('suit') ||
        rental.clothing_type.toLowerCase().includes('formal')
      );
      
      if (maleFormalRentals.length >= 2) {
        recommendations.push({
          id: 'gender-male-formal',
          type: 'style',
          title: 'Gentleman\'s Formal Collection',
          description: `As a gentleman who appreciates formal wear, explore our premium men's formal collection with exclusive Barong designs and tailored suits.`,
          priority: 'medium',
          actionable: true,
          category: 'Gender-Based',
          confidence: 85,
          relatedData: { 
            gender,
            formalCount: maleFormalRentals.length,
            suggestedItems: ['Premium Barong Collection', 'Tailored Suits', 'Formal Accessories', 'Designer Formal Wear']
          }
        });
      }
    } else if (gender === 'female' || gender === 'f') {
      // Female-specific rules
      const femaleFormalRentals = rentals.filter(rental => 
        rental.clothing_type.toLowerCase().includes('filipiniana') ||
        rental.clothing_type.toLowerCase().includes('dress') ||
        rental.clothing_type.toLowerCase().includes('formal')
      );
      
      if (femaleFormalRentals.length >= 2) {
        recommendations.push({
          id: 'gender-female-formal',
          type: 'style',
          title: 'Elegant Filipiniana Collection',
          description: `As a lady who loves elegant formal wear, discover our exquisite Filipiniana collection with modern and traditional designs.`,
          priority: 'medium',
          actionable: true,
          category: 'Gender-Based',
          confidence: 85,
          relatedData: { 
            gender,
            formalCount: femaleFormalRentals.length,
            suggestedItems: ['Modern Filipiniana', 'Traditional Gowns', 'Formal Dresses', 'Elegant Accessories']
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate age-specific recommendations
   */
  private generateAgeBasedRules(rentals: HistoryItem[], age: number, gender: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (age >= 18 && age <= 25) {
      // Young adult recommendations
      recommendations.push({
        id: 'age-young-adult',
        type: 'style',
        title: 'Trendy Young Adult Collection',
        description: `As a young adult (${age} years old), explore our trendy collection with modern designs perfect for your age group and lifestyle.`,
        priority: 'medium',
        actionable: true,
        category: 'Age-Based',
        confidence: 80,
        relatedData: { 
          age,
          gender,
          suggestedItems: ['Modern Barong', 'Contemporary Filipiniana', 'Trendy Formal Wear', 'Youth Collection']
        }
      });
    } else if (age >= 26 && age <= 40) {
      // Professional age recommendations
      recommendations.push({
        id: 'age-professional',
        type: 'style',
        title: 'Professional Formal Collection',
        description: `As a professional (${age} years old), discover our sophisticated collection perfect for business events and professional occasions.`,
        priority: 'medium',
        actionable: true,
        category: 'Age-Based',
        confidence: 85,
        relatedData: { 
          age,
          gender,
          suggestedItems: ['Business Formal', 'Professional Barong', 'Executive Collection', 'Corporate Formal Wear']
        }
      });
    } else if (age >= 41 && age <= 60) {
      // Mature professional recommendations
      recommendations.push({
        id: 'age-mature-professional',
        type: 'style',
        title: 'Classic Mature Collection',
        description: `As an experienced professional (${age} years old), explore our classic collection with timeless designs and premium quality.`,
        priority: 'medium',
        actionable: true,
        category: 'Age-Based',
        confidence: 90,
        relatedData: { 
          age,
          gender,
          suggestedItems: ['Classic Barong', 'Traditional Formal Wear', 'Premium Collection', 'Timeless Designs']
        }
      });
    } else if (age > 60) {
      // Senior recommendations
      recommendations.push({
        id: 'age-senior',
        type: 'style',
        title: 'Distinguished Senior Collection',
        description: `As a distinguished senior (${age} years old), explore our premium collection with comfortable, elegant designs perfect for special occasions.`,
        priority: 'medium',
        actionable: true,
        category: 'Age-Based',
        confidence: 90,
        relatedData: { 
          age,
          gender,
          suggestedItems: ['Comfortable Formal Wear', 'Premium Barong', 'Elegant Traditional Wear', 'Senior Collection']
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate formal wear specific rules
   */
  private generateFormalWearRules(rentals: HistoryItem[], gender: string, age: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const formalRentals = rentals.filter(rental => 
      rental.clothing_type.toLowerCase().includes('formal') ||
      rental.clothing_type.toLowerCase().includes('suit') ||
      rental.clothing_type.toLowerCase().includes('barong') ||
      rental.clothing_type.toLowerCase().includes('filipiniana') ||
      rental.clothing_type.toLowerCase().includes('traditional')
    );
    
    if (formalRentals.length >= 5) {
      const genderTitle = gender === 'male' || gender === 'm' ? 'Gentleman' : 
                        gender === 'female' || gender === 'f' ? 'Lady' : 'Customer';
      
      recommendations.push({
        id: 'formal-expert',
        type: 'style',
        title: `${genderTitle} Formal Wear Expert`,
        description: `You've rented formal wear ${formalRentals.length} times! You're clearly a formal wear expert. Check out our premium formal collection with exclusive designs.`,
        priority: 'high',
        actionable: true,
        category: 'Formal Wear Expert',
        confidence: 90,
        relatedData: { 
          formalCount: formalRentals.length,
          gender,
          age,
          suggestedItems: ['Premium Formal Collection', 'Designer Formal Wear', 'Exclusive Formal Sets', 'Luxury Collection']
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate measurement-based rules
   */
  private generateMeasurementBasedRules(insights: CustomerInsights): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Rule: No measurements
    if (this.measurements.length === 0) {
      recommendations.push({
        id: 'measurement-none',
        type: 'size',
        title: 'Get Your Perfect Fit',
        description: 'You haven\'t taken any measurements yet. Getting measured will help us recommend the perfect size for you and improve your rental experience.',
        priority: 'high',
        actionable: true,
        category: 'Measurement-Based',
        confidence: 100,
        relatedData: { measurementCount: 0 }
      });
    }

    // Rule: Incomplete measurements
    if (this.measurements.length > 0) {
      const latestMeasurement = this.measurements[0];
      const requiredFields = ['height', 'chest', 'waist', 'hips'];
      const missingFields = requiredFields.filter(field => !latestMeasurement.measurements[field]);
      
      if (missingFields.length > 0) {
        recommendations.push({
          id: 'measurement-incomplete',
          type: 'size',
          title: 'Complete Your Measurements',
          description: `Your measurements are incomplete. Please complete your ${missingFields.join(', ')} measurements for better size recommendations.`,
          priority: 'high',
          actionable: true,
          category: 'Measurement-Based',
          confidence: 95,
          relatedData: { missingFields, measurementCount: this.measurements.length }
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate size consistency rules
   */
  private generateSizeConsistencyRules(rentals: HistoryItem[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const sizeCounts: {[key: string]: number} = {};
    rentals.forEach(rental => {
      if (rental.size) {
        sizeCounts[rental.size] = (sizeCounts[rental.size] || 0) + 1;
      }
    });
    
    const mostCommonSize = Object.entries(sizeCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonSize && mostCommonSize[1] >= 3) {
      recommendations.push({
        id: 'size-consistency',
        type: 'style',
        title: `Your Perfect Size: ${mostCommonSize[0]}`,
        description: `You've rented ${mostCommonSize[1]} items in size ${mostCommonSize[0]}. We have new arrivals in your preferred size across all categories.`,
        priority: 'medium',
        actionable: true,
        category: 'Size-Based',
        confidence: 85,
        relatedData: { 
          preferredSize: mostCommonSize[0],
          sizeCount: mostCommonSize[1]
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate event-based rules
   */
  private generateEventBasedRules(rentals: HistoryItem[], gender: string, age: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Wedding rentals
    const weddingRentals = rentals.filter(rental => 
      rental.notes && (
        rental.notes.toLowerCase().includes('wedding') ||
        rental.notes.toLowerCase().includes('kasalan') ||
        rental.notes.toLowerCase().includes('ceremony')
      )
    );
    
    if (weddingRentals.length >= 2) {
      const genderTitle = gender === 'male' || gender === 'm' ? 'Gentleman' : 
                        gender === 'female' || gender === 'f' ? 'Lady' : 'Customer';
      
      recommendations.push({
        id: 'event-wedding',
        type: 'style',
        title: `${genderTitle} Wedding Season Regular`,
        description: `You've rented ${weddingRentals.length} times for weddings! Check out our exclusive wedding collection with special occasion formal wear.`,
        priority: 'medium',
        actionable: true,
        category: 'Event-Based',
        confidence: 80,
        relatedData: { 
          weddingCount: weddingRentals.length,
          gender,
          age,
          suggestedItems: ['Wedding Barong Collection', 'Bridal Party Sets', 'Special Occasion Formal Wear', 'Wedding Accessories']
        }
      });
    }

    // Graduation rentals
    const graduationRentals = rentals.filter(rental => 
      rental.notes && (
        rental.notes.toLowerCase().includes('graduation') ||
        rental.notes.toLowerCase().includes('commencement')
      )
    );
    
    if (graduationRentals.length >= 1) {
      recommendations.push({
        id: 'event-graduation',
        type: 'style',
        title: 'Graduation Celebration Collection',
        description: `You've rented for graduation events! Explore our graduation collection perfect for academic celebrations.`,
        priority: 'low',
        actionable: true,
        category: 'Event-Based',
        confidence: 75,
        relatedData: { 
          graduationCount: graduationRentals.length,
          gender,
          age,
          suggestedItems: ['Graduation Barong', 'Academic Formal Wear', 'Celebration Collection']
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate loyalty and behavior rules
   */
  private generateLoyaltyRules(insights: CustomerInsights, rentals: HistoryItem[], purchases: HistoryItem[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // High loyalty score
    if (insights.behavioralPatterns.loyaltyScore >= 80) {
      recommendations.push({
        id: 'loyalty-high',
        type: 'budget',
        title: 'Loyalty Rewards Unlocked',
        description: `Your loyalty score is ${Math.round(insights.behavioralPatterns.loyaltyScore)}%! You're eligible for exclusive discounts, early access to new collections, and priority booking.`,
        priority: 'medium',
        actionable: true,
        category: 'Loyalty-Based',
        confidence: 90,
        relatedData: { 
          loyaltyScore: insights.behavioralPatterns.loyaltyScore,
          benefits: ['Exclusive Discounts', 'Early Access', 'Priority Booking', 'Special Collections']
        }
      });
    }

    // Frequent renter
    if (rentals.length >= 10) {
      recommendations.push({
        id: 'loyalty-frequent',
        type: 'budget',
        title: 'Frequent Renter Benefits',
        description: `You've rented ${rentals.length} times! As a frequent renter, you're eligible for special discounts and priority access to new items.`,
        priority: 'medium',
        actionable: true,
        category: 'Loyalty-Based',
        confidence: 85,
        relatedData: { 
          rentalCount: rentals.length,
          benefits: ['Frequent Renter Discounts', 'Priority Access', 'Special Offers']
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate seasonal and timing rules
   */
  private generateSeasonalRules(rentals: HistoryItem[], age: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRentals = rentals.filter(rental => 
      new Date(rental.date) >= thirtyDaysAgo
    );
    
    if (recentRentals.length > 0) {
      const currentMonth = new Date().getMonth();
      const season = currentMonth >= 2 && currentMonth <= 4 ? 'Spring' : 
                    currentMonth >= 5 && currentMonth <= 7 ? 'Summer' :
                    currentMonth >= 8 && currentMonth <= 10 ? 'Fall' : 'Winter';
      
      recommendations.push({
        id: 'seasonal-recent',
        type: 'seasonal',
        title: `Fresh ${season} Collection`,
        description: `You've been active recently with ${recentRentals.length} rentals! Check out our latest ${season.toLowerCase()} collection with new arrivals perfect for the current season.`,
        priority: 'medium',
        actionable: true,
        category: 'Seasonal-Based',
        confidence: 75,
        relatedData: { 
          recentRentals: recentRentals.length,
          season: season,
          age
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate quality and penalty rules
   */
  private generateQualityRules(rentals: HistoryItem[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Perfect rental record
    const penaltyFreeRentals = rentals.filter(rental => 
      !rental.penalty_status || rental.penalty_status === 'none'
    );
    
    if (penaltyFreeRentals.length >= 3 && penaltyFreeRentals.length === rentals.length) {
      recommendations.push({
        id: 'quality-perfect',
        type: 'style',
        title: 'Perfect Rental Record',
        description: `You have a perfect rental record with ${penaltyFreeRentals.length} penalty-free rentals! You're eligible for our premium collection and exclusive items.`,
        priority: 'medium',
        actionable: true,
        category: 'Quality-Based',
        confidence: 85,
        relatedData: { 
          penaltyFreeCount: penaltyFreeRentals.length,
          suggestedItems: ['Premium Collection', 'Exclusive Items', 'Designer Pieces', 'Luxury Collection']
        }
      });
    }

    return recommendations;
  }

  /**
   * Get category-specific information
   */
  private getCategoryInfo(category: string, gender: string, age: number): {
    title: string;
    description: string;
    suggestedItems: string[];
  } {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('barong')) {
      return {
        title: 'Barong Enthusiast',
        description: 'We recommend exploring related traditional wear like Coat Barong, Filipiniana, and Traditional Formal Sets.',
        suggestedItems: ['Coat Barong', 'Filipiniana', 'Traditional Formal Set', 'Classic Barong', 'Modern Barong']
      };
    } else if (categoryLower.includes('filipiniana')) {
      return {
        title: 'Filipiniana Lover',
        description: 'Discover our elegant Filipiniana collection with modern and traditional designs perfect for special occasions.',
        suggestedItems: ['Modern Filipiniana', 'Traditional Gowns', 'Elegant Dresses', 'Formal Filipiniana', 'Designer Filipiniana']
      };
    } else if (categoryLower.includes('suit')) {
      return {
        title: 'Suit Professional',
        description: 'Explore our premium suit collection with tailored designs perfect for business and formal events.',
        suggestedItems: ['Tailored Suits', 'Business Suits', 'Formal Suits', 'Designer Suits', 'Premium Suits']
      };
    } else if (categoryLower.includes('dress')) {
      return {
        title: 'Dress Fashionista',
        description: 'Check out our stunning dress collection with elegant designs perfect for any occasion.',
        suggestedItems: ['Elegant Dresses', 'Formal Dresses', 'Designer Dresses', 'Special Occasion Dresses', 'Premium Dresses']
      };
    } else if (categoryLower.includes('formal')) {
      return {
        title: 'Formal Wear Expert',
        description: 'Discover our comprehensive formal wear collection with exclusive designs for all occasions.',
        suggestedItems: ['Premium Formal Wear', 'Designer Formal Wear', 'Exclusive Formal Sets', 'Luxury Formal Collection']
      };
    } else {
      return {
        title: `${category} Enthusiast`,
        description: `We have new arrivals in ${category.toLowerCase()} that you might enjoy based on your preferences.`,
        suggestedItems: [`New ${category} Collection`, `Premium ${category}`, `Designer ${category}`, `Exclusive ${category}`]
      };
    }
  }
}
