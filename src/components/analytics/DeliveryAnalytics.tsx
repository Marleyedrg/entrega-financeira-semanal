
import React, { useMemo } from 'react';
import { Delivery } from '@/types';
import DeliveryAnalyticsTable from './DeliveryAnalyticsTable';
import {
  VolumeChart,
  AverageValueChart,
  TotalRevenueChart,
  WeeklyTrendChart,
  CorrelationChart,
  StatisticsChart,
  ValueDistributionChart
} from './DeliveryAnalyticsCharts';
import {
  processWeekdayData,
  createScatterData,
  calculateValueRanges
} from '@/utils/analytics';

interface DeliveryAnalyticsProps {
  deliveries: Delivery[];
}

const DeliveryAnalytics: React.FC<DeliveryAnalyticsProps> = ({ deliveries }) => {
  // Chart colors
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];
  
  // Process data for analytics
  const weekdayData = useMemo(() => 
    processWeekdayData(deliveries), [deliveries]
  );
  
  const scatterData = useMemo(() => 
    createScatterData(weekdayData), [weekdayData]
  );
  
  const valueRanges = useMemo(() => 
    calculateValueRanges(deliveries), [deliveries]
  );

  // Check if there's enough data for analysis
  if (deliveries.length === 0) {
    return <div className="p-4 text-center text-gray-500">Sem dados para análise.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📊 Volume de entregas por dia da semana</h2>
        <VolumeChart weekdayData={weekdayData} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">💰 Valor médio da entrega por dia da semana</h2>
        <AverageValueChart weekdayData={weekdayData} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🧮 Receita total por dia da semana</h2>
        <TotalRevenueChart weekdayData={weekdayData} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📈 Tendência semanal</h2>
        <WeeklyTrendChart weekdayData={weekdayData} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🔄 Correlação entre valor médio e quantidade de entregas</h2>
        <CorrelationChart scatterData={scatterData} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🧾 Estatísticas por dia da semana</h2>
        <DeliveryAnalyticsTable weekdayData={weekdayData} />
        <StatisticsChart weekdayData={weekdayData} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📦 Distribuição por faixas de valor de entrega</h2>
        <ValueDistributionChart valueRanges={valueRanges} colors={colors} />
      </div>
    </div>
  );
};

export default DeliveryAnalytics;
