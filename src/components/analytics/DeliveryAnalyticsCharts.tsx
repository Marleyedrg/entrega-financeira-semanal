
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ComposedChart, Cell, PieChart, Pie
} from 'recharts';
import { DayAnalytics, ScatterData, ValueRange } from '@/utils/analytics';

interface DeliveryAnalyticsChartsProps {
  weekdayData: DayAnalytics[];
  scatterData: ScatterData;
  valueRanges: ValueRange[];
  colors: string[];
}

export const VolumeChart = ({ weekdayData }: { weekdayData: DayAnalytics[] }) => (
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={weekdayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dayOfWeek" />
        <YAxis />
        <Tooltip 
          formatter={(value: number) => [`${value} entregas`, 'Quantidade']}
          labelFormatter={(label) => `${label}`}
        />
        <Legend />
        <Bar dataKey="count" name="Entregas" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const AverageValueChart = ({ weekdayData }: { weekdayData: DayAnalytics[] }) => (
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={weekdayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dayOfWeek" />
        <YAxis />
        <Tooltip 
          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor médio']}
          labelFormatter={(label) => `${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="averageFee" 
          name="Valor médio" 
          stroke="#82ca9d" 
          activeDot={{ r: 8 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const TotalRevenueChart = ({ weekdayData }: { weekdayData: DayAnalytics[] }) => (
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        layout="vertical"
        data={weekdayData} 
        margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="dayOfWeek" type="category" />
        <Tooltip 
          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
          labelFormatter={(label) => `${label}`}
        />
        <Legend />
        <Bar dataKey="totalFees" name="Receita total" fill="#ffc658" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const WeeklyTrendChart = ({ weekdayData }: { weekdayData: DayAnalytics[] }) => (
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={weekdayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dayOfWeek" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="count" name="Quantidade de entregas" fill="#8884d8" />
        <Line 
          yAxisId="right" 
          type="monotone" 
          dataKey="averageFee" 
          name="Valor médio (R$)" 
          stroke="#ff8042" 
          activeDot={{ r: 8 }} 
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

export const CorrelationChart = ({ scatterData }: { scatterData: ScatterData }) => (
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid />
        <XAxis 
          type="number" 
          dataKey="x" 
          name="Valor médio (R$)" 
          domain={['auto', 'auto']} 
          label={{ value: 'Valor médio (R$)', position: 'bottom', offset: 0 }}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          name="Quantidade" 
          label={{ value: 'Quantidade', angle: -90, position: 'left' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value: number, name: string) => {
            return name === 'x' ? [`R$ ${value.toFixed(2)}`, 'Valor médio'] : [`${value}`, 'Quantidade'];
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0) {
              return payload[0].payload.name;
            }
            return '';
          }}
        />
        <Scatter 
          name="Dias da semana" 
          data={scatterData.points} 
          fill="#8884d8" 
        />
        <text
          x="50%" 
          y="5%"
          textAnchor="middle"
          dominantBaseline="hanging"
        >
          Correlação de Pearson: {scatterData.correlation.toFixed(3)}
        </text>
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

export const StatisticsChart = ({ weekdayData }: { weekdayData: DayAnalytics[] }) => (
  <div className="h-80">
    <p className="mb-4 text-sm text-gray-600">
      Visualização de boxplot não disponível devido a limitações dos dados atuais.
    </p>
    <ResponsiveContainer width="100%" height="80%">
      <BarChart
        data={weekdayData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dayOfWeek" />
        <YAxis />
        <Tooltip
          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
        />
        <Legend />
        <Bar 
          dataKey="averageFee" 
          name="Valor médio" 
          fill="#82ca9d"
        />
        <Bar 
          dataKey="standardDeviation" 
          name="Desvio padrão" 
          fill="#ffc658"
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const ValueDistributionChart = ({ valueRanges, colors }: { valueRanges: ValueRange[], colors: string[] }) => (
  <div className="h-80 flex items-center justify-center">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={valueRanges}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={100}
          fill="#8884d8"
          dataKey="count"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {valueRanges.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`${value} entregas`, 'Quantidade']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default function DeliveryAnalyticsCharts({ 
  weekdayData, 
  scatterData, 
  valueRanges, 
  colors 
}: DeliveryAnalyticsChartsProps) {
  return null; // This component serves as an export container for the chart components
}
