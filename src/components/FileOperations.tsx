
import React from 'react';
import { Button } from "@/components/ui/button";
import { Import } from 'lucide-react';
import { format } from 'date-fns';
import { Delivery } from '@/types/Delivery';

interface FileOperationsProps {
  deliveries: Delivery[];
  onImport: (file: File) => void;
  onFinishWeek: () => void;
}

const FileOperations = ({ deliveries, onImport, onFinishWeek }: FileOperationsProps) => {
  const generateFileName = () => {
    const currentDate = new Date();
    const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const month = monthNames[currentDate.getMonth()];
    
    const dayOfMonth = currentDate.getDate();
    const weekNumber = Math.ceil(dayOfMonth / 7);

    const numberSeed = deliveries.reduce((acc, delivery) => {
      const value = delivery.orderNumber.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const feeValue = delivery.fee ? Math.floor(delivery.fee * 100) : 0;
      return acc + value + feeValue;
    }, 0);
    
    const fourDigitNumber = (numberSeed % 9000 + 1000).toString();
    
    return `${month}semana${weekNumber}_${fourDigitNumber}`;
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Número do Pedido', 'Taxa', 'Status'];
    const csvContent = deliveries.map(d => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      d.orderNumber,
      d.fee?.toFixed(2) || '-',
      d.isPending ? 'Taxa Pendente' : 'Taxa Registrada'
    ]);

    const csvString = [
      headers.join(','),
      ...csvContent.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${generateFileName()}.csv`;
    link.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  const handleFinishWeek = () => {
    handleExportCSV();
    onFinishWeek();
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => document.getElementById('csvInput')?.click()}
        className="flex items-center gap-2 md:w-auto w-full"
      >
        <Import className="h-4 w-4" />
        Importar CSV
      </Button>
      <input
        id="csvInput"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />
      <Button
        onClick={handleFinishWeek}
        className="bg-green-600 hover:bg-green-700 md:w-auto w-full"
      >
        Finalizar Semana
      </Button>
    </div>
  );
};

export default FileOperations;
