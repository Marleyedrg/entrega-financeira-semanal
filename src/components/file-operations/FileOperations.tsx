
import React from 'react';
import { Button } from "@/components/ui/button";
import { Import } from 'lucide-react';
import { Delivery } from '@/types';
import { deliveryService } from '@/services/DeliveryService';

interface FileOperationsProps {
  deliveries: Delivery[];
  onImport: (file: File) => void;
  onFinishWeek: () => void;
}

const FileOperations = ({ deliveries, onImport, onFinishWeek }: FileOperationsProps) => {
  const handleExportCSV = () => {
    deliveryService.exportToCSV(deliveries);
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
