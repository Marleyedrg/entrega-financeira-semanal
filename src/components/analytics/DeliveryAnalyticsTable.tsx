
import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DayAnalytics } from '@/utils/analytics';

interface DeliveryAnalyticsTableProps {
  weekdayData: DayAnalytics[];
}

const DeliveryAnalyticsTable: React.FC<DeliveryAnalyticsTableProps> = ({ weekdayData }) => {
  return (
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
  );
};

export default DeliveryAnalyticsTable;
