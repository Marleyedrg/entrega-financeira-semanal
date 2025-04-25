
import { Delivery } from '@/types';

// Type for analytics data
export interface DayAnalytics {
  dayOfWeek: string;
  dayOfWeekIndex: number;
  count: number;
  totalFees: number;
  averageFee: number;
  standardDeviation: number;
  variance: number;
}

export interface ScatterData {
  points: { x: number; y: number; name: string }[];
  correlation: number;
}

export interface ValueRange {
  name: string;
  count: number;
}

// Utility functions for analytics calculations
export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return 0;
  }
  
  const n = x.length;
  
  // Calculate means
  const xMean = x.reduce((acc, val) => acc + val, 0) / n;
  const yMean = y.reduce((acc, val) => acc + val, 0) / n;
  
  // Calculate covariance and variances
  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }
  
  if (xVariance === 0 || yVariance === 0) {
    return 0;
  }
  
  return numerator / Math.sqrt(xVariance * yVariance);
};

// Calculate standard deviation
export const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length <= 1) return 0;
  
  const variance = values.reduce((acc, val) => {
    return acc + Math.pow(val - mean, 2);
  }, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
};

// Process deliveries data for analytics
export const processWeekdayData = (deliveries: Delivery[]): DayAnalytics[] => {
  const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const weekdaySorted = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const dayIndices: { [key: string]: number } = {
    'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6
  };
  
  // Initialize day groups
  const dayGroups: { [key: string]: number[] } = {};
  weekdayNames.forEach(day => {
    dayGroups[day] = [];
  });
  
  // Group fees by weekday
  deliveries.forEach(delivery => {
    if (delivery.date) {
      const date = new Date(delivery.date);
      const dayOfWeek = weekdayNames[date.getDay()];
      
      if (delivery.fee !== null) {
        dayGroups[dayOfWeek].push(delivery.fee);
      }
    }
  });
  
  // Calculate statistics for each day
  return weekdaySorted.map(day => {
    const fees = dayGroups[day];
    const count = fees.length;
    const totalFees = fees.reduce((sum, fee) => sum + fee, 0);
    const averageFee = count > 0 ? totalFees / count : 0;
    const variance = count > 1 ? 
      fees.reduce((sum, fee) => sum + Math.pow(fee - averageFee, 2), 0) / (count - 1) : 0;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      dayOfWeek: day,
      dayOfWeekIndex: dayIndices[day],
      count,
      totalFees,
      averageFee,
      standardDeviation,
      variance
    };
  });
};

// Create scatter data with correlation
export const createScatterData = (weekdayData: DayAnalytics[]): ScatterData => {
  const data = weekdayData.map(day => ({
    x: day.averageFee,
    y: day.count,
    name: day.dayOfWeek
  }));
  
  // Calculate correlation between average value and quantity
  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const correlation = calculatePearsonCorrelation(xValues, yValues);
  
  return {
    points: data,
    correlation
  };
};

// Calculate value ranges for pie chart
export const calculateValueRanges = (deliveries: Delivery[]): ValueRange[] => {
  const ranges = [
    { name: 'Até R$5', count: 0 },
    { name: 'R$5 a R$10', count: 0 },
    { name: 'Acima de R$10', count: 0 }
  ];
  
  deliveries.forEach(delivery => {
    if (delivery.fee !== null) {
      if (delivery.fee <= 5) {
        ranges[0].count++;
      } else if (delivery.fee <= 10) {
        ranges[1].count++;
      } else {
        ranges[2].count++;
      }
    }
  });
  
  return ranges;
};
