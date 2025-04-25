
import React, { useState, useMemo } from 'react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis, ComposedChart, Cell, PieChart, Pie
} from 'recharts';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Delivery } from '@/types/Delivery';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Tipo para análises estendidas
interface ExtendedDeliveryData {
  dayOfWeek: string;
  dayOfWeekIndex: number;
  count: number;
  totalFees: number;
  averageFee: number;
  standardDeviation: number;
  variance: number;
}

interface DeliveryAnalyticsProps {
  deliveries: Delivery[];
}

// Função para calcular correlação de Pearson
const calculatePearsonCorrelation = (x: number[], y: number[]) => {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return 0;
  }
  
  const n = x.length;
  
  // Cálculo de médias
  const xMean = x.reduce((acc, val) => acc + val, 0) / n;
  const yMean = y.reduce((acc, val) => acc + val, 0) / n;
  
  // Cálculo de covariância e variâncias
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

// Função para calcular desvio padrão
const calculateStandardDeviation = (values: number[], mean: number) => {
  if (values.length <= 1) return 0;
  
  const variance = values.reduce((acc, val) => {
    return acc + Math.pow(val - mean, 2);
  }, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
};

const DeliveryAnalytics: React.FC<DeliveryAnalyticsProps> = ({ deliveries }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const weekdaySorted = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  
  const weekdayData = useMemo(() => {
    // Agrupar dados por dia da semana
    const dayGroups: { [key: string]: number[] } = {};
    const dayIndices: { [key: string]: number } = {
      'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6
    };

    // Inicializa todos os dias da semana
    weekdayNames.forEach(day => {
      dayGroups[day] = [];
    });
    
    // Agrupa todas as taxas por dia da semana
    deliveries.forEach(delivery => {
      if (delivery.date) {
        const date = new Date(delivery.date);
        const dayOfWeek = weekdayNames[date.getDay()];
        
        if (delivery.fee !== null) {
          dayGroups[dayOfWeek].push(delivery.fee);
        }
      }
    });
    
    // Calcula estatísticas para cada dia
    const result: ExtendedDeliveryData[] = weekdaySorted.map(day => {
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
    
    return result;
  }, [deliveries]);
  
  // Preparação dos dados para scatter plot
  const scatterData = useMemo(() => {
    const data = weekdayData.map(day => ({
      x: day.averageFee,
      y: day.count,
      name: day.dayOfWeek
    }));
    
    // Correlação entre valor médio e quantidade
    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const correlation = calculatePearsonCorrelation(xValues, yValues);
    
    return {
      points: data,
      correlation
    };
  }, [weekdayData]);
  
  // Classificação por faixa de valor
  const valueRanges = useMemo(() => {
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
  }, [deliveries]);
  
  // Cores para gráficos
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];
  
  // Verificar se há dados suficientes para análise
  if (deliveries.length === 0) {
    return <div className="p-4 text-center text-gray-500">Sem dados para análise.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📊 Volume de entregas por dia da semana</h2>
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">💰 Valor médio da entrega por dia da semana</h2>
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🧮 Receita total por dia da semana</h2>
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📈 Tendência semanal</h2>
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🔄 Correlação entre valor médio e quantidade de entregas</h2>
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🧾 Estatísticas por dia da semana</h2>
        <div className="mb-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia da Semana</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Valor Médio (R$)</TableHead>
                <TableHead>Desvio Padrão (R$)</TableHead>
                <TableHead>Variância (R$²)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekdayData.map((day) => (
                <TableRow key={day.dayOfWeek}>
                  <TableCell>{day.dayOfWeek}</TableCell>
                  <TableCell>{day.count}</TableCell>
                  <TableCell>{day.averageFee.toFixed(2)}</TableCell>
                  <TableCell>{day.standardDeviation.toFixed(2)}</TableCell>
                  <TableCell>{day.variance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
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
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📦 Distribuição por faixas de valor de entrega</h2>
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
      </div>
    </div>
  );
};

export default DeliveryAnalytics;
